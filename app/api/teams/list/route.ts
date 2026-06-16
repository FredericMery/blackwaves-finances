import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const saison = url.searchParams.get("saison"); // optionnel

    let q = supabase
      .from("equipes")
      .select("id,saison,code,label,categorie,type_equipe,actif,ordre,created_at")
      .eq("actif", true)
      .order("ordre", { ascending: true })
      .order("label", { ascending: true });

    if (saison) q = q.eq("saison", saison);

    const { data, error } = await q;
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, teams: data ?? [] });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Erreur inconnue" },
      { status: 500 }
    );
  }
}
