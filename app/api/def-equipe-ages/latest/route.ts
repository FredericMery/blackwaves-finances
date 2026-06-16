import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function sb() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

function normalizeTypeCode(x: string) {
  const v = (x || "").trim().toLowerCase();
  if (v.startsWith("tiny")) return "tinys";
  if (v.startsWith("mini")) return "minimes";
  if (v.startsWith("cad")) return "cadets";
  if (v.startsWith("jun")) return "juniors";
  if (v.startsWith("sen")) return "seniors";
  return v;
}

const ALLOWED = new Set(["tinys", "minimes", "cadets", "juniors", "seniors"]);

export async function GET() {
  try {
    const supabase = sb();

    // 1) on récupère toutes les saisons existantes (distinct)
    const { data: rows, error } = await supabase.from("def_equipe_ages").select("saison");
    if (error) throw new Error(error.message);

    const seasons = Array.from(
      new Set((rows || []).map((r: any) => String(r.saison || "").trim()).filter(Boolean))
    );

    if (seasons.length === 0) {
      return NextResponse.json({ ok: true, saison: null, rules: [] });
    }

    // 2) on prend la saison "la plus récente" (tri simple sur YYYY-YYYY)
    seasons.sort((a, b) => a.localeCompare(b));
    const latestSeason = seasons[seasons.length - 1];

    // 3) on récupère les règles de cette saison
    const { data: rulesRaw, error: e2 } = await supabase
      .from("def_equipe_ages")
      .select("id,saison,type_code,annee_naissance_min,annee_naissance_max,created_at")
      .eq("saison", latestSeason)
      .order("type_code", { ascending: true });

    if (e2) throw new Error(e2.message);

    // 4) filtre catégories autorisées
    const rules = (rulesRaw || []).filter((r: any) => {
      const cat = normalizeTypeCode(String(r.type_code || ""));
      return ALLOWED.has(cat);
    });

    return NextResponse.json({ ok: true, saison: latestSeason, rules });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Erreur" }, { status: 500 });
  }
}
