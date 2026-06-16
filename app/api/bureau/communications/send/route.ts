import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import crypto from "crypto"
import { buildEmailHtml, buildEmailText } from "../../../../../lib/emailTemplate"

export async function POST(req: Request) {
  const body = await req.json()
  const { communication_id, recipients } = body

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const resend = new Resend(process.env.RESEND_API_KEY!)

  // 1️⃣ Récupérer communication
  const { data: communication } = await supabase
    .from("com_communications")
    .select("*")
    .eq("id", communication_id)
    .single()

  if (!communication) {
    return NextResponse.json({ ok: false, error: "Communication not found" })
  }

  // 2️⃣ Récupérer les athlètes sélectionnés
  const { data: athletes } = await supabase
    .from("athletes")
    .select("id, email_parent")
    .in("id", recipients)
  const athletesList = athletes || []

  // Préparer les recipients à insérer (filtrer ceux sans email)
  const recipientsToInsert: any[] = []
  for (const athlete of athletesList) {
    if (!athlete.email_parent) continue
    recipientsToInsert.push({
      communication_id,
      athlete_id: athlete.id,
      status: "sent",
      token: crypto.randomUUID()
    })
  }

  if (recipientsToInsert.length === 0) {
    return NextResponse.json({ ok: true, inserted: 0 })
  }

  // Insert en batch et récupérer les rows insérées
  const { data: insertedRecipients, error: insertError } = await supabase
    .from("com_recipients")
    .insert(recipientsToInsert)
    .select()

  if (insertError) {
    return NextResponse.json({ ok: false, error: insertError.message }, { status: 500 })
  }

  // Envoyer les emails en se basant sur les lignes insérées
  for (const r of insertedRecipients || []) {
    const athlete = athletesList.find(a => a.id === r.athlete_id)
    if (!athlete || !athlete.email_parent) continue

    const link = `${process.env.NEXT_PUBLIC_SITE_URL}/parent/sondage?token=${r.token}`
    const trackingUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/parent/open?token=${r.token}`

    const html = buildEmailHtml({
      subject: communication.subject,
      title: communication.title,
      contentHtml: communication.content_html || communication.content || communication.message || communication.message_md,
      contentText: communication.content_text || communication.message || undefined,
      ctaUrl: link,
      ctaText: 'Accéder',
      date: new Date().toLocaleString(),
      trackingPixelUrl: trackingUrl
    })

    const text = buildEmailText({
      title: communication.title || communication.subject,
      contentHtml: communication.content_html || communication.content || communication.message || communication.message_md,
      ctaUrl: link,
      ctaText: 'Accéder',
      date: new Date().toLocaleString()
    })

    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM!,
        to: athlete.email_parent,
        subject: communication.subject,
        html,
        text
      })
    } catch (e: any) {
      // Si l'envoi échoue, on marque le recipient en erreur (ne bloque pas les autres)
      await supabase
        .from('com_recipients')
        .update({ status: 'failed' })
        .eq('id', r.id)
    }
  }

  return NextResponse.json({ ok: true })
}