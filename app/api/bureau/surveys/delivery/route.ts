import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function GET() {
  try {
    const supabase = supabaseAdmin()

    const { data: surveys, error: surveysError } = await supabase
      .from("com_surveys")
      .select("id, title, created_at")
      .order("created_at", { ascending: false })

    if (surveysError) throw surveysError

    const rows = await Promise.all(
      (surveys || []).map(async (survey: any) => {
        const { data: recipients, error: recipientsError } = await supabase
          .from("com_recipients")
          .select("id, email, status, opened_at, responded_at, created_at")
          .eq("survey_uuid", survey.id)

        if (recipientsError) throw recipientsError

        const recipientList = recipients || []

        const sentToCount = recipientList.length
        const mailReceivedCount = recipientList.filter(
          (r: any) => !!r.opened_at || !!r.responded_at || r.status === "opened" || r.status === "responded"
        ).length

        const nonRespondents = recipientList.filter((r: any) => !r.responded_at && r.status !== "responded")

        const { count: responseCount, error: responseError } = await supabase
          .from("com_survey_responses")
          .select("id", { count: "exact", head: true })
          .eq("survey_id", survey.id)

        if (responseError) throw responseError

        return {
          id: survey.id,
          title: survey.title,
          created_at: survey.created_at,
          sent_to_count: sentToCount,
          mail_received_count: mailReceivedCount,
          responded_count: responseCount || 0,
          non_respondents_count: nonRespondents.length,
          last_send_at: recipientList.length > 0
            ? recipientList
                .map((r: any) => r.created_at)
                .filter(Boolean)
                .sort((a: string, b: string) => (a < b ? 1 : -1))[0]
            : null,
        }
      })
    )

    return NextResponse.json({ ok: true, surveys: rows })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "Erreur serveur" }, { status: 500 })
  }
}
