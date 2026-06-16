import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function json(ok: boolean, extra: any = {}, status = 200) {
  return NextResponse.json({ ok, ...extra }, { status });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const saison = url.searchParams.get("saison") || "";

    if (!saison) return json(false, { error: "Paramètre 'saison' manquant." }, 400);

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return json(
        false,
        { error: "Variables Supabase manquantes (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)." },
        500
      );
    }

    const sb = createClient(supabaseUrl, serviceKey);

    const [{ data: types, error: e1 }, { data: ages, error: e2 }, { data: equipes, error: e3 }] =
      await Promise.all([
        sb
          .from("def_equipe_types")
          .select("code,label,ordre,actif")
          .order("ordre", { ascending: true }),
        sb
          .from("def_equipe_ages")
          .select("id,saison,type_code,annee_naissance_min,annee_naissance_max")
          .eq("saison", saison),
        sb
          .from("def_equipes_saison")
          .select("id,saison,type_code,niveau,label,max_athletes,actif,ordre,created_at")
          .eq("saison", saison)
          .order("ordre", { ascending: true })
          .order("type_code", { ascending: true })
          .order("niveau", { ascending: true }),
      ]);

    if (e1) return json(false, { error: e1.message }, 500);
    if (e2) return json(false, { error: e2.message }, 500);
    if (e3) return json(false, { error: e3.message }, 500);

    return json(true, { types: types || [], ages: ages || [], equipes: equipes || [] });
  } catch (e: any) {
    return json(false, { error: e?.message || "Erreur inconnue." }, 500);
  }
}
