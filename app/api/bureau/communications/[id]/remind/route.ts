import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(req: Request, { params }: any) {

  const { id } = params

  const { data: recipients } = await supabase
    .from("communication_recipients")
    .select("*")
    .eq("communication_id", id)
    .is("responded_at", null)

  if (!recipients) {
    return NextResponse.json({ ok: false })
  }

  for (const r of recipients) {
    await resend.emails.send({
      from: "BlackWaves <no-reply@blackwaves-cheer.com>",
      to: r.parent_email,
      subject: "Relance - Merci de répondre",
      html: `
        <p>Nous vous remercions de répondre à la communication en attente.</p>
        <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/communication/${id}">
        Accéder à la communication</a></p>
      `
    })
  }

  return NextResponse.json({
    ok: true,
    reminded: recipients.length
  })
}