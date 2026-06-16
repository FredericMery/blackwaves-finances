// app/api/schedule-trial/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type TrialSession = {
  date: string | null;
  start: string | null;
  end: string | null;
  gymnase: string | null;
};

function clean(value: unknown) {
  if (value === null || value === undefined) return null;
  const v = String(value).trim();
  return v.length ? v : null;
}

function normalizeSessions(slot: any): TrialSession[] {
  const fromJson = Array.isArray(slot?.trial_sessions)
    ? slot.trial_sessions
        .map((s: any) => ({
          date: clean(s?.date),
          start: clean(s?.start),
          end: clean(s?.end),
          gymnase: clean(s?.gymnase),
        }))
        .filter((s: TrialSession) => s.date || s.start || s.end || s.gymnase)
    : [];

  if (fromJson.length) {
    return fromJson;
  }

  return [
    {
      date: clean(slot?.essai1_date),
      start: clean(slot?.essai1_start),
      end: clean(slot?.essai1_end),
      gymnase: clean(slot?.essai1_gymnase),
    },
    {
      date: clean(slot?.essai2_date),
      start: clean(slot?.essai2_start),
      end: clean(slot?.essai2_end),
      gymnase: clean(slot?.essai2_gymnase),
    },
  ].filter((s) => s.date || s.start || s.end || s.gymnase);
}

function getCurrentSeason(now = new Date()): string {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 8) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

async function supportsSaisonColumn() {
  const { error } = await supabase
    .from("trial_requests")
    .select("saison")
    .limit(1);

  if (!error) return true;

  const msg = (error.message || "").toLowerCase();
  if (msg.includes("saison") && msg.includes("column")) {
    return false;
  }

  return true;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { trial_id, team_key, season } = body as {
      trial_id?: string;
      team_key?: string;
      season?: string;
    };

    if (!trial_id || !team_key) {
      return NextResponse.json(
        { error: "Paramètres 'trial_id' et 'team_key' obligatoires." },
        { status: 400 }
      );
    }

    // 1) Récupérer la demande d’essai
    const { data: trial, error: trialError } = await supabase
      .from("trial_requests")
      .select("*")
      .eq("id", trial_id)
      .single();

    if (trialError || !trial) {
      return NextResponse.json(
        {
          error:
            trialError?.message ||
            "Demande d’essai introuvable pour cet identifiant.",
        },
        { status: 404 }
      );
    }

    const hasSaisonColumn = await supportsSaisonColumn();

    const saison: string =
      typeof season === "string" && season.trim().length > 0
        ? season.trim()
        : trial.saison || getCurrentSeason();

    // 2) Récupérer les créneaux d’essai pour cette équipe
    const { data: slots, error: slotError } = await supabase
      .from("essais_equipes")
      .select("*")
      .eq("saison", saison)
      .eq("team_key", team_key)
      .order("team_order", { ascending: true });

    if (slotError) {
      return NextResponse.json(
        { error: slotError.message || "Erreur lors de la lecture des essais." },
        { status: 500 }
      );
    }

    const slot = (slots || [])[0];

    if (!slot) {
      return NextResponse.json(
        {
          error:
            "Aucun créneau d’essai trouvé pour cette équipe et cette saison.",
        },
        { status: 400 }
      );
    }

    const sessions = normalizeSessions(slot);
    const firstSession = sessions[0] || null;

    const trial_date = firstSession?.date || null;
    const trial_time =
      firstSession?.start && firstSession?.end
        ? `${firstSession.start} - ${firstSession.end}`
        : firstSession?.start || firstSession?.end || null;
    const trial_location = firstSession?.gymnase || null;

    const nextStatus: string =
      trial.status === "converted" || trial.status === "parent-created"
        ? trial.status
        : "scheduled";

    // 3) Mettre à jour la demande
    const { data: updated, error: updateError } = await supabase
      .from("trial_requests")
      .update({
        team_selected: team_key,
        ...(hasSaisonColumn ? { saison } : {}),
        trial_date,
        trial_time,
        trial_location,
        status: nextStatus,
      })
      .eq("id", trial_id)
      .select("*")
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        {
          error:
            updateError?.message ||
            "Impossible de mettre à jour la demande d’essai.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Essai planifié avec succès.",
      trial: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error:
          err?.message ||
          "Erreur serveur lors de la planification de l’essai.",
      },
      { status: 500 }
    );
  }
}