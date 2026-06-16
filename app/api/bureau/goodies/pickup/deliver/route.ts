import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const body = await req.json();
  const order_id = String(body.order_id || "");
  const delivered_to = body.delivered_to ? String(body.delivered_to) : null;
  const delivered_note = body.delivered_note ? String(body.delivered_note) : null;

  if (!order_id) return NextResponse.json({ ok: false, error: "order_id manquant." }, { status: 400 });

  const { data: order, error: eO } = await supabaseAdmin
    .from("goodies_orders")
    .select("id, status")
    .eq("id", order_id)
    .single();

  if (eO || !order) return NextResponse.json({ ok: false, error: "Commande introuvable." }, { status: 404 });

  if (order.status !== "paid" && order.status !== "ready") {
    return NextResponse.json({ ok: false, error: "Commande non payée / non prête." }, { status: 400 });
  }

  const now = new Date().toISOString();

  await supabaseAdmin.from("goodies_orders").update({ status: "delivered", delivered_at: now }).eq("id", order_id);

  await supabaseAdmin.from("goodies_deliveries").upsert({
    order_id,
    delivered_to,
    delivered_note,
  }, { onConflict: "order_id" });

  // TODO email de clôture parent
  return NextResponse.json({ ok: true });
}
