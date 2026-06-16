import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function sb() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const type = body?.type as string;
    const payload = body?.payload || {};

    const supabase = sb();

    if (type === "COACH_CREATE") {
      const item = {
        prenom: String(payload.prenom || "").trim(),
        nom: String(payload.nom || "").trim(),
        email: payload.email ? String(payload.email).trim() : null,
        telephone: payload.telephone ? String(payload.telephone).trim() : null,
        bio: payload.bio ? String(payload.bio).trim() : null,
        photo_url: payload.photo_url ? String(payload.photo_url).trim() : null,
        actif: payload.actif ?? true,
        ordre: Number(payload.ordre ?? 0),
        coaching_level: Number(payload.coaching_level ?? 1),
        formation_level: Number(payload.formation_level ?? 1),
        formations: Array.isArray(payload.formations) ? payload.formations.map((x: any) => String(x)) : [],
      };
      if (!item.prenom || !item.nom) return NextResponse.json({ error: "Prénom/nom obligatoires" }, { status: 400 });

      const { data, error } = await supabase.from("coachs").insert(item).select("*").single();
      if (error) throw new Error(error.message);

      return NextResponse.json({ ok: true, item: data });
    }

    if (type === "ASSIST_CREATE") {
      const item = {
        prenom: String(payload.prenom || "").trim(),
        nom: String(payload.nom || "").trim(),
        email: payload.email ? String(payload.email).trim() : null,
        telephone: payload.telephone ? String(payload.telephone).trim() : null,
        bio: payload.bio ? String(payload.bio).trim() : null,
        photo_url: payload.photo_url ? String(payload.photo_url).trim() : null,
        actif: payload.actif ?? true,
        ordre: Number(payload.ordre ?? 0),
        coaching_level: Number(payload.coaching_level ?? 1),
        formation_level: Number(payload.formation_level ?? 1),
        formations: Array.isArray(payload.formations) ? payload.formations.map((x: any) => String(x)) : [],
      };
      if (!item.prenom || !item.nom) return NextResponse.json({ error: "Prénom/nom obligatoires" }, { status: 400 });

      const { data, error } = await supabase.from("assist_coachs").insert(item).select("*").single();
      if (error) throw new Error(error.message);

      return NextResponse.json({ ok: true, item: data });
    }

    if (type === "SET_TEAM_STAFF") {
      const saison = String(payload.saison || "").trim();
      const equipe_saison_id = String(payload.equipe_saison_id || "").trim();
      const coach_ids: string[] = Array.isArray(payload.coach_ids) ? payload.coach_ids : [];
      const assist_ids: string[] = Array.isArray(payload.assist_ids) ? payload.assist_ids : [];

      if (!saison || !equipe_saison_id) {
        return NextResponse.json({ error: "saison/equipe_saison_id manquant" }, { status: 400 });
      }

      // 1) purge existant
      const { error: dErr } = await supabase
        .from("staff_affectations")
        .delete()
        .eq("saison", saison)
        .eq("equipe_saison_id", equipe_saison_id);

      if (dErr) throw new Error(dErr.message);

      // 2) insert nouveau
      const rows: any[] = [];
      for (const id of coach_ids.filter(Boolean)) {
        rows.push({ saison, equipe_saison_id, staff_kind: "coach", coach_id: id, assist_coach_id: null });
      }
      for (const id of assist_ids.filter(Boolean)) {
        rows.push({ saison, equipe_saison_id, staff_kind: "assist", coach_id: null, assist_coach_id: id });
      }

      if (rows.length) {
        const { error: iErr } = await supabase.from("staff_affectations").insert(rows);
        if (iErr) throw new Error(iErr.message);
      }

      return NextResponse.json({ ok: true });
    }
        if (type === "STAFF_PERSON_UPDATE_LEVELS") {
      const kind = String(payload.kind || "").trim(); // "coach" | "assist"
      const id = String(payload.id || "").trim();

      const coaching_level = Number(payload.coaching_level ?? 1);
      const formation_level = Number(payload.formation_level ?? 1);

      if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
      if (kind !== "coach" && kind !== "assist") {
        return NextResponse.json({ error: "kind invalide (coach|assist)" }, { status: 400 });
      }

      const clamp = (n: number) => Math.max(1, Math.min(4, Number.isFinite(n) ? n : 1));
      const cl = clamp(coaching_level);
      const fl = clamp(formation_level);

      const table = kind === "coach" ? "coachs" : "assist_coachs";

      const { data, error } = await supabase
        .from(table)
        .update({ coaching_level: cl, formation_level: fl })
        .eq("id", id)
        .select("id,coaching_level,formation_level")
        .single();

      if (error) throw new Error(error.message);

      return NextResponse.json({ ok: true, item: data });
    }

    return NextResponse.json({ error: `Action inconnue: ${type}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erreur" }, { status: 500 });
  }
}
