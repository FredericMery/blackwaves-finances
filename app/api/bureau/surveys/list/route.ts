import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function GET(req: Request) {
  try {
    const supabase = supabaseAdmin()

    // Fetch all surveys
    const { data: surveys, error } = await supabase
      .from('com_surveys')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    // For each survey, count responses manually
    const surveysWithStats = await Promise.all(
      (surveys || []).map(async (survey) => {
        // Count responses by matching either survey_uuid or survey_id
        const { count: responseCount } = await supabase
          .from('com_survey_responses')
          .select('id', { count: 'exact', head: true })
          .or(`survey_uuid.eq.${survey.id},survey_id.eq.${survey.id}`)

        return {
          ...survey,
          response_count: responseCount || 0
        }
      })
    )

    return NextResponse.json({ ok: true, surveys: surveysWithStats })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
