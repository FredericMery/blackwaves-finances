import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

function buildVariantLabel(v: any) {
  if (!v) return null;
  const parts = [v.size, v.color].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  return v.label || null;
}

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  // ⚠️ IMPORTANT : on ne sélectionne plus title_snapshot (colonne inexistante)
  const { data, error } = await supabaseAdmin
    .from("goodies_orders")
    .select(
      `
      id, created_at, order_number, status,
      buyer_name, buyer_email, buyer_phone, note,
      subtotal_cents, discount_cents, total_cents,
      paid_at, delivered_at, pickup_qr_token,
      goodies_pickup_points(id, title, location, details),
      goodies_order_items(
        id,
        qty,
        unit_price_cents,
        line_total_cents,
        personalization_value,
        product_id,
        variant_id,
        goodies_products(title),
        goodies_variants(size, color, label)
      )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: `Supabase goodies_orders.select: ${error.message}` }, { status: 500 });
  if (!data) return NextResponse.json({ ok: false, error: "Commande introuvable" }, { status: 404 });

  // Flatten items -> format attendu par ta page bureau
  const items = (data.goodies_order_items || []).map((it: any) => ({
    id: it.id,
    product_title: it.goodies_products?.title || "—",
    variant_label: buildVariantLabel(it.goodies_variants),
    personalization_value: it.personalization_value ?? null,
    unit_price_cents: it.unit_price_cents ?? 0,
    qty: it.qty ?? 0,
    line_total_cents: it.line_total_cents ?? (it.unit_price_cents ?? 0) * (it.qty ?? 0),
  }));

  const order = {
    ...data,
    goodies_order_items: items,
  };

  return NextResponse.json({ ok: true, order });
}
