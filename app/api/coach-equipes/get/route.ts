import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const saison = searchParams.get("saison");
    if (!saison) return NextResponse.json({ error: "Missing saison" }, { status: 400 });

    const sb = supabaseAdmin();

    const [
      equipes,
      coachs,
      assistants,
      athletes,
      staff,
      competitions,
      equipesCompetitions,
      essais,
    ] = await Promise.all([
      sb.from("equipes").select("*").eq("saison", saison).order("ordre", { ascending: true }),
      sb.from("coachs").select("*").eq("actif", true).order("ordre", { ascending: true }),
      sb.from("assistants").select("*").eq("actif", true).order("ordre", { ascending: true }),
      sb.from("athletes").select("id, prenom, nom, saison").eq("saison", saison).order("prenom", { ascending: true }),
      sb.from("equipes_staff").select("*").eq("saison", saison),
      sb.from("competitions").select("*").eq("saison", saison).order("ordre", { ascending: true }),
      sb.from("equipes_competitions").select("*").eq("saison", saison),
      sb.from("essais_equipes").select("*").eq("saison", saison).order("team_order", { ascending: true }),
    ]);

    const firstError =
      equipes.error ||
      coachs.error ||
      assistants.error ||
      athletes.error ||
      staff.error ||
      competitions.error ||
      equipesCompetitions.error ||
      essais.error;

    if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

    return NextResponse.json({
      equipes: equipes.data ?? [],
      coachs: coachs.data ?? [],
      assistants: assistants.data ?? [],
      athletes: athletes.data ?? [],
      staff: staff.data ?? [],
      competitions: competitions.data ?? [],
      equipesCompetitions: equipesCompetitions.data ?? [],
      essais: essais.data ?? [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
