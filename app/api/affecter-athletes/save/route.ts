import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function sb() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const saison = String(body?.saison || "").trim();
    const assignments = Array.isArray(body?.assignments) ? body.assignments : [];

    if (!saison) return NextResponse.json({ ok: false, error: "saison manquante" }, { status: 400 });
    if (!assignments.length) return NextResponse.json({ ok: false, error: "assignments vide" }, { status: 400 });

    const supabase = sb();

    // updates unitaires (fiable et lisible)
    let updated = 0;

    for (const row of assignments) {
      const athlete_id = String(row?.athlete_id || "").trim();
      const equipe = row?.equipe === null ? null : String(row?.equipe || "").trim() || null;

      if (!athlete_id) continue;

      const { error } = await supabase
        .from("athletes")
        .update({ equipe })
        .eq("id", athlete_id)
        .eq("saison", saison);

      if (error) throw new Error(error.message);
      updated += 1;
    }

    return NextResponse.json({ ok: true, updated });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Erreur" }, { status: 500 });
  }
}
