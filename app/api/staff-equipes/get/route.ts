import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function sb() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const saison = (searchParams.get("saison") || "").trim();
    if (!saison) return NextResponse.json({ error: "Paramètre saison manquant" }, { status: 400 });

    const supabase = sb();

    // 1) équipes de saison
    const { data: equipes, error: e1 } = await supabase
      .from("def_equipes_saison")
      .select("id,saison,type_code,niveau,label,max_athletes,actif,ordre,created_at")
      .eq("saison", saison)
      .order("ordre", { ascending: true });

    if (e1) throw new Error(e1.message);

    // 2) compteur athlètes par équipe (on compte toutes les affectations sur la saison)
    // NB: si tu veux compter uniquement role='principal' -> ajoute .eq("role","principal")
    const { data: ae, error: e2 } = await supabase
      .from("def_athletes_equipes")
      .select("equipe_saison_id")
      .eq("saison", saison);

    if (e2) throw new Error(e2.message);

    const athleteCountByTeam: Record<string, number> = {};
    for (const row of ae || []) {
      const k = row.equipe_saison_id as string;
      athleteCountByTeam[k] = (athleteCountByTeam[k] || 0) + 1;
    }

    // 3) annuaires
    const [{ data: coachs, error: e3 }, { data: assists, error: e4 }] = await Promise.all([
      supabase
        .from("coachs")
        .select("id,prenom,nom,email,telephone,bio,photo_url,actif,ordre,coaching_level,formation_level,formations,created_at")
        .order("ordre", { ascending: true }),
      supabase
        .from("assist_coachs")
        .select("id,prenom,nom,email,telephone,bio,photo_url,actif,ordre,coaching_level,formation_level,formations,created_at")
        .order("ordre", { ascending: true }),
    ]);
    if (e3) throw new Error(e3.message);
    if (e4) throw new Error(e4.message);

    // 4) affectations
    const { data: staff, error: e5 } = await supabase
      .from("staff_affectations")
      .select("id,saison,equipe_saison_id,staff_kind,coach_id,assist_coach_id,created_at")
      .eq("saison", saison);

    if (e5) throw new Error(e5.message);

    // enrich: ajouter athlete_count directement sur les équipes
    const equipesEnriched = (equipes || []).map((t: any) => ({
      ...t,
      athlete_count: athleteCountByTeam[t.id] || 0,
    }));

    return NextResponse.json({
      saison,
      equipes: equipesEnriched,
      coachs: coachs || [],
      assistCoachs: assists || [],
      staff: staff || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur" }, { status: 500 });
  }
}
