import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

function normalizeNullableString(v: any): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s || s.toLowerCase() === "null" || s.toLowerCase() === "undefined") return null;
  return s;
}

export async function POST(req: Request) {
  const admin = supabaseAdmin();
  const body = await req.json().catch(() => null);

  const parent_email = normalizeNullableString(body?.parent_email)?.toLowerCase();
  const athlete_id = normalizeNullableString(body?.athlete_id);
  const saison = normalizeNullableString(body?.saison);
  const cotisation_payee = Boolean(body?.cotisation_payee);

  if (!parent_email) {
    return NextResponse.json({ error: "parent_email manquant" }, { status: 400 });
  }

  // Helper: query qui supporte NULL proprement
  const baseQuery = admin
    .from("dossier_suivi")
    .select("id")
    .eq("parent_email", parent_email);

  const q1 = athlete_id === null ? baseQuery.is("athlete_id", null) : baseQuery.eq("athlete_id", athlete_id);
  const q2 = saison === null ? q1.is("saison", null) : q1.eq("saison", saison);

  const { data: existing, error: exErr } = await q2.maybeSingle();

  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });

  if (existing?.id) {
    const { data, error } = await admin
      .from("dossier_suivi")
      .update({ cotisation_payee, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, suivi: data });
  }

  const { data, error } = await admin
    .from("dossier_suivi")
    .insert({
      parent_email,
      athlete_id,
      saison,
      cotisation_payee,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, suivi: data });
}
