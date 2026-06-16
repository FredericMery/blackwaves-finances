/**
 * GET /api/athlete/team
 *
 * Returns full team details (members, coaches, schedule) for the
 * authenticated athlete's current team. Athletes can only see their
 * own team — no cross-team exposure.
 */
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  try {
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

    // Determine athlete's team + season from dedicated mapping first
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

    if (!athlete?.equipe) {
      return NextResponse.json({ ok: true, team: null, members: [], coaches: [] });
    }

    const { equipe, saison } = athlete;

    // Team definition (label, type…)
    const { data: teamDef } = await admin
      .from("def_equipes_saison")
      .select("id, label, type_code, niveau, saison, max_athletes")
      .eq("label", equipe)
      .eq("saison", saison)
      .maybeSingle();

    // All athletes in the same team (only first name + last name — no private data)
    const { data: members } = await admin
      .from("athletes")
      .select("id, prenom, nom")
      .eq("equipe", equipe)
      .eq("saison", saison)
      .order("nom", { ascending: true });

    // Coaches assigned to this team
    let coaches: any[] = [];
    if (teamDef?.id) {
      const { data: staffRows } = await admin
        .from("staff_affectations")
        .select("staff_kind, coach_id, assist_coach_id")
        .eq("equipe_saison_id", teamDef.id)
        .eq("saison", saison);

      if (staffRows && staffRows.length > 0) {
        const coachIds = staffRows
          .filter((r: any) => r.coach_id)
          .map((r: any) => r.coach_id);
        const assistIds = staffRows
          .filter((r: any) => r.assist_coach_id)
          .map((r: any) => r.assist_coach_id);

        const [{ data: coachRows }, { data: assistRows }] = await Promise.all([
          coachIds.length
            ? admin.from("coachs").select("id, prenom, nom").in("id", coachIds)
            : Promise.resolve({ data: [] }),
          assistIds.length
            ? admin.from("assist_coachs").select("id, prenom, nom").in("id", assistIds)
            : Promise.resolve({ data: [] }),
        ]);

        coaches = [
          ...(coachRows ?? []).map((c: any) => ({ ...c, kind: "coach" })),
          ...(assistRows ?? []).map((c: any) => ({ ...c, kind: "assist" })),
        ];
      }
    }

    return NextResponse.json({
      ok: true,
      team: teamDef ?? { label: equipe, saison },
      members: members ?? [],
      coaches,
    });
  } catch (err: any) {
    console.error("[/api/athlete/team]", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Erreur serveur" }, { status: 500 });
  }
}
