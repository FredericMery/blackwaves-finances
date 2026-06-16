import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { token, answers } = body

    if (!token) {
      return NextResponse.json({ ok: false, error: 'Token requis' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    // Find recipient and mark as responded
    const { data: recipient, error: recErr } = await supabase
      .from('com_recipients')
      .select('*')
      .eq('token', token)
      .single()

    if (recErr || !recipient) {
      return NextResponse.json({ ok: false, error: 'Token invalide' }, { status: 404 })
    }

    // Create response
    const { data: response, error: respErr } = await supabase
      .from('com_survey_responses')
      .insert({
        survey_id: recipient.survey_uuid || recipient.survey_id,
        recipient_id: recipient.id
      })
      .select()
      .single()

    if (respErr) throw respErr

    // Insert answers
    const answersToInsert = Object.entries(answers).map(([questionId, value]) => {
      const answerRecord: any = {
        response_id: response.id,
        question_id: questionId  // Use UUID directly, not Number
      }

      // Store value in appropriate column based on type
      if (typeof value === 'boolean') {
        answerRecord.value_bool = value
      } else if (typeof value === 'number') {
        answerRecord.value_number = value
      } else if (Array.isArray(value)) {
        answerRecord.value_json = value
      } else {
        answerRecord.value_text = String(value)
      }

      return answerRecord
    })

    if (answersToInsert.length > 0) {
      const { error: answersErr } = await supabase
        .from('com_survey_answers')
        .insert(answersToInsert)

      if (answersErr) throw answersErr
    }

    // Update recipient status
    await supabase
      .from('com_recipients')
      .update({ 
        status: 'responded',
        responded_at: new Date().toISOString()
      })
      .eq('id', recipient.id)

    return NextResponse.json({ ok: true, response_id: response.id })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
