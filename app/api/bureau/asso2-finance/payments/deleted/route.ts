import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erreur serveur inattendue";
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const lineId = (url.searchParams.get("lineId") || "").trim();

    if (!lineId) {
      return NextResponse.json(
        { ok: false, error: "lineId manquant." },
        { status: 400 }
      );
    }

    const sb = supabaseAdmin();
    const res = await sb
      .from("asso2_finance_line_payments_deleted")
      .select(
        "id, original_payment_id, paid_at, supplier, note, amount_ht, amount_tax, amount_ttc, invoice_public_url, invoice_name, created_at, deleted_at, deleted_reason"
      )
      .eq("budget_line_id", lineId)
      .order("deleted_at", { ascending: false });

    if (res.error) {
      return NextResponse.json(
        { ok: false, error: `Lecture archive paiements: ${res.error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, items: res.data || [] });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: errorMessage(error) },
      { status: 500 }
    );
  }
}
