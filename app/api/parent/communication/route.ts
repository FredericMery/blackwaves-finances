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
      .select("*")
      .eq("token", token)
      .single()

    if (!recipient) {
      return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 404 })
    }

    if (recipient.responded_at) {
      return NextResponse.json({ ok: false, error: "Already answered" }, { status: 403 })
    }

    const { data: communication } = await supabase
      .from("com_communications")
      .select("*")
      .eq("id", recipient.communication_id)
      .single()

    const { data: survey } = await supabase
      .from("com_surveys")
      .select("*")
      .eq("communication_id", communication.id)
      .single()

    let questions = []

    if (survey) {
      const { data } = await supabase
        .from("com_survey_questions")
        .select(`
          *,
          com_survey_options(*)
        `)
        .eq("survey_id", survey.id)
        .order("order_index")

      questions = data || []
    }

    return NextResponse.json({
      ok: true,
      communication,
      questions
    })

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}