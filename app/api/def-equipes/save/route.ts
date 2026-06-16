import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function json(ok: boolean, extra: any = {}, status = 200) {
  return NextResponse.json({ ok, ...extra }, { status });
}

type AgeRuleIn = {
  type_code: string;
  annee_naissance_min: number;
  annee_naissance_max: number;
};

type TeamIn = {
  id?: string | null;
  type_code: string;
  niveau: number;
  label: string;
  max_athletes: number;
  actif: boolean;
  ordre: number;
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const saison = (body?.saison as string | undefined) || "";
    const age_rules = (body?.age_rules as AgeRuleIn[] | undefined) || [];
    const equipes = (body?.equipes as TeamIn[] | undefined) || [];

    if (!saison) return json(false, { error: "Champ 'saison' manquant." }, 400);

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

    // 1) Upsert règles d’âge (unique (saison,type_code))
    if (age_rules.length > 0) {
      const rows = age_rules.map((r) => ({
        saison,
        type_code: r.type_code,
        annee_naissance_min: r.annee_naissance_min,
        annee_naissance_max: r.annee_naissance_max,
      }));

      const { error } = await sb
        .from("def_equipe_ages")
        .upsert(rows, { onConflict: "saison,type_code" });

      if (error) return json(false, { error: error.message }, 500);
    }

    // 2) Equipes saison : update celles avec id, insert celles sans id
    const toUpdate = equipes.filter((t) => !!t.id);
    const toInsert = equipes.filter((t) => !t.id);

    if (toUpdate.length > 0) {
      const rows = toUpdate.map((t) => ({
        id: t.id,
        saison,
        type_code: t.type_code,
        niveau: t.niveau,
        label: t.label,
        max_athletes: t.max_athletes,
        actif: t.actif,
        ordre: t.ordre,
      }));

      const { error } = await sb.from("def_equipes_saison").upsert(rows, { onConflict: "id" });
      if (error) return json(false, { error: error.message }, 500);
    }

    if (toInsert.length > 0) {
      const rows = toInsert.map((t) => ({
        saison,
        type_code: t.type_code,
        niveau: t.niveau,
        label: t.label,
        max_athletes: t.max_athletes,
        actif: t.actif,
        ordre: t.ordre,
      }));

      const { error } = await sb.from("def_equipes_saison").insert(rows);
      if (error) return json(false, { error: error.message }, 500);
    }

    // 3) Renvoi dataset frais
    const [{ data: ages, error: e1 }, { data: eqs, error: e2 }] = await Promise.all([
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

    return json(true, { ages: ages || [], equipes: eqs || [] });
  } catch (e: any) {
    return json(false, { error: e?.message || "Erreur inconnue." }, 500);
  }
}
