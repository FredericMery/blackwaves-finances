import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function json(ok: boolean, extra: any = {}, status = 200) {
  return NextResponse.json({ ok, ...extra }, { status });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const saison = (url.searchParams.get("saison") || "").trim();
    if (!saison) return json(false, { error: "saison manquante" }, 400);

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return json(false, { error: "Env Supabase manquant." }, 500);
    }

    const sb = createClient(supabaseUrl, serviceKey);

    const { data, error } = await sb
      .from("def_saison_preparation_steps")
      .select("saison,step_id,done,done_at,done_by")
      .eq("saison", saison)
      .order("step_id", { ascending: true });

    if (error) throw error;

    return json(true, { steps: data || [] });
  } catch (e: any) {
    return json(false, { error: e?.message || "Erreur inconnue." }, 500);
  }
}
