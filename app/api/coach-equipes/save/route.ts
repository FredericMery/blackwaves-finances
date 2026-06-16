import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

type Action =
  | {
      type: "COACH_CREATE";
      payload: {
        prenom: string;
        nom: string;
        email?: string | null;
        telephone?: string | null;
        role_label?: string | null;
        bio?: string | null;
      };
    }
  | {
      type: "ASSISTANT_CREATE";
      payload: {
        prenom: string;
        nom: string;
        email?: string | null;
        telephone?: string | null;
        bio?: string | null;
      };
    }
  | {
      type: "SET_TEAM_STAFF";
      payload: {
        saison: string;
        equipe_id: string;
        head_coach_id: string | null;
        coach_ids: string[]; // autres coachs
        assistant_ids: string[]; // assistants "table assistants"
        athlete_ids: string[]; // assistants "athletes"
      };
    }
  | {
      type: "COMPETITION_CREATE";
      payload: {
        saison: string;
        nom: string;
        niveau?: string | null;
        date_debut?: string | null;
        date_fin?: string | null;
        lieu?: string | null;
      };
    }
  | {
      type: "SET_TEAM_COMPETITIONS";
      payload: {
        saison: string;
        equipe_id: string;
        competition_ids: string[];
      };
    }
  | { type: "UPSERT_ESSAIS_EQUIPE"; payload: any };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Action;
    const sb = supabaseAdmin();

    // ---------------------------
    // Create coach (GLOBAL)
    // ---------------------------
    if (body.type === "COACH_CREATE") {
      const p = body.payload;
      const { data, error } = await sb
        .from("coachs")
        .insert([
          {
            prenom: p.prenom,
            nom: p.nom,
            email: p.email ?? null,
            telephone: p.telephone ?? null,
            role_label: p.role_label ?? "Coach",
            bio: p.bio ?? null,
            actif: true,
            ordre: 0,
          },
        ])
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, item: data });
    }

    // ---------------------------
    // Create assistant (GLOBAL)
    // ---------------------------
    if (body.type === "ASSISTANT_CREATE") {
      const p = body.payload;
      const { data, error } = await sb
        .from("assistants")
        .insert([
          {
            prenom: p.prenom,
            nom: p.nom,
            email: p.email ?? null,
            telephone: p.telephone ?? null,
            bio: p.bio ?? null,
            actif: true,
            ordre: 0,
          },
        ])
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, item: data });
    }

    // ---------------------------
    // Replace all staff for a team (simple + robuste)
    // ---------------------------
    if (body.type === "SET_TEAM_STAFF") {
      const { saison, equipe_id, head_coach_id, coach_ids, assistant_ids, athlete_ids } = body.payload;

      if (!saison || !equipe_id) return NextResponse.json({ error: "Missing saison/equipe_id" }, { status: 400 });

      // delete current
      const del = await sb.from("equipes_staff").delete().eq("saison", saison).eq("equipe_id", equipe_id);
      if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 });

      const rows: any[] = [];

      if (head_coach_id) {
        rows.push({
          saison,
          equipe_id,
          role: "head",
          coach_id: head_coach_id,
          assistant_id: null,
          athlete_id: null,
        });
      }

      // autres coachs (sans doublon + pas le head deux fois)
      const uniqCoachs = Array.from(new Set((coach_ids ?? []).filter(Boolean)));
      for (const cid of uniqCoachs) {
        if (cid === head_coach_id) continue;
        rows.push({ saison, equipe_id, role: "coach", coach_id: cid, assistant_id: null, athlete_id: null });
      }

      const uniqAssistants = Array.from(new Set((assistant_ids ?? []).filter(Boolean)));
      for (const aid of uniqAssistants) {
        rows.push({ saison, equipe_id, role: "assist", coach_id: null, assistant_id: aid, athlete_id: null });
      }

      const uniqAthletes = Array.from(new Set((athlete_ids ?? []).filter(Boolean)));
      for (const atid of uniqAthletes) {
        rows.push({ saison, equipe_id, role: "assist", coach_id: null, assistant_id: null, athlete_id: atid });
      }

      if (rows.length) {
        const ins = await sb.from("equipes_staff").insert(rows);
        if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, inserted: rows.length });
    }

    // ---------------------------
    // Create competition (by saison)
    // ---------------------------
    if (body.type === "COMPETITION_CREATE") {
      const p = body.payload;
      const { data, error } = await sb
        .from("competitions")
        .insert([
          {
            saison: p.saison,
            nom: p.nom,
            niveau: p.niveau ?? null,
            date_debut: p.date_debut ?? null,
            date_fin: p.date_fin ?? null,
            lieu: p.lieu ?? null,
            notes: null,
            actif: true,
            ordre: 0,
          },
        ])
        .select("*")
        .single();

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, item: data });
    }

    // ---------------------------
    // Replace competitions for team
    // ---------------------------
    if (body.type === "SET_TEAM_COMPETITIONS") {
      const { saison, equipe_id, competition_ids } = body.payload;

      const del = await sb.from("equipes_competitions").delete().eq("saison", saison).eq("equipe_id", equipe_id);
      if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 });

      const uniq = Array.from(new Set((competition_ids ?? []).filter(Boolean)));
      if (uniq.length) {
        const ins = await sb.from("equipes_competitions").insert(
          uniq.map((cid) => ({ saison, equipe_id, competition_id: cid }))
        );
        if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
      }

      return NextResponse.json({ ok: true, count: uniq.length });
    }

    // ---------------------------
    // Essais (inchangé)
    // ---------------------------
    if (body.type === "UPSERT_ESSAIS_EQUIPE") {
      const row = body.payload;
      if (!row?.saison || !row?.team_key) {
        return NextResponse.json({ error: "Missing saison/team_key" }, { status: 400 });
      }

      const existing = await sb
        .from("essais_equipes")
        .select("id")
        .eq("saison", row.saison)
        .eq("team_key", row.team_key)
        .maybeSingle();

      if (existing.error) return NextResponse.json({ error: existing.error.message }, { status: 500 });

      if (existing.data?.id) {
        const up = await sb.from("essais_equipes").update(row).eq("id", existing.data.id);
        if (up.error) return NextResponse.json({ error: up.error.message }, { status: 500 });
        return NextResponse.json({ ok: true, mode: "update" });
      } else {
        const ins = await sb.from("essais_equipes").insert([row]);
        if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
        return NextResponse.json({ ok: true, mode: "insert" });
      }
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
