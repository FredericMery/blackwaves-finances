import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function sbAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const photo_id = searchParams.get("photo_id");

    if (!photo_id) {
      return NextResponse.json({ ok: false, error: "photo_id missing" }, { status: 400 });
    }

    const supabase = sbAdmin();

    const { data, error } = await supabase
      .from("photo_thumb2")
      .select("vote")
      .eq("photo_id", photo_id);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    let likes = 0;
    let dislikes = 0;
    for (const r of data || []) {
      if (r.vote === 1) likes++;
      else if (r.vote === -1) dislikes++;
    }

    return NextResponse.json({ ok: true, likes, dislikes, score: likes - dislikes });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "server error" }, { status: 500 });
  }
}
