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
    const photo_ids: string[] = body?.photo_ids || [];

    if (!Array.isArray(photo_ids) || photo_ids.length === 0) {
      return NextResponse.json({ ok: true, counts: {} });
    }

    const supabase = sbAdmin();

    // On récupère tous les votes pour ces photos, puis on agrège côté API (simple + robuste)
    const { data, error } = await supabase
      .from("photo_thumb2")
      .select("photo_id, vote")
      .in("photo_id", photo_ids);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const counts: Record<string, { likes: number; dislikes: number }> = {};
    for (const pid of photo_ids) counts[pid] = { likes: 0, dislikes: 0 };

    for (const r of data || []) {
      const pid = r.photo_id as string;
      if (!counts[pid]) counts[pid] = { likes: 0, dislikes: 0 };
      if (r.vote === 1) counts[pid].likes++;
      else if (r.vote === -1) counts[pid].dislikes++;
    }

    return NextResponse.json({ ok: true, counts });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "server error" }, { status: 500 });
  }
}
