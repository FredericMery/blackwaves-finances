import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const { data: products, error } = await supabaseAdmin
    .from("goodies_products")
    .select(`
      id, slug, title, description_md, category, season, is_preorder, is_personalizable,
      personalization_label, min_qty, max_qty, price_public_cents, price_family_cents, hero_image_path, sort_order,
      goodies_product_images(id, path, alt, sort_order, is_hero),
      goodies_variants(id, sku, size, color, label, price_override_cents, stock_qty, low_stock_threshold, is_active)
    `)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const { data: pickupPoints, error: e2 } = await supabaseAdmin
    .from("goodies_pickup_points")
    .select("id, title, location, details, sort_order")
    // ✅ accepte true OU null (legacy) SANS planter le cast boolean
    .or("is_active.eq.true,is_active.is.null")
    .order("sort_order", { ascending: true });

  if (e2) return NextResponse.json({ ok: false, error: e2.message }, { status: 500 });

  return NextResponse.json({ ok: true, products, pickupPoints });
}
