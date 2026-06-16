import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const surveyId = searchParams.get('id')
    
    if (!surveyId) {
      return NextResponse.json({ ok: false, error: 'Missing survey id' }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    // Get survey
    const { data: survey, error: surveyError } = await supabase
      .from('com_surveys')
      .select('*')
      .eq('id', surveyId)
      .single()

    if (surveyError || !survey) {
      console.error('Survey not found:', surveyError)
      return NextResponse.json({ ok: false, error: 'Survey not found' }, { status: 404 })
    }

    // Count recipients (use survey_uuid for recipients)
    const { count: sent } = await supabase
      .from('com_recipients')
      .select('*', { count: 'exact', head: true })
      .eq('survey_uuid', surveyId)

    // Get all responses with recipient and athlete info
    const { data: responses } = await supabase
      .from('com_survey_responses')
      .select(`
        *,
        com_recipients!inner(
          email,
          athlete_id,
          athletes!inner(prenom, nom)
        )
      `)
      .eq('survey_id', surveyId)

    const respondedCount = responses?.length || 0
    const sentCount = sent || 0
    const responseRate = sentCount > 0 ? Math.round((respondedCount / sentCount) * 100) : 0

    // Get questions
    const { data: questions } = await supabase
      .from('com_survey_questions')
      .select(`
        *,
        com_survey_options(*)
      `)
      .eq('survey_id', surveyId)
      .order('ordre', { ascending: true })

    // Get answers - handle empty responses gracefully
    let allAnswers: any[] = []
    const responseIds = responses?.map((r: any) => r.id).filter((id: any) => id) || []
    
    if (responseIds.length > 0) {
      const { data: answersData, error: answersError } = await supabase
        .from('com_survey_answers')
        .select('*')
        .in('response_id', responseIds)
      
      if (answersError) {
        console.error('Error fetching answers:', answersError)
      } else {
        allAnswers = answersData || []
      }
    }

    // Process questions stats
    const questionsStats = questions?.map((question: any) => {
      const questionAnswers = allAnswers?.filter((a: any) => a.question_id === question.id) || []
      
      let stats: any = {
        id: question.id,
        question_text: question.question_text,
        type: question.type,
        response_count: questionAnswers.length,
      }

      if (question.type === 'short_text' || question.type === 'long_text') {
        stats.responses = questionAnswers
          .filter((a: any) => a.value_text)
          .map((a: any) => a.value_text)
      }

      if (question.type === 'single_choice' || question.type === 'multiple_choice' || question.type === 'dropdown') {
        const optionCounts: any = {}
        question.com_survey_options?.forEach((opt: any) => {
          optionCounts[opt.id] = { text: opt.option_text, count: 0, percentage: 0 }
        })

        questionAnswers.forEach((a: any) => {
          try {
            const values = Array.isArray(a.value_json) ? a.value_json : (a.value_json ? [a.value_json] : [])
            values.forEach((v: any) => {
              if (optionCounts[v]) {
                optionCounts[v].count++
              }
            })
          } catch (e) {}
        })

        Object.keys(optionCounts).forEach((optId: any) => {
          optionCounts[optId].percentage = questionAnswers.length > 0 
            ? Math.round((optionCounts[optId].count / questionAnswers.length) * 100) 
            : 0
        })

        stats.options = optionCounts
      }

      if (question.type === 'rating' || question.type === 'scale') {
        const values = questionAnswers
          .filter((a: any) => a.value_number !== null)
          .map((a: any) => a.value_number)
        
        if (values.length > 0) {
          stats.average = (values.reduce((a: number, b: number) => a + b, 0) / values.length).toFixed(1)
          stats.min = Math.min(...values)
          stats.max = Math.max(...values)
          stats.values = values
        }
      }

      if (question.type === 'yes_no') {
        const yesCounts = questionAnswers.filter((a: any) => a.value_bool === true).length
        const noCounts = questionAnswers.filter((a: any) => a.value_bool === false).length
        
        stats.yes_count = yesCounts
        stats.no_count = noCounts
        stats.yes_percentage = questionAnswers.length > 0 ? Math.round((yesCounts / questionAnswers.length) * 100) : 0
        stats.no_percentage = questionAnswers.length > 0 ? Math.round((noCounts / questionAnswers.length) * 100) : 0
      }

      return stats
    }) || []

    // Get respondents
    const respondents = responses?.map((r: any) => {
      const athlete = r.com_recipients?.athletes
      const athleteName = athlete ? `${athlete.prenom} ${athlete.nom}` : 'Inconnu'
      const email = r.com_recipients?.email || 'Inconnu'
      
      return {
        name: `${athleteName} (${email})`,
        email: email,
        created_at: r.created_at
      }
    }) || []

    return NextResponse.json({
      ok: true,
      survey,
      stats: {
        sent_count: sentCount,
        response_count: respondedCount,
        response_rate: responseRate,
        pending_count: sentCount - respondedCount
      },
      questions: questionsStats,
      respondents: respondents.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    })
  } catch (e: any) {
    console.error('Reporting API error:', e)
    return NextResponse.json({ 
      ok: false, 
      error: e.message 
    }, { status: 500 })
  }
}
