import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const sb = supabaseAdmin();
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ ok: false, error: "Fichier manquant (field: file)" }, { status: 400 });
    }

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
    const filename = `${Date.now()}_${Math.random().toString(16).slice(2)}.${safeExt}`;
    const path = `products/${filename}`;

    const bytes = Buffer.from(await file.arrayBuffer());

    const { error } = await sb.storage.from("goodies").upload(path, bytes, {
      contentType: file.type || "image/jpeg",
      upsert: true,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: `Storage upload: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, path });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erreur upload" }, { status: 500 });
  }
}
