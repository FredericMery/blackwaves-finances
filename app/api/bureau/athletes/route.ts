import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const season = searchParams.get("season")
    const equipe = searchParams.get("equipe")

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 🔹 Récupération des saisons distinctes
    const { data: seasons } = await supabase
      .from("athletes")
      .select("saison")
      .not("saison", "is", null)

    // 🔹 Récupération des équipes distinctes
    const { data: equipes } = await supabase
      .from("athletes")
      .select("equipe")
      .not("equipe", "is", null)

    let query = supabase
      .from("athletes")
      .select("id, prenom, nom, saison, equipe, email_parent")

    if (season) query = query.eq("saison", season)
    if (equipe) query = query.eq("equipe", equipe)

    const { data, error } = await query.order("nom")

    if (error) throw error

    return NextResponse.json({
      ok: true,
      data,
      meta: {
        seasons: [...new Set(seasons?.map(s => s.saison))],
        equipes: [...new Set(equipes?.map(e => e.equipe))]
      }
    })

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}