import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const season = searchParams.get("season") || "Toutes";
    const team = searchParams.get("team") || "Toutes";
    const type = searchParams.get("type") || "Tous";
    const sort = searchParams.get("sort") || "likes"; // likes | score | newest
    const limit = Math.min(parseInt(searchParams.get("limit") || "400", 10), 800);

    let q = supabase
      .from("photos")
      .select("id,url,title,season,team,type,status,created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (season !== "Toutes") q = q.eq("season", season);
    if (team !== "Toutes") q = q.eq("team", team);
    if (type !== "Tous") q = q.eq("type", type);

    const { data: photos, error: photosErr } = await q;
    if (photosErr) return NextResponse.json({ ok: false, error: photosErr.message }, { status: 500 });

    if (!photos?.length) return NextResponse.json({ ok: true, items: [] });

    const ids = photos.map((p) => p.id);

    const { data: thumbs, error: thumbsErr } = await supabase
      .from("photo_thumbs")
      .select("photo_id,vote")
      .in("photo_id", ids);

    if (thumbsErr) return NextResponse.json({ ok: false, error: thumbsErr.message }, { status: 500 });

    const agg = new Map<string, { likes: number; dislikes: number }>();
    for (const id of ids) agg.set(id, { likes: 0, dislikes: 0 });

    for (const t of thumbs || []) {
      const cur = agg.get(t.photo_id);
      if (!cur) continue;
      if (t.vote === "like") cur.likes += 1;
      else if (t.vote === "dislike") cur.dislikes += 1;
    }

    const items = photos.map((p) => {
      const c = agg.get(p.id) || { likes: 0, dislikes: 0 };
      const score = c.likes - c.dislikes;
      return { ...p, likes: c.likes, dislikes: c.dislikes, score };
    });

    items.sort((a, b) => {
      if (sort === "newest") return String(b.created_at || "").localeCompare(String(a.created_at || ""));
      if (sort === "score") return (b.score - a.score) || (b.likes - a.likes);
      // default likes
      return (b.likes - a.likes) || (b.score - a.score);
    });

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown" }, { status: 500 });
  }
}
