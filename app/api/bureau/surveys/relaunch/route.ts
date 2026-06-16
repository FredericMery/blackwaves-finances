import { NextResponse } from "next/server"
import { Resend } from "resend"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { buildEmailHtml, buildEmailText } from "@/lib/emailTemplate"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const surveyId = String(body?.survey_id || "")

    if (!surveyId) {
      return NextResponse.json({ ok: false, error: "survey_id manquant" }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    const { data: survey, error: surveyError } = await supabase
      .from("com_surveys")
      .select("id, title")
      .eq("id", surveyId)
      .maybeSingle()

    if (surveyError) throw surveyError
    if (!survey) {
      return NextResponse.json({ ok: false, error: "Sondage introuvable" }, { status: 404 })
    }

    const { data: recipients, error: recipientsError } = await supabase
      .from("com_recipients")
      .select("id, email, token, status, responded_at")
      .eq("survey_uuid", surveyId)
      .is("responded_at", null)

    if (recipientsError) throw recipientsError

    const relaunchable = (recipients || []).filter(
      (r: any) => !!r.email && !!r.token && r.status !== "responded"
    )

    if (relaunchable.length === 0) {
      return NextResponse.json({ ok: true, sent_count: 0, failed_count: 0, total_targets: 0 })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL

    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM || !siteUrl) {
      return NextResponse.json(
        { ok: false, error: "Configuration email incomplète (RESEND_API_KEY / RESEND_FROM / NEXT_PUBLIC_SITE_URL)." },
        { status: 500 }
      )
    }

    let sentCount = 0
    let failedCount = 0

    for (const r of relaunchable) {
      const surveyLink = `${siteUrl}/survey/${r.token}`
      const trackingPixelUrl = `${siteUrl}/api/parent/open?token=${r.token}`

      const html = buildEmailHtml({
        title: `Rappel - ${survey.title || "Sondage"}`,
        contentHtml: `<p>Petit rappel : votre réponse au sondage est attendue.</p><p>Merci de cliquer sur le bouton ci-dessous pour répondre.</p>`,
        ctaUrl: surveyLink,
        ctaText: "Répondre au sondage",
        trackingPixelUrl,
      })

      const text = buildEmailText({
        title: `Rappel - ${survey.title || "Sondage"}`,
        contentText: "Petit rappel : votre réponse au sondage est attendue.",
        ctaUrl: surveyLink,
        ctaText: "Répondre au sondage",
      })

      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM,
          to: r.email,
          subject: `Rappel - ${survey.title || "Sondage"}`,
          html,
          text,
        })

        await supabase
          .from("com_recipients")
          .update({ status: "sent", error_message: null })
          .eq("id", r.id)

        sentCount += 1
      } catch (err: any) {
        failedCount += 1

        await supabase
          .from("com_recipients")
          .update({ status: "error", error_message: err?.message || "Échec relance" })
          .eq("id", r.id)
      }
    }

    return NextResponse.json({
      ok: true,
      sent_count: sentCount,
      failed_count: failedCount,
      total_targets: relaunchable.length,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "Erreur serveur" }, { status: 500 })
  }
}
