import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  let query = supabaseAdmin
    .from("goodies_orders")
    .select("id, created_at, order_number, status, buyer_name, buyer_email, total_cents, paid_at, delivered_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) query = query.eq("status", status);
  if (q) query = query.or(`order_number.ilike.%${q}%,buyer_email.ilike.%${q}%,buyer_name.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, rows: data });
}
