import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const photo_id = (searchParams.get("photo_id") || "").trim();

  if (!photo_id) {
    return NextResponse.json({ ok: false, error: "photo_id missing" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("photo_thumbs2")
    .select("vote")
    .eq("photo_id", photo_id);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const likes = (data || []).filter((d: any) => d.vote === "like").length;
  const dislikes = (data || []).filter((d: any) => d.vote === "dislike").length;

  return NextResponse.json({ ok: true, likes, dislikes });
}
