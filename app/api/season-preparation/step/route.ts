import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function json(ok: boolean, extra: any = {}, status = 200) {
  return NextResponse.json({ ok, ...extra }, { status });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const saison = (body?.saison as string | undefined)?.trim() || "";
    const step_id = Number(body?.step_id);
    const done = Boolean(body?.done);
    const done_by = (body?.done_by as string | undefined)?.trim() || null;

    if (!saison) return json(false, { error: "saison manquante" }, 400);
    if (!Number.isFinite(step_id) || step_id < 1 || step_id > 8) {
      return json(false, { error: "step_id invalide (1..8)" }, 400);
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return json(false, { error: "Env Supabase manquant." }, 500);
    }

    const sb = createClient(supabaseUrl, serviceKey);

    const payload = {
      saison,
      step_id,
      done,
      done_at: done ? new Date().toISOString() : null,
      done_by: done ? done_by : null,
    };

    const { error } = await sb
      .from("def_saison_preparation_steps")
      .upsert([payload], { onConflict: "saison,step_id" });

    if (error) throw error;

    return json(true, { ...payload });
  } catch (e: any) {
    return json(false, { error: e?.message || "Erreur inconnue." }, 500);
  }
}
