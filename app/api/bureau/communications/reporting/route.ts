import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id" })
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: communication } = await supabase
      .from("com_communications")
      .select("*")
      .eq("id", id)
      .single()

    const { data: recipients } = await supabase
      .from("com_recipients")
      .select(`
        *,
        athletes (
          prenom,
          nom,
          equipe,
          categorie
        )
      `)
      .eq("communication_id", id)

    const total = recipients?.length || 0
    const sent = recipients?.filter(r => r.status === "sent").length || 0
    const opened = recipients?.filter(r => r.opened_at).length || 0
    const responded = recipients?.filter(r => r.responded_at).length || 0
    const failed = total - sent

    const openRate = total ? Math.round((opened / total) * 100) : 0
    const responseRate = total ? Math.round((responded / total) * 100) : 0

    // Analyse par équipe
    const byTeam: Record<string, number> = {}

    recipients?.forEach(r => {
      const team = r.athletes?.equipe || "Non défini"
      if (!byTeam[team]) byTeam[team] = 0
      if (r.opened_at) byTeam[team]++
    })

    return NextResponse.json({
      ok: true,
      data: {
        communication,
        stats: {
          total,
          sent,
          opened,
          responded,
          failed,
          openRate,
          responseRate
        },
        byTeam,
        recipients
      }
    })

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}