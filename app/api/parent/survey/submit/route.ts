import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
  try {
    const { token, answers } = await req.json()

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

    const { data: survey } = await supabase
      .from("com_surveys")
      .select("*")
      .eq("communication_id", recipient.communication_id)
      .single()

    const { data: response } = await supabase
      .from("com_survey_responses")
      .insert({
        survey_id: survey!.id,
        recipient_id: recipient.id
      })
      .select()
      .single()

    for (const answer of answers) {
      await supabase.from("com_survey_answers").insert({
        response_id: response.id,
        question_id: answer.question_id,
        value_text: answer.value_text ?? null,
        value_json: answer.value_json ?? null,
        value_number: answer.value_number ?? null,
        value_bool: answer.value_bool ?? null
      })
    }

    await supabase
      .from("com_recipients")
      .update({ responded_at: new Date(), status: "responded" })
      .eq("id", recipient.id)

    return NextResponse.json({ ok: true })

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}