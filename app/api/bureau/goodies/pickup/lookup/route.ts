import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = String(searchParams.get("token") || "").trim();
  if (!token) return NextResponse.json({ ok: false, error: "Token manquant." }, { status: 400 });

  const { data: order, error } = await supabaseAdmin
    .from("goodies_orders")
    .select(`
      id, order_number, status, buyer_name, buyer_email, total_cents, paid_at, delivered_at,
      goodies_pickup_points(title, location),
      goodies_order_items(product_title, variant_label, personalization_value, qty)
    `)
    .eq("pickup_qr_token", token)
    .single();

  if (error || !order) return NextResponse.json({ ok: false, error: "Commande introuvable." }, { status: 404 });

  return NextResponse.json({ ok: true, order });
}
