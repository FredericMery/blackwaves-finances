import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseAnonServer } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function bearer(req: Request) {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const eventId = String(body?.eventId || "").trim();
    const athleteId = String(body?.athleteId || "").trim();

    if (!eventId || !athleteId) {
      return NextResponse.json(
        { ok: false, error: "eventId et athleteId sont obligatoires." },
        { status: 400 }
      );
    }

    const token = bearer(req);
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Connexion parent requise." },
        { status: 401 }
      );
    }

    const anon = supabaseAnonServer();
    const { data: userData, error: userError } = await anon.auth.getUser(token);
    const parentEmail = userData?.user?.email?.toLowerCase().trim();

    if (userError || !parentEmail) {
      return NextResponse.json(
        { ok: false, error: "Session invalide." },
        { status: 401 }
      );
    }

    const admin = supabaseAdmin();

    const { data: event, error: eventError } = await admin
      .from("events_club")
      .select("id, title, registrations_open, is_active")
      .eq("id", eventId)
      .maybeSingle();

    if (eventError || !event) {
      return NextResponse.json(
        { ok: false, error: "Événement introuvable." },
        { status: 404 }
      );
    }

    if (!event.is_active || !event.registrations_open) {
      return NextResponse.json(
        { ok: false, error: "Les inscriptions sont fermées pour cet événement." },
        { status: 409 }
      );
    }

    const { data: athlete, error: athleteError } = await admin
      .from("athletes")
      .select("id, prenom, nom, equipe, saison, email_parent")
      .eq("id", athleteId)
      .maybeSingle();

    if (athleteError || !athlete) {
      return NextResponse.json(
        { ok: false, error: "Athlète introuvable." },
        { status: 404 }
      );
    }

    const athleteParentEmail = String(athlete.email_parent || "").trim().toLowerCase();
    if (!athleteParentEmail || athleteParentEmail !== parentEmail) {
      return NextResponse.json(
        { ok: false, error: "Vous ne pouvez inscrire que vos propres enfants." },
        { status: 403 }
      );
    }

    const fullName = `${athlete.prenom || ""} ${athlete.nom || ""}`.trim();
    const email = String(athlete.email_parent || "").trim();

    const { data: existing } = await admin
      .from("event_registrations_club")
      .select("id")
      .eq("event_id", eventId)
      .eq("athlete_id", athleteId)
      .maybeSingle();

    if (existing?.id) {
      return NextResponse.json(
        { ok: false, error: "Cet athlète est déjà inscrit à cet événement." },
        { status: 409 }
      );
    }

    const { error: insertError } = await admin.from("event_registrations_club").insert({
      event_id: eventId,
      athlete_id: athleteId,
      athlete_name: fullName,
      athlete_team: athlete.equipe || null,
      athlete_season: athlete.saison || null,
      registration_source: "club",
      full_name: fullName || null,
      email: email || null,
    });

    if (insertError) {
      return NextResponse.json(
        { ok: false, error: insertError.message || "Inscription impossible." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `${fullName || "L'athlète"} est inscrit à ${event.title}.`,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erreur serveur inattendue." },
      { status: 500 }
    );
  }
}
