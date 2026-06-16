import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request, { params }: any) {

  const { id } = params
  const body = await req.json()

  const { parent_email, answers } = body

  for (const answer of answers) {
    await supabase.from("communication_answers").insert({
      communication_id: id,
      question_id: answer.question_id,
      parent_email,
      answer_json: answer.value
    })
  }

  return NextResponse.json({ ok: true })
}