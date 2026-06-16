/**
 * GET /api/athlete/planning
 *
 * Returns planning events (training sessions, competitions, stages…)
 * for the authenticated athlete's team.
 * Read-only — athletes cannot modify planning.
 *
 * Query params:
 *   year  (number)  — optional, defaults to current year
 *   month (number)  — optional, defaults to current month
 */
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function normKey(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, " ").replace(/[–_-]/g, " ").trim();
}

function buildTeamVariants(rawTeam: string | null, teamDef?: { id?: string | null; label?: string | null; type_code?: string | null; niveau?: string | number | null }) {
  const variants = new Set<string>([normKey("Toutes les équipes")]);

  if (rawTeam) {
    variants.add(normKey(rawTeam));
  }

  if (teamDef?.id) variants.add(normKey(teamDef.id));
  if (teamDef?.label) variants.add(normKey(teamDef.label));
  if (teamDef?.type_code) variants.add(normKey(teamDef.type_code));
  if (teamDef?.type_code && teamDef?.niveau != null) {
    variants.add(normKey(`${teamDef.type_code} N${teamDef.niveau}`));
    variants.add(normKey(`${teamDef.type_code} ${teamDef.niveau}`));
    variants.add(normKey(`${teamDef.type_code}_N${teamDef.niveau}`));
  }

  return variants;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = Number(searchParams.get("year") || now.getFullYear());
    const month = Number(searchParams.get("month") || now.getMonth() + 1);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const admin = supabaseAdmin();

    const {
      data: { user },
      error: authError,
    } = await admin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || !["athlete", "bureau"].includes(profile.role ?? "")) {
      return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 });
    }

    // Find this athlete's team from dedicated account mapping first
    const { data: accessLink } = await admin
      .from("athlete_access_links")
      .select("athlete_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let athleteQuery = admin
      .from("athletes")
      .select("equipe, saison")
      .order("created_at", { ascending: false })
      .limit(1);

    if (accessLink?.athlete_id) {
      athleteQuery = athleteQuery.eq("id", accessLink.athlete_id);
    } else {
      // Backward compatibility with legacy athlete accounts
      athleteQuery = athleteQuery.eq("email_parent", user.email!);
    }

    const { data: athlete } = await athleteQuery.maybeSingle();

    const athleteTeamRaw = athlete?.equipe ?? null;

    let teamDef: { id?: string | null; label?: string | null; type_code?: string | null; niveau?: string | number | null } | null = null;
    if (athlete?.saison && athleteTeamRaw) {
      const { data: teams } = await admin
        .from("def_equipes_saison")
        .select("id, label, type_code, niveau")
        .eq("saison", athlete.saison);

      const rawNorm = normKey(athleteTeamRaw);
      teamDef =
        (teams ?? []).find((team) => {
          const candidates = [
            team.id,
            team.label,
            team.type_code,
            team.type_code && team.niveau != null ? `${team.type_code} N${team.niveau}` : null,
            team.type_code && team.niveau != null ? `${team.type_code} ${team.niveau}` : null,
            team.type_code && team.niveau != null ? `${team.type_code}_N${team.niveau}` : null,
          ].filter(Boolean) as string[];

          return candidates.some((candidate) => normKey(candidate) === rawNorm);
        }) ?? null;
    }

    const athleteTeam = teamDef?.label ?? athleteTeamRaw;
    const allowedTeams = buildTeamVariants(athleteTeamRaw, teamDef ?? undefined);

    // Date range: explicit from/to wins, otherwise fallback to requested month.
    const from = fromParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam)
      ? fromParam
      : `${year}-${String(month).padStart(2, "0")}-01`;
    const to = toParam && /^\d{4}-\d{2}-\d{2}$/.test(toParam)
      ? toParam
      : new Date(year, month, 0).toISOString().split("T")[0];

    // Fetch events from the same table as the general planning, then filter
    // with a normalized team matcher so raw athlete values still map correctly.
    const query = admin
      .from("events")
      .select("id, title, team, type, date, start_time, end_time, location, description")
      .gte("date", from)
      .lte("date", to)
      .order("date", { ascending: true });

    const { data: events, error: eventsError } = await query;
    if (eventsError) throw eventsError;

    const filteredEvents = (events ?? []).filter((event) => {
      if (!athleteTeam) return normKey(event.team ?? "") === normKey("Toutes les équipes");
      return allowedTeams.has(normKey(event.team ?? ""));
    });

    return NextResponse.json({ ok: true, events: filteredEvents, year, month, from, to, team: athleteTeam });
  } catch (err: any) {
    console.error("[/api/athlete/planning]", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Erreur serveur" }, { status: 500 });
  }
}
