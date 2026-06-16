/**
 * GET /api/athlete/me
 *
 * Returns the athlete profile for the currently authenticated user.
 * Requires a valid Supabase session. Only returns data belonging to
 * the authenticated user — no cross-athlete data leakage possible.
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

    // Retrieve the profile to confirm athlete role
    const { data: profile } = await admin
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .maybeSingle();

    // Bureau members can also access athlete data (e.g. impersonation for support)
    if (!profile || !["athlete", "bureau"].includes(profile.role ?? "")) {
      return NextResponse.json({ ok: false, error: "Accès refusé" }, { status: 403 });
    }

    // Preferred link: dedicated mapping table user_id <-> athlete_id
    const { data: accessLink } = await admin
      .from("athlete_access_links")
      .select("athlete_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let athleteQuery = admin
      .from("athletes")
      .select(
        "id, prenom, nom, date_naissance, saison, equipe, email_parent, telephone_parent, " +
          "autorisation_photo, autorisation_video, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(1);

    if (accessLink?.athlete_id) {
      athleteQuery = athleteQuery.eq("id", accessLink.athlete_id);
    } else {
      // Backward compatibility with legacy accounts linked by email_parent
      athleteQuery = athleteQuery.eq("email_parent", user.email!);
    }

    const { data: athleteRaw, error: athleteError } = await athleteQuery.maybeSingle();

    if (athleteError) throw athleteError;

    const athlete = athleteRaw as {
      id: string;
      prenom: string;
      nom: string;
      date_naissance?: string;
      saison?: string;
      equipe?: string;
      email_parent?: string;
      telephone_parent?: string;
      autorisation_photo?: boolean;
      autorisation_video?: boolean;
      created_at?: string;
    } | null;

    if (!athlete) {
      return NextResponse.json({ ok: false, error: "Aucun profil athlète trouvé pour ce compte." }, { status: 404 });
    }

    // Enrich with team details if the athlete is assigned to a team
    let teamDetails = null;
    if (athlete.equipe) {
      const { data: team } = await admin
        .from("def_equipes_saison")
        .select("id, label, type_code, niveau, saison")
        .eq("label", athlete.equipe)
        .eq("saison", athlete.saison)
        .maybeSingle();
      teamDetails = team ?? null;
    }

    return NextResponse.json({ ok: true, athlete, team: teamDetails });
  } catch (err: any) {
    console.error("[/api/athlete/me]", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Erreur serveur" }, { status: 500 });
  }
}
