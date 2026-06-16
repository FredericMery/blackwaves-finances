import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type VoteValue = "like" | "dislike";

function getOrCreateSessionId(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)bw_session_id=([^;]+)/);
  if (m?.[1]) return { sessionId: decodeURIComponent(m[1]), isNew: false };

  const sessionId = `s_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
  return { sessionId, isNew: true };
}

const uuidRe =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const rawPhotoId = body?.photo_id as string | undefined;
    const photo_id = (rawPhotoId || "").trim();
    const vote = body?.vote as VoteValue | undefined;

    if (!uuidRe.test(photo_id)) {
      return NextResponse.json(
        { ok: false, error: `Invalid photo_id uuid: "${rawPhotoId}"` },
        { status: 400 }
      );
    }

    if (vote !== "like" && vote !== "dislike") {
      return NextResponse.json({ ok: false, error: "Missing/invalid vote" }, { status: 400 });
    }

    const { sessionId, isNew } = getOrCreateSessionId(req);

    // upsert simple car unique(photo_id, session_id) existe
    const { error } = await supabase
      .from("photo_thumbs2")
      .upsert(
        {
          photo_id,
          session_id: sessionId,
          vote,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "photo_id,session_id" }
      );

    if (error) {
      return NextResponse.json({ ok: false, error: `Supabase upsert: ${error.message}` }, { status: 500 });
    }

    // recompute counts
    const { data, error: e2 } = await supabase
      .from("photo_thumbs2")
      .select("vote")
      .eq("photo_id", photo_id);

    if (e2) return NextResponse.json({ ok: false, error: e2.message }, { status: 500 });

    const likes = (data || []).filter((d: any) => d.vote === "like").length;
    const dislikes = (data || []).filter((d: any) => d.vote === "dislike").length;

    const res = NextResponse.json({ ok: true, counts: { likes, dislikes } });

    if (isNew) {
      res.headers.append(
        "Set-Cookie",
        `bw_session_id=${encodeURIComponent(sessionId)}; Path=/; Max-Age=31536000; SameSite=Lax`
      );
    }

    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "unknown" }, { status: 500 });
  }
}
