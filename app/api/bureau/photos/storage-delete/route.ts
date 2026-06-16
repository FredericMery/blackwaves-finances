import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ALLOWED_BUCKETS = ["photos", "photo-submissions"] as const;
type AllowedBucket = (typeof ALLOWED_BUCKETS)[number];

function getToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  const x = req.headers.get("x-bureau-token");
  return x?.trim() || "";
}

function assertAuth(req: Request) {
  const needed = process.env.BUREAU_ADMIN_TOKEN;
  if (!needed) return true;
  const got = getToken(req);
  return got && got === needed;
}

export async function POST(req: Request) {
  try {
    if (!supabaseUrl || !serviceRole) {
      return new NextResponse(
        "Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY",
        { status: 500 }
      );
    }

    if (!assertAuth(req)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json().catch(() => null);

    const path = (body?.path || "").trim();
    const bucketRaw = (body?.bucket || "photos").trim();
    const bucket = bucketRaw as AllowedBucket;

    if (!path) return new NextResponse("Missing path", { status: 400 });
    if (!ALLOWED_BUCKETS.includes(bucket)) {
      return new NextResponse("Bucket not allowed", { status: 400 });
    }

    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false },
    });

    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) return new NextResponse(error.message, { status: 500 });

    return NextResponse.json({ ok: true, bucket, path });
  } catch (e: any) {
    return new NextResponse(e?.message || "Server error", { status: 500 });
  }
}
