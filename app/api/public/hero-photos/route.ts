import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BUCKET = "photos";
const DEFAULT_PREFIX = "hero"; // ✅ tu ranges tes photos hero dans photos/hero/

export async function GET(req: Request) {
  try {
    if (!supabaseUrl || !serviceRole) {
      return new NextResponse("Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY", { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const prefix = (searchParams.get("prefix") || DEFAULT_PREFIX)
      .replace(/^\/+|\/+$/g, "")
      .trim();

    const limit = Math.min(Number(searchParams.get("limit") || 12), 30);

    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
      limit: 1000,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) return new NextResponse(error.message, { status: 500 });

    // ne garde que les fichiers (id présent) et les images
    const items = (data || [])
      .filter((x: any) => !!x?.id)
      .map((x: any) => {
        const path = prefix ? `${prefix}/${x.name}` : x.name;
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        return {
          path,
          url: data.publicUrl,
          name: x.name,
          updated_at: x.updated_at ?? null,
        };
      })
      .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""))
      .slice(0, limit);

    return NextResponse.json({ bucket: BUCKET, prefix, count: items.length, items });
  } catch (e: any) {
    return new NextResponse(e?.message || "Server error", { status: 500 });
  }
}
