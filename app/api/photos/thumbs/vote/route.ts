import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function sbAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const photo_id = String(body?.photo_id || "").trim();
    const voteRaw = body?.vote;
    const voter_id = String(body?.voter_id || "").trim();

    if (!photo_id || !voter_id) {
      return NextResponse.json({ ok: false, error: "photo_id or voter_id missing" }, { status: 400 });
    }

    const vote = voteRaw === "like" || voteRaw === 1 || voteRaw === "1" ? 1
      : voteRaw === "dislike" || voteRaw === -1 || voteRaw === "-1" ? -1
      : null;

    if (vote !== 1 && vote !== -1) {
      return NextResponse.json({ ok: false, error: "vote invalid (like/dislike)" }, { status: 400 });
    }

    const supabase = sbAdmin();

    // Upsert (un vote par voter_id/photo)
    const { error: upsertErr } = await supabase
      .from("photo_thumb2")
      .upsert(
        { photo_id, voter_id, vote },
        { onConflict: "photo_id,voter_id" }
      );

    if (upsertErr) {
      return NextResponse.json({ ok: false, error: upsertErr.message }, { status: 500 });
    }

    // Retourne counts actualisés
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
