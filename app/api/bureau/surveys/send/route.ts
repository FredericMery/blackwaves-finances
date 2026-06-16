import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import crypto from 'crypto'
import { Resend } from 'resend'
import { buildEmailHtml, buildEmailText } from "../../../../../lib/emailTemplate"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { survey_id, recipients, sendEmails } = body

    if (!survey_id) {
      return NextResponse.json({ ok: false, error: 'survey_id invalide' }, { status: 400 })
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ ok: false, error: 'Aucun destinataire sélectionné' }, { status: 400 })
    }

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const rawSurveyId = String(survey_id)
    let resolvedSurvey: any = null

    // 1) Try direct id lookup with raw value (works if id is uuid/text)
    let lookup = await supabase
      .from('com_surveys')
      .select('id')
      .eq('id', rawSurveyId)
      .maybeSingle()

    if (lookup.data) {
      resolvedSurvey = lookup.data
    }

    // 2) Try numeric id lookup (works if id is bigint)
    if (!resolvedSurvey && /^\d+$/.test(rawSurveyId)) {
      lookup = await supabase
        .from('com_surveys')
        .select('id')
        .eq('id', Number(rawSurveyId))
        .maybeSingle()
      if (lookup.data) {
        resolvedSurvey = lookup.data
      }
    }

    // 3) Try communication_id lookup (legacy routes often pass communication UUID)
    if (!resolvedSurvey) {
      lookup = await supabase
        .from('com_surveys')
        .select('id')
        .eq('communication_id', rawSurveyId)
        .maybeSingle()
      if (lookup.data) {
        resolvedSurvey = lookup.data
      }
    }

    if (!resolvedSurvey) {
      return NextResponse.json({ ok: false, error: 'Sondage introuvable (survey_id invalide)' }, { status: 400 })
    }

    // Fetch the actual survey including numeric id if it exists
    const { data: surveyFull, error: surveyFullErr } = await supabase
      .from('com_surveys')
      .select('*')
      .eq('id', resolvedSurvey.id)
      .maybeSingle()

    if (surveyFullErr) throw surveyFullErr
    if (!surveyFull) {
      return NextResponse.json({ ok: false, error: 'Sondage introuvable après résolution' }, { status: 400 })
    }

    // Determine which ID field to use for insertion
    // Try numeric survey_id first (for bigint), fallback to uuid
    const insertSurveyId = surveyFull.survey_id || null
    const insertSurveyUuid = surveyFull.id
    
    console.log(`[Send] Survey found - numeric id: ${insertSurveyId}, uuid: ${insertSurveyUuid}`)

    // recipients: array of athlete ids
    const { data: athletesData } = await supabase.from('athletes').select('id, email_parent').in('id', recipients || [])
    const athletes = athletesData || []

    const toInsert: any[] = []
    for (const a of athletes) {
      if (!a.email_parent) continue
      const recipient: any = {
        athlete_id: a.id, 
        email: a.email_parent,
        token: crypto.randomUUID(), 
        status: 'sent' 
      }
      
      // Insert numeric survey_id if available, uuid otherwise
      if (insertSurveyId) {
        recipient.survey_id = insertSurveyId
      }
      if (insertSurveyUuid) {
        recipient.survey_uuid = insertSurveyUuid
      }
      
      toInsert.push(recipient)
    }

    if (toInsert.length === 0) return NextResponse.json({ ok: true, inserted: 0 })

    const { data: inserted, error: insertErr } = await supabase.from('com_recipients').insert(toInsert).select()
    if (insertErr) throw insertErr

    if (sendEmails) {
      const resend = new Resend(process.env.RESEND_API_KEY!)
      for (const r of inserted || []) {
        const athlete = athletes.find((a: any) => a.id === r.athlete_id)
        if (!athlete || !athlete.email_parent) continue
        const link = `${process.env.NEXT_PUBLIC_SITE_URL}/survey/${r.token}`
        const tracking = `${process.env.NEXT_PUBLIC_SITE_URL}/api/parent/open?token=${r.token}`
        const html = buildEmailHtml({ title: 'Sondage', contentHtml: '', ctaUrl: link, ctaText: 'Répondre', trackingPixelUrl: tracking })
        const text = buildEmailText({ title: 'Sondage', contentHtml: '', ctaUrl: link, ctaText: 'Répondre' })
        try {
          await resend.emails.send({ from: process.env.RESEND_FROM!, to: athlete.email_parent, subject: 'Sondage', html, text })
        } catch (e) {
          await supabase.from('com_recipients').update({ status: 'failed' }).eq('id', r.id)
        }
      }
    }

    return NextResponse.json({ ok: true, insertedCount: (inserted?.length ?? 0), inserted: inserted || [] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
