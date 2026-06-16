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

function normalizeSessions(input: unknown): TrialSession[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((raw) => {
      if (!raw || typeof raw !== "object") return null;

      const row = raw as Record<string, unknown>;
      const date = clean(row.date);
      const start = clean(row.start);
      const end = clean(row.end);
      const gymnase = clean(row.gymnase);

      if (!date && !start && !end && !gymnase) return null;

      return {
        date,
        start,
        end,
        gymnase,
      } as TrialSession;
    })
    .filter((row): row is TrialSession => row !== null);
}

function legacySessions(slot: any): TrialSession[] {
  const first: TrialSession = {
    date: clean(slot?.essai1_date),
    start: clean(slot?.essai1_start),
    end: clean(slot?.essai1_end),
    gymnase: clean(slot?.essai1_gymnase),
  };

  const second: TrialSession = {
    date: clean(slot?.essai2_date),
    start: clean(slot?.essai2_start),
    end: clean(slot?.essai2_end),
    gymnase: clean(slot?.essai2_gymnase),
  };

  return [first, second].filter((s) => s.date || s.start || s.end || s.gymnase);
}

function firstTwoLegacyColumns(sessions: TrialSession[]) {
  const s1 = sessions[0] || null;
  const s2 = sessions[1] || null;

  return {
    essai1_date: s1?.date ?? null,
    essai1_start: s1?.start ?? null,
    essai1_end: s1?.end ?? null,
    essai1_gymnase: s1?.gymnase ?? null,
    essai2_date: s2?.date ?? null,
    essai2_start: s2?.start ?? null,
    essai2_end: s2?.end ?? null,
    essai2_gymnase: s2?.gymnase ?? null,
  };
}

async function supportsTrialSessionsColumn() {
  const { error } = await supabase
    .from("essais_equipes")
    .select("trial_sessions")
    .limit(1);

  if (!error) return true;

  const msg = (error.message || "").toLowerCase();
  if (msg.includes("trial_sessions") && msg.includes("column")) {
    return false;
  }

  // In doubt, keep the modern path and let insertion report a precise error.
  return true;
}

// GET : récupérer les essais pour une saison
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const saison = searchParams.get("saison");

    if (!saison || typeof saison !== "string") {
      return NextResponse.json(
        { error: "Paramètre 'saison' manquant." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("essais_equipes")
      .select("*")
      .eq("saison", saison)
      .order("team_key", { ascending: true })
      .order("team_order", { ascending: true });

    if (error) {
      console.error("Supabase GET essais_equipes:", error);
      return NextResponse.json(
        {
          error: error.message || "Erreur lors du chargement des essais.",
          details: error.details ?? null,
          hint: error.hint ?? null,
        },
        { status: 500 }
      );
    }

    const normalized = (data ?? []).map((slot: any) => {
      const sessions = normalizeSessions(slot?.trial_sessions);
      const fallback = sessions.length ? sessions : legacySessions(slot);

      return {
        ...slot,
        trial_sessions: fallback,
      };
    });

    return NextResponse.json({ slots: normalized });
  } catch (err: any) {
    console.error("Erreur GET essais-equipes:", err);
    return NextResponse.json(
      {
        error:
          err?.message ||
          "Erreur serveur lors du chargement des essais équipes.",
      },
      { status: 500 }
    );
  }
}

// POST : enregistrer les essais pour une saison
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Corps de requête vide ou invalide." },
        { status: 400 }
      );
    }

    const { saison, slots } = body as {
      saison?: string;
      slots?: any;
    };

    console.log("POST essais-equipes – saison:", saison);
    console.log("POST essais-equipes – typeof slots:", typeof slots);
    console.log(
      "POST essais-equipes – Array.isArray(slots):",
      Array.isArray(slots)
    );

    if (!saison || typeof saison !== "string") {
      return NextResponse.json(
        { error: "Champ 'saison' manquant ou invalide." },
        { status: 400 }
      );
    }

    if (!Array.isArray(slots)) {
      return NextResponse.json(
        { error: "Format 'slots' invalide (tableau attendu)." },
        { status: 400 }
      );
    }

    const hasTrialSessionsColumn = await supportsTrialSessionsColumn();

    // on ne garde que les lignes avec au moins une info non nulle
    const rowsToInsert = (slots as any[])
      .map((s) => {
        const fromSessions = normalizeSessions(s?.trial_sessions);
        const fromLegacy = legacySessions(s);
        const sessions = fromSessions.length ? fromSessions : fromLegacy;
        const legacy = firstTwoLegacyColumns(sessions);

        return {
          saison,
          team_key: s.team_key,
          team_order: s.team_order,
          ...legacy,
          ...(hasTrialSessionsColumn ? { trial_sessions: sessions } : {}),
        };
      })
      .filter((row) => {
        if (hasTrialSessionsColumn) {
          return Array.isArray(row.trial_sessions) && row.trial_sessions.length > 0;
        }

        return !(
          row.essai1_date === null &&
          row.essai1_start === null &&
          row.essai1_end === null &&
          row.essai1_gymnase === null &&
          row.essai2_date === null &&
          row.essai2_start === null &&
          row.essai2_end === null &&
          row.essai2_gymnase === null
        );
      });

    console.log("POST essais-equipes – rowsToInsert:", rowsToInsert);

    // on efface les enregistrements de cette saison avant de ré-insérer
    const { error: deleteError } = await supabase
      .from("essais_equipes")
      .delete()
      .eq("saison", saison);

    if (deleteError) {
      console.error("Supabase DELETE essais_equipes:", deleteError);
      return NextResponse.json(
        {
          error:
            deleteError.message ||
            "Erreur lors du nettoyage des essais existants.",
          details: deleteError.details ?? null,
          hint: deleteError.hint ?? null,
        },
        { status: 500 }
      );
    }

    // s’il n’y a rien à insérer (tout vide), on s’arrête là
    if (rowsToInsert.length === 0) {
      return NextResponse.json({
        message:
          "Aucun essai à enregistrer pour cette saison (toutes les lignes sont vides).",
      });
    }

    const { error: insertError } = await supabase
      .from("essais_equipes")
      .insert(rowsToInsert);

    if (insertError) {
      console.error("Supabase INSERT essais_equipes:", insertError);
      return NextResponse.json(
        {
          error:
            insertError.message ||
            "Erreur lors de l’insertion des essais.",
          details: insertError.details ?? null,
          hint: insertError.hint ?? null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: hasTrialSessionsColumn
        ? "Les essais ont bien été enregistrés pour cette saison."
        : "Les essais ont été enregistrés en mode compatible (2 séances max par équipe). Ajoute la migration trial_sessions pour activer les séances illimitées.",
      mode: hasTrialSessionsColumn ? "trial_sessions" : "legacy",
    });
  } catch (err: any) {
    console.error("Erreur POST essais-equipes:", err);
    return NextResponse.json(
      {
        error:
          err?.message ||
          "Erreur serveur lors de l’enregistrement des essais équipes.",
      },
      { status: 500 }
    );
  }
}