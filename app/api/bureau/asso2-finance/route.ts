import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const INVOICE_BUCKET = "asso2-finance-invoices";

type SeasonRow = {
  id: string;
  code: string;
  label: string;
};

type PaymentRow = {
  id: string;
  paid_at: string;
  supplier: string | null;
  note: string | null;
  amount_ht: number;
  amount_tax: number;
  amount_ttc: number;
  invoice_path: string | null;
  invoice_public_url: string | null;
  invoice_name: string | null;
  created_at: string;
};

type DocumentRow = {
  id: string;
  document_kind: "devis" | "facture" | "document";
  title: string | null;
  note: string | null;
  file_path: string | null;
  public_url: string | null;
  file_name: string | null;
  created_at: string;
};

type LineRow = {
  id: string;
  line_type: "recette" | "depense";
  category: string;
  designation: string;
  note: string | null;
  amount_planned: number;
  amount_committed: number;
  created_at: string;
  payments: PaymentRow[];
  documents: DocumentRow[];
};

function asNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erreur serveur inattendue";
}

function computeDashboard(lines: Array<LineRow & { paid_total: number }>) {
  let recettes = 0;
  let depenses = 0;
  let budgetPlanned = 0;
  let budgetCommitted = 0;
  let budgetPaid = 0;

  for (const line of lines) {
    const planned = asNumber(line.amount_planned);
    const committed = asNumber(line.amount_committed);
    const paid = asNumber(line.paid_total);

    if (line.line_type === "recette") {
      recettes += paid;
    } else {
      depenses += paid;
      budgetPlanned += planned;
      budgetCommitted += committed;
      budgetPaid += paid;
    }
  }

  return {
    recettes,
    depenses,
    budgetPlanned,
    budgetCommitted,
    budgetPaid,
    budgetRemaining: Math.max(budgetPlanned - budgetPaid, 0),
  };
}

export async function GET(request: Request) {
  try {
    const sb = supabaseAdmin();
    const url = new URL(request.url);
    const requestedSeasonCode = url.searchParams.get("season")?.trim();

    const seasonsRes = await sb
      .from("asso2_finance_seasons")
      .select("id, code, label")
      .eq("is_active", true)
      .order("code", { ascending: false });

    if (seasonsRes.error) {
      return NextResponse.json(
        { ok: false, error: `Erreur saisons: ${seasonsRes.error.message}` },
        { status: 500 }
      );
    }

    const seasons = (seasonsRes.data || []) as SeasonRow[];
    const selectedSeason =
      seasons.find((s) => s.code === requestedSeasonCode) || seasons[0] || null;

    if (!selectedSeason) {
      return NextResponse.json({
        ok: true,
        seasons: [],
        selectedSeason: null,
        lines: [],
        dashboard: {
          recettes: 0,
          depenses: 0,
          budgetPlanned: 0,
          budgetCommitted: 0,
          budgetPaid: 0,
          budgetRemaining: 0,
        },
      });
    }

    const linesRes = await sb
      .from("asso2_finance_budget_lines")
      .select(
        "id, line_type, category, designation, note, amount_planned, amount_committed, created_at, payments:asso2_finance_line_payments(id, paid_at, supplier, note, amount_ht, amount_tax, amount_ttc, invoice_path, invoice_public_url, invoice_name, created_at), documents:asso2_finance_line_documents(id, document_kind, title, note, file_path, public_url, file_name, created_at)"
      )
      .eq("season_id", selectedSeason.id)
      .eq("archived", false)
      .order("created_at", { ascending: true });

    if (linesRes.error) {
      return NextResponse.json(
        { ok: false, error: `Erreur lignes: ${linesRes.error.message}` },
        { status: 500 }
      );
    }

    const linesWithTotals = await Promise.all(
      ((linesRes.data || []) as LineRow[]).map(async (line) => {
        const payments = (line.payments || []).sort((a, b) =>
          a.created_at.localeCompare(b.created_at)
        );
        const documents = (line.documents || []).sort((a, b) =>
          b.created_at.localeCompare(a.created_at)
        );

        const paymentsWithSignedUrls = await Promise.all(
          payments.map(async (payment) => {
            let invoiceUrl: string | null = null;
            if (payment.invoice_path) {
              const signed = await sb.storage
                .from(INVOICE_BUCKET)
                .createSignedUrl(payment.invoice_path, 60 * 30);
              if (!signed.error) {
                invoiceUrl = signed.data.signedUrl;
              }
            }
            if (!invoiceUrl && payment.invoice_public_url) {
              invoiceUrl = payment.invoice_public_url;
            }
            return {
              ...payment,
              invoice_url: invoiceUrl,
            };
          })
        );

        const documentsWithUrls = await Promise.all(
          documents.map(async (document) => {
            let fileUrl: string | null = null;
            if (document.file_path) {
              const signed = await sb.storage
                .from(INVOICE_BUCKET)
                .createSignedUrl(document.file_path, 60 * 30);
              if (!signed.error) {
                fileUrl = signed.data.signedUrl;
              }
            }
            if (!fileUrl && document.public_url) {
              fileUrl = document.public_url;
            }
            return {
              ...document,
              file_url: fileUrl,
            };
          })
        );

        const paidTotal = payments.reduce(
          (sum, payment) => sum + asNumber(payment.amount_ttc),
          0
        );

        const planned = asNumber(line.amount_planned);

        return {
          ...line,
          paid_total: paidTotal,
          completion_rate: planned > 0 ? (paidTotal / planned) * 100 : paidTotal > 0 ? 9999 : 0,
          remaining_amount: planned - paidTotal,
          payments: paymentsWithSignedUrls,
          documents: documentsWithUrls,
        };
      })
    );

    return NextResponse.json({
      ok: true,
      seasons,
      selectedSeason,
      lines: linesWithTotals,
      dashboard: computeDashboard(linesWithTotals),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: errorMessage(error),
      },
      { status: 500 }
    );
  }
}
