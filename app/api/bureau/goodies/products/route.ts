import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

// POST: créer un produit
export async function POST(req: Request) {
  try {
    const supabase = getAdmin();
    const body = await req.json().catch(() => ({}));

    const title = String(body?.title || "").trim();
    const slug = String(body?.slug || "").trim();

    if (!title) {
      return NextResponse.json({ ok: false, error: "Titre requis." }, { status: 400 });
    }
    if (!slug) {
      return NextResponse.json({ ok: false, error: "Slug requis." }, { status: 400 });
    }

    const payload = {
      slug,
      title,
      category: body?.category ?? null,
      season: body?.season ?? null,
      is_active: body?.is_active ?? true,
      is_preorder: body?.is_preorder ?? false,
      is_personalizable: body?.is_personalizable ?? false,
      min_qty: Number.isFinite(body?.min_qty) ? body.min_qty : Number(body?.min_qty ?? 1),
      price_public_cents: Number(body?.price_public_cents ?? 0),
      price_family_cents:
        body?.price_family_cents === null || body?.price_family_cents === undefined || body?.price_family_cents === ""
          ? null
          : Number(body?.price_family_cents),
      sort_order: Number(body?.sort_order ?? 10),
      hero_image_path: body?.hero_image_path ?? null,
      description_md: body?.description_md ?? null, // si la colonne existe
    };

    if (!Number.isFinite(payload.price_public_cents) || payload.price_public_cents <= 0) {
      return NextResponse.json({ ok: false, error: "Prix public invalide." }, { status: 400 });
    }
    if (!Number.isFinite(payload.min_qty) || payload.min_qty < 1) payload.min_qty = 1;

    // ✅ insert
    const { data, error } = await supabase
      .from("goodies_products")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: `Supabase goodies_products.insert: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Erreur serveur" },
      { status: 500 }
    );
  }
}
