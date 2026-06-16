import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erreur serveur inattendue";
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const paymentId = (id || "").trim();

    if (!paymentId) {
      return NextResponse.json(
        { ok: false, error: "ID paiement manquant." },
        { status: 400 }
      );
    }

    const sb = supabaseAdmin();

    const paymentRes = await sb
      .from("asso2_finance_line_payments")
      .select(
        "id, budget_line_id, paid_at, supplier, note, amount_ht, amount_tax, amount_ttc, invoice_path, invoice_public_url, invoice_name, legacy_budget_ligne_id, created_at"
      )
      .eq("id", paymentId)
      .single();

    if (paymentRes.error || !paymentRes.data) {
      return NextResponse.json(
        { ok: false, error: `Paiement introuvable: ${paymentRes.error?.message || "not found"}` },
        { status: 404 }
      );
    }

    const payment = paymentRes.data;

    const archiveRes = await sb
      .from("asso2_finance_line_payments_deleted")
      .insert({
        original_payment_id: payment.id,
        budget_line_id: payment.budget_line_id,
        paid_at: payment.paid_at,
        supplier: payment.supplier,
        note: payment.note,
        amount_ht: payment.amount_ht,
        amount_tax: payment.amount_tax,
        amount_ttc: payment.amount_ttc,
        invoice_path: payment.invoice_path,
        invoice_public_url: payment.invoice_public_url,
        invoice_name: payment.invoice_name,
        legacy_budget_ligne_id: payment.legacy_budget_ligne_id,
        created_at: payment.created_at,
        deleted_reason: "manual_delete_payment",
        deleted_source: "bureau/gerer-asso-2",
      });

    if (archiveRes.error) {
      return NextResponse.json(
        { ok: false, error: `Archivage paiement impossible: ${archiveRes.error.message}` },
        { status: 500 }
      );
    }

    const deleteRes = await sb
      .from("asso2_finance_line_payments")
      .delete()
      .eq("id", paymentId);

    if (deleteRes.error) {
      return NextResponse.json(
        { ok: false, error: `Suppression paiement impossible: ${deleteRes.error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id: paymentId });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: errorMessage(error) },
      { status: 500 }
    );
  }
}
