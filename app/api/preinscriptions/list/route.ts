import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function json(ok: boolean, extra: any = {}, status = 200) {
  return NextResponse.json({ ok, ...extra }, { status });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const targetSeason = url.searchParams.get("targetSeason") || "";

    if (!targetSeason) return json(false, { error: "targetSeason manquant." }, 400);

    // Déduit saison source "N-1" depuis "YYYY-YYYY"
    const m = targetSeason.match(/^(\d{4})-(\d{4})$/);
    const sourceSeason = m ? `${parseInt(m[1], 10) - 1}-${parseInt(m[1], 10)}` : targetSeason;

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return json(false, { error: "Variables Supabase manquantes (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)." }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // 1) Athlètes de la saison source
    const { data: athletes, error: aErr } = await supabase
      .from("athletes")
      .select("id, prenom, nom, date_naissance, saison, equipe, email_parent, telephone_parent")
      .eq("saison", sourceSeason)
      .order("nom", { ascending: true });

    if (aErr) return json(false, { error: aErr.message }, 500);

    // 2) Equipes de la saison cible
    // (si tu as déjà une autre table d’équipes, on adaptera ici)
    const { data: teams, error: tErr } = await supabase
    .from("equipes")
    .select("code, label")
    .eq("saison", targetSeason)
    .eq("actif", true)
    .order("ordre", { ascending: true });


    // Si table equipes absente, on renvoie vide sans casser
    const safeTeams = tErr ? [] : (teams || []);

    // 3) Statuts existants
    const athleteIds = (athletes || []).map((x) => x.id);
    let propositions: any[] = [];

    if (athleteIds.length > 0) {
      const { data: props, error: pErr } = await supabase
        .from("reinscription_propositions")
        .select("athlete_id, saison_cible, equipe_future, status_parent, mail_sent_at, responded_at")
        .eq("saison_cible", targetSeason)
        .in("athlete_id", athleteIds);

      if (pErr) return json(false, { error: pErr.message }, 500);
      propositions = props || [];
    }

    return json(true, { athletes: athletes || [], teams: safeTeams, propositions });
  } catch (e: any) {
    return json(false, { error: e?.message || "Erreur inconnue." }, 500);
  }
}
