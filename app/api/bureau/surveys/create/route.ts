import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { title, questions } = body

    const supabase = supabaseAdmin()

    // create survey
    const { data: survey, error: sErr } = await supabase
      .from('com_surveys')
      .insert({ title })
      .select()
      .single()

    if (sErr) throw sErr

    const createdQuestions: any[] = []
    if (Array.isArray(questions)) {
      for (const [idx, q] of questions.entries()) {
        const { data: qd, error: qErr } = await supabase
          .from('com_survey_questions')
          .insert({ survey_id: survey.id, question_text: q.question_text || '', type: q.type || 'short_text', ordre: idx + 1 })
          .select()
          .single()
        if (qErr) throw qErr

        const cq: any = { ...qd, options: [] }
        if (q.options && Array.isArray(q.options) && q.options.length > 0) {
          const opts = q.options.map((o: any, i: number) => ({ question_id: qd.id, option_text: o.option_text || o.text || o || '', ordre: i + 1 }))
          const { data: insertedOpts, error: oErr } = await supabase.from('com_survey_options').insert(opts).select()
          if (oErr) throw oErr
          cq.options = insertedOpts || []
        }

        createdQuestions.push(cq)
      }
    }

    return NextResponse.json({ ok: true, survey: { ...survey, questions: createdQuestions } })

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
