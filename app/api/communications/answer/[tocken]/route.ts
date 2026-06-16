import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request, { params }: any) {

  const { token } = params
  const body = await req.json()

  const { answers } = body

  const { data: access } = await supabase
    .from("communication_access_tokens")
    .select("*")
    .eq("token", token)
    .single()

  if (!access || access.responded) {
    return NextResponse.json({ ok: false })
  }

  for (const questionId in answers) {
    await supabase.from("communication_answers").insert({
      communication_id: access.communication_id,
      question_id: questionId,
      parent_email: access.parent_email,
      answer_json: answers[questionId]
    })
  }

  await supabase
    .from("communication_access_tokens")
    .update({ responded: true })
    .eq("token", token)

  await supabase
    .from("communication_recipients")
    .update({ responded_at: new Date() })
    .eq("parent_email", access.parent_email)

  return NextResponse.json({ ok: true })
}