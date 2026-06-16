import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request, { params }: any) {

  const { token } = params

  const { data: access } = await supabase
    .from("communication_access_tokens")
    .select("*")
    .eq("token", token)
    .single()

  if (!access || access.responded) {
    return NextResponse.json({ ok: false })
  }

  const { data: communication } = await supabase
    .from("communications")
    .select("*")
    .eq("id", access.communication_id)
    .single()

  const { data: questions } = await supabase
    .from("communication_questions")
    .select("*")
    .eq("communication_id", access.communication_id)

  return NextResponse.json({
    ok: true,
    communication,
    questions
  })
}