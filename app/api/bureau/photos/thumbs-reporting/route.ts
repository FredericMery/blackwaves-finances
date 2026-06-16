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
    const season = (searchParams.get("season") || "").trim();
    const team = (searchParams.get("team") || "").trim();
    const type = (searchParams.get("type") || "").trim();
    const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10) || 200, 500);

    const supabase = sbAdmin();

    // 1) Charge photos (filtrées)
    let q = supabase.from("photos").select("id,url,title,season,type,team,created_at,status").order("created_at", { ascending: false });

    // on conserve le comportement: si status existe -> approved, sinon on laisse
    // (si ta table photos n'a pas status, ce filtre n'explose pas côté supabase ?)
    // => on fait un "best effort": si erreur, on retry sans.
    if (season) q = q.eq("season", season);
    if (team) q = q.eq("team", team);
    if (type) q = q.eq("type", type);

    const tryApproved = await q.eq("status", "approved");
    let photos = tryApproved.data as any[] | null;
    let photosErr = tryApproved.error;

    if (photosErr) {
      const fallback = await q; // sans .eq("status","approved")
      photos = fallback.data as any[] | null;
      photosErr = fallback.error;
    }

    if (photosErr) {
      return NextResponse.json({ ok: false, error: photosErr.message }, { status: 500 });
    }

    const photoIds = (photos || []).map((p) => p.id);
    if (photoIds.length === 0) return NextResponse.json({ ok: true, rows: [] });

    // 2) Votes liés à ces photos
    const { data: votes, error: votesErr } = await supabase
      .from("photo_thumb2")
      .select("photo_id,vote")
      .in("photo_id", photoIds);

    if (votesErr) {
      return NextResponse.json({ ok: false, error: votesErr.message }, { status: 500 });
    }

    // 3) Agrégation
    const map: Record<string, { likes: number; dislikes: number }> = {};
    for (const id of photoIds) map[id] = { likes: 0, dislikes: 0 };
    for (const v of votes || []) {
      const pid = v.photo_id as string;
      if (!map[pid]) map[pid] = { likes: 0, dislikes: 0 };
      if (v.vote === 1) map[pid].likes++;
      else if (v.vote === -1) map[pid].dislikes++;
    }

    const rows = (photos || []).map((p) => {
      const c = map[p.id] || { likes: 0, dislikes: 0 };
      return {
        ...p,
        likes: c.likes,
        dislikes: c.dislikes,
        score: c.likes - c.dislikes,
      };
    });

    // 4) classement par score desc, puis likes desc
    rows.sort((a, b) => (b.score - a.score) || (b.likes - a.likes));

    return NextResponse.json({ ok: true, rows: rows.slice(0, limit) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "server error" }, { status: 500 });
  }
}
