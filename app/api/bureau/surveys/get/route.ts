import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 })

    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

    const { data: survey } = await supabase
      .from('com_surveys')
      .select(`*, com_survey_questions(*, com_survey_options(*))`)
      .eq('id', id)
      .single()

    if (!survey) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })

    return NextResponse.json({ ok: true, survey })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
