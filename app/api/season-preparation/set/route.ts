import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function json(ok: boolean, extra: any = {}, status = 200) {
  return NextResponse.json({ ok, ...extra }, { status });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const saison = (body?.current_saison as string | undefined)?.trim() || "";
    if (!saison) return json(false, { error: "current_saison manquant." }, 400);

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return json(false, { error: "Env Supabase manquant (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)." }, 500);
    }

    const sb = createClient(supabaseUrl, serviceKey);

    // On upsert un singleton via l'index unique (true)
    // En pratique: on met à jour la ligne existante si elle existe, sinon insert.
    const { data: existing, error: e1 } = await sb
      .from("def_saison_preparation")
      .select("id")
      .limit(1);

    if (e1) throw e1;

    if (existing && existing.length > 0) {
      const id = existing[0].id;
      const { error: e2 } = await sb
        .from("def_saison_preparation")
        .update({ current_saison: saison, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (e2) throw e2;
    } else {
      const { error: e3 } = await sb
        .from("def_saison_preparation")
        .insert([{ current_saison: saison }]);

      if (e3) throw e3;
    }

    // (optionnel) init des steps si absents
    const steps = Array.from({ length: 8 }).map((_, i) => ({
      saison,
      step_id: i + 1,
      done: false,
      done_at: null,
      done_by: null,
    }));

    await sb.from("def_saison_preparation_steps").upsert(steps, { onConflict: "saison,step_id" });

    return json(true, { current_saison: saison });
  } catch (e: any) {
    return json(false, { error: e?.message || "Erreur inconnue." }, 500);
  }
}
