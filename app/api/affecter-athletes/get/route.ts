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
    if (!saison) return NextResponse.json({ ok: false, error: "Paramètre saison manquant" }, { status: 400 });

    const supabase = sb();

    const [{ data: rules, error: e1 }, { data: athletes, error: e2 }, { data: teams, error: e3 }] =
      await Promise.all([
        supabase
          .from("def_equipe_ages")
          .select("id,saison,type_code,annee_naissance_min,annee_naissance_max,created_at")
          .eq("saison", saison)
          .order("created_at", { ascending: false }),
        supabase
          .from("athletes")
          .select("id,prenom,nom,date_naissance,saison,equipe,email_parent,telephone_parent,created_at")
          .eq("saison", saison)
          .order("nom", { ascending: true }),
        supabase
          .from("def_equipes_saison")
          .select("id,saison,type_code,niveau,label,max_athletes,actif,ordre,created_at")
          .eq("saison", saison)
          .order("ordre", { ascending: true }),
      ]);

    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);
    if (e3) throw new Error(e3.message);

    const [{ data: coachs, error: e4 }, { data: assists, error: e5 }] = await Promise.all([
      supabase.from("coachs").select("id,prenom,nom").order("ordre", { ascending: true }),
      supabase.from("assist_coachs").select("id,prenom,nom").order("ordre", { ascending: true }),
    ]);
    if (e4) throw new Error(e4.message);
    if (e5) throw new Error(e5.message);

    const { data: staff, error: e6 } = await supabase
      .from("staff_affectations")
      .select("id,saison,equipe_saison_id,staff_kind,coach_id,assist_coach_id,created_at")
      .eq("saison", saison);

    if (e6) throw new Error(e6.message);

    return NextResponse.json({
      ok: true,
      saison,
      rules: rules || [],
      athletes: athletes || [],
      teams: teams || [],
      coachs: coachs || [],
      assistCoachs: assists || [],
      staff: staff || [],
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Erreur" }, { status: 500 });
  }
}
