import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function json(ok: boolean, extra: any = {}, status = 200) {
  return NextResponse.json({ ok, ...extra }, { status });
}

function guessNextSeason() {
  const y = new Date().getFullYear();
  return `${y + 1}-${y + 2}`;
}

export async function GET() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return json(false, { error: "Env Supabase manquant (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)." }, 500);
    }

    const sb = createClient(supabaseUrl, serviceKey);

    // singleton: on prend la 1ère ligne si elle existe
    const { data, error } = await sb
      .from("def_saison_preparation")
      .select("id,current_saison,updated_at")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) throw error;

    if (!data || data.length === 0) {
      // si aucun réglage, on renvoie une saison par défaut (suivante)
      return json(true, { current_saison: guessNextSeason(), from_db: false });
    }

    return json(true, { current_saison: data[0].current_saison, from_db: true, updated_at: data[0].updated_at });
  } catch (e: any) {
    return json(false, { error: e?.message || "Erreur inconnue." }, 500);
  }
}
