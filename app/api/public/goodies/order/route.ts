import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = String(searchParams.get("token") || "").trim();
  if (!token) return NextResponse.json({ ok: false, error: "Token manquant." }, { status: 400 });

  const { data: order, error } = await supabaseAdmin
    .from("goodies_orders")
    .select(`
      id, created_at, order_number, status, buyer_name, buyer_email, buyer_phone, is_family,
      subtotal_cents, discount_cents, total_cents, paid_at, delivered_at,
      goodies_pickup_points(title, location, details),
      goodies_order_items(id, product_title, variant_label, personalization_value, unit_price_cents, qty, line_total_cents)
    `)
    .eq("public_token", token)
    .single();

  if (error || !order) return NextResponse.json({ ok: false, error: "Commande introuvable." }, { status: 404 });

  return NextResponse.json({ ok: true, order });
}
