import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function clean(value: unknown) {
  return String(value || "").trim();
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const eventId = clean(body?.eventId);
    const fullName = clean(body?.fullName);
    const email = clean(body?.email).toLowerCase();
    const phone = clean(body?.phone) || null;
    const city = clean(body?.city) || null;
    const notes = clean(body?.notes) || null;
    const birthYearRaw = clean(body?.birthYear);
    const birthYear = birthYearRaw ? Number(birthYearRaw) : null;

    if (!eventId || !fullName || !email) {
      return NextResponse.json(
        { ok: false, error: "eventId, nom complet et email sont obligatoires." },
        { status: 400 }
      );
    }

    if (!isEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Adresse email invalide." },
        { status: 400 }
      );
    }

    if (birthYear !== null && (!Number.isFinite(birthYear) || birthYear < 1900 || birthYear > 2100)) {
      return NextResponse.json(
        { ok: false, error: "Année de naissance invalide." },
        { status: 400 }
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

    const { error: insertError } = await admin
      .from("event_external_registrations_club")
      .insert({
        event_id: eventId,
        full_name: fullName,
        email,
        phone,
        city,
        birth_year: birthYear,
        notes,
      });

    if (insertError) {
      return NextResponse.json(
        { ok: false, error: insertError.message || "Inscription impossible." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `${fullName} est bien inscrit à ${event.title}.`,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erreur serveur inattendue." },
      { status: 500 }
    );
  }
}
