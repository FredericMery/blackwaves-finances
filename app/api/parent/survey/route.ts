import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 })
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: recipient } = await supabase
      .from("com_recipients")
      .select(`
        *,
        com_communications(*)
      `)
      .eq("token", token)
      .single()

    if (!recipient) {
      return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 404 })
    }

    const { data: survey } = await supabase
      .from("com_surveys")
      .select(`
        *,
        com_survey_questions(
          *,
          com_survey_options(*)
        )
      `)
      .eq("communication_id", recipient.communication_id)
      .single()

    return NextResponse.json({
      ok: true,
      recipient,
      survey
    })

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}