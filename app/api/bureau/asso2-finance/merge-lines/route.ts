import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type MergeBody = {
  sourceLineId1?: string;
  sourceLineId2?: string;
  targetLine?: {
    lineType?: "recette" | "depense";
    category?: string;
    designation?: string;
    note?: string;
    amountPlanned?: number;
    amountCommitted?: number;
  };
  targetPaymentIds?: string[];
  targetDocumentIds?: string[];
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erreur serveur inattendue";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MergeBody;

    const sourceLineId1 = (body.sourceLineId1 || "").trim();
    const sourceLineId2 = (body.sourceLineId2 || "").trim();
    const targetLine = body.targetLine || {};
    const lineType = targetLine.lineType;
    const category = (targetLine.category || "").trim();
    const designation = (targetLine.designation || "").trim();
    const note = (targetLine.note || "").trim() || null;
    const amountPlanned = Number(targetLine.amountPlanned ?? 0);
    const amountCommitted = Number(targetLine.amountCommitted ?? 0);
    const targetPaymentIds: string[] = Array.isArray(body.targetPaymentIds)
      ? body.targetPaymentIds.filter((id) => typeof id === "string" && id.length > 0)
      : [];
    const targetDocumentIds: string[] = Array.isArray(body.targetDocumentIds)
      ? body.targetDocumentIds.filter((id) => typeof id === "string" && id.length > 0)
      : [];

    if (!sourceLineId1 || !sourceLineId2) {
      return NextResponse.json(
        { ok: false, error: "Les deux identifiants de lignes source sont obligatoires." },
        { status: 400 }
      );
    }

    if (sourceLineId1 === sourceLineId2) {
      return NextResponse.json(
        { ok: false, error: "Les deux lignes source doivent être différentes." },
        { status: 400 }
      );
    }

    if (lineType !== "recette" && lineType !== "depense") {
      return NextResponse.json(
        { ok: false, error: "Type de ligne invalide." },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { ok: false, error: "La catégorie est obligatoire." },
        { status: 400 }
      );
    }

    if (!designation) {
      return NextResponse.json(
        { ok: false, error: "La désignation est obligatoire." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(amountPlanned) || amountPlanned < 0) {
      return NextResponse.json(
        { ok: false, error: "Montant prévu invalide." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(amountCommitted) || amountCommitted < 0) {
      return NextResponse.json(
        { ok: false, error: "Montant engagé invalide." },
        { status: 400 }
      );
    }

    const sb = supabaseAdmin();

    // Validate source lines exist and are not already archived
    const sourceLinesRes = await sb
      .from("asso2_finance_budget_lines")
      .select("id, season_id, archived")
      .in("id", [sourceLineId1, sourceLineId2]);

    if (sourceLinesRes.error) {
      return NextResponse.json(
        { ok: false, error: `Erreur lecture lignes: ${sourceLinesRes.error.message}` },
        { status: 500 }
      );
    }

    const sourceLines = sourceLinesRes.data || [];
    if (sourceLines.length !== 2) {
      return NextResponse.json(
        { ok: false, error: "Une ou plusieurs lignes source introuvables." },
        { status: 404 }
      );
    }

    if (sourceLines.some((line) => line.archived)) {
      return NextResponse.json(
        { ok: false, error: "Une ou plusieurs lignes source sont déjà archivées." },
        { status: 400 }
      );
    }

    const seasonId1 = sourceLines[0].season_id;
    const seasonId2 = sourceLines[1].season_id;
    if (seasonId1 !== seasonId2) {
      return NextResponse.json(
        { ok: false, error: "Les deux lignes doivent appartenir à la même saison." },
        { status: 400 }
      );
    }

    // Validate that submitted payment/document IDs actually belong to the source lines
    const validPaymentsRes =
      targetPaymentIds.length > 0
        ? await sb
            .from("asso2_finance_line_payments")
            .select("id")
            .in("id", targetPaymentIds)
            .in("budget_line_id", [sourceLineId1, sourceLineId2])
        : { data: [], error: null };

    if (validPaymentsRes.error) {
      return NextResponse.json(
        { ok: false, error: `Erreur validation paiements: ${validPaymentsRes.error.message}` },
        { status: 500 }
      );
    }

    const validDocumentsRes =
      targetDocumentIds.length > 0
        ? await sb
            .from("asso2_finance_line_documents")
            .select("id")
            .in("id", targetDocumentIds)
            .in("budget_line_id", [sourceLineId1, sourceLineId2])
        : { data: [], error: null };

    if (validDocumentsRes.error) {
      return NextResponse.json(
        { ok: false, error: `Erreur validation documents: ${validDocumentsRes.error.message}` },
        { status: 500 }
      );
    }

    const safePaymentIds = (validPaymentsRes.data || []).map((row) => row.id);
    const safeDocumentIds = (validDocumentsRes.data || []).map((row) => row.id);

    // 1. Create the new target line
    const newLineRes = await sb
      .from("asso2_finance_budget_lines")
      .insert({
        season_id: seasonId1,
        line_type: lineType,
        category,
        designation,
        note,
        amount_planned: amountPlanned,
        amount_committed: amountCommitted,
        archived: false,
      })
      .select("id")
      .single();

    if (newLineRes.error || !newLineRes.data) {
      return NextResponse.json(
        { ok: false, error: `Création ligne cible impossible: ${newLineRes.error?.message}` },
        { status: 500 }
      );
    }

    const newLineId = newLineRes.data.id as string;

    // 2. Reassign selected payments to target line
    if (safePaymentIds.length > 0) {
      const movePaymentsRes = await sb
        .from("asso2_finance_line_payments")
        .update({ budget_line_id: newLineId })
        .in("id", safePaymentIds);

      if (movePaymentsRes.error) {
        return NextResponse.json(
          { ok: false, error: `Déplacement paiements impossible: ${movePaymentsRes.error.message}` },
          { status: 500 }
        );
      }
    }

    // 3. Reassign selected documents to target line
    if (safeDocumentIds.length > 0) {
      const moveDocsRes = await sb
        .from("asso2_finance_line_documents")
        .update({ budget_line_id: newLineId })
        .in("id", safeDocumentIds);

      if (moveDocsRes.error) {
        return NextResponse.json(
          { ok: false, error: `Déplacement documents impossible: ${moveDocsRes.error.message}` },
          { status: 500 }
        );
      }
    }

    // 4. Archive both source lines
    const archiveRes = await sb
      .from("asso2_finance_budget_lines")
      .update({
        archived: true,
        archived_at: new Date().toISOString(),
        archived_reason: "merged",
        merged_into_line_id: newLineId,
      })
      .in("id", [sourceLineId1, sourceLineId2]);

    if (archiveRes.error) {
      return NextResponse.json(
        { ok: false, error: `Archivage lignes source impossible: ${archiveRes.error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, newLineId });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: errorMessage(error) },
      { status: 500 }
    );
  }
}
