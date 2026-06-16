import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const DOCUMENT_BUCKET = "asso2-finance-invoices";
const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_DOCUMENTS_PER_LINE = 10;

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erreur serveur inattendue";
}

export async function POST(request: Request) {
  try {
    const sb = supabaseAdmin();
    const form = await request.formData();

    const lineId = String(form.get("lineId") || "").trim();
    const documentKind = String(form.get("documentKind") || "document").trim();
    const title = String(form.get("title") || "").trim() || null;
    const note = String(form.get("note") || "").trim() || null;
    const file = form.get("file") as File | null;

    if (!lineId) {
      return NextResponse.json(
        { ok: false, error: "Ligne budgétaire manquante." },
        { status: 400 }
      );
    }

    if (!["devis", "facture", "document"].includes(documentKind)) {
      return NextResponse.json(
        { ok: false, error: "Type de document invalide." },
        { status: 400 }
      );
    }

    if (!file || file.size <= 0) {
      return NextResponse.json(
        { ok: false, error: "Fichier manquant." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { ok: false, error: "Le fichier dépasse 10 Mo." },
        { status: 400 }
      );
    }

    const existingDocsRes = await sb
      .from("asso2_finance_line_documents")
      .select("id", { count: "exact", head: true })
      .eq("budget_line_id", lineId);

    if (existingDocsRes.error) {
      return NextResponse.json(
        { ok: false, error: `Comptage documents: ${existingDocsRes.error.message}` },
        { status: 500 }
      );
    }

    const existingInvoicesRes = await sb
      .from("asso2_finance_line_payments")
      .select("id", { count: "exact", head: true })
      .eq("budget_line_id", lineId)
      .or("invoice_path.not.is.null,invoice_public_url.not.is.null");

    if (existingInvoicesRes.error) {
      return NextResponse.json(
        { ok: false, error: `Comptage factures: ${existingInvoicesRes.error.message}` },
        { status: 500 }
      );
    }

    const totalDocuments =
      Number(existingDocsRes.count || 0) + Number(existingInvoicesRes.count || 0);

    if (totalDocuments >= MAX_DOCUMENTS_PER_LINE) {
      return NextResponse.json(
        {
          ok: false,
          error: `Limite atteinte: ${MAX_DOCUMENTS_PER_LINE} documents maximum par fiche.`,
        },
        { status: 400 }
      );
    }

    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const safeName = sanitizeFileName(file.name || `document.${ext}`);
    const filePath = `${lineId}/docs/${Date.now()}-${safeName}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const upload = await sb.storage.from(DOCUMENT_BUCKET).upload(filePath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (upload.error) {
      return NextResponse.json(
        { ok: false, error: `Upload document: ${upload.error.message}` },
        { status: 500 }
      );
    }

    const insert = await sb
      .from("asso2_finance_line_documents")
      .insert({
        budget_line_id: lineId,
        document_kind: documentKind,
        title,
        note,
        file_path: filePath,
        file_name: file.name || safeName,
      })
      .select("id")
      .single();

    if (insert.error) {
      return NextResponse.json(
        { ok: false, error: `Création document: ${insert.error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id: insert.data.id });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: errorMessage(error) },
      { status: 500 }
    );
  }
}
