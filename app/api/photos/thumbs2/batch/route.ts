import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const photo_ids: string[] = Array.isArray(body?.photo_ids) ? body.photo_ids : [];

    if (!photo_ids.length) {
      return NextResponse.json({ ok: true, counts: {} });
    }

    const { data, error } = await supabase
      .from("photo_thumbs2")
      .select("photo_id,vote")
      .in("photo_id", photo_ids);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    const counts: Record<string, { likes: number; dislikes: number }> = {};
    for (const id of photo_ids) counts[id] = { likes: 0, dislikes: 0 };

    for (const row of data || []) {
      const pid = row.photo_id as string;
      if (!counts[pid]) counts[pid] = { likes: 0, dislikes: 0 };
      if (row.vote === "like") counts[pid].likes += 1;
      else if (row.vote === "dislike") counts[pid].dislikes += 1;
    }

    return NextResponse.json({ ok: true, counts });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown" }, { status: 500 });
  }
}
