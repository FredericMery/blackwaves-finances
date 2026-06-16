import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type UpdateLineBody = {
  amountPlanned?: number;
  amountCommitted?: number;
  note?: string;
  category?: string;
  designation?: string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erreur serveur inattendue";
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "ID de ligne manquant." },
        { status: 400 }
      );
    }

    const body = (await request.json()) as UpdateLineBody;
    const payload: Record<string, unknown> = {};

    if (typeof body.amountPlanned !== "undefined") {
      const n = Number(body.amountPlanned);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json(
          { ok: false, error: "Montant prévu invalide." },
          { status: 400 }
        );
      }
      payload.amount_planned = n;
    }

    if (typeof body.amountCommitted !== "undefined") {
      const n = Number(body.amountCommitted);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json(
          { ok: false, error: "Montant engagé invalide." },
          { status: 400 }
        );
      }
      payload.amount_committed = n;
    }

    if (typeof body.note !== "undefined") {
      payload.note = body.note?.trim() || null;
    }

    if (typeof body.category !== "undefined") {
      const category = body.category?.trim();
      if (!category) {
        return NextResponse.json(
          { ok: false, error: "Catégorie invalide." },
          { status: 400 }
        );
      }
      payload.category = category;
    }

    if (typeof body.designation !== "undefined") {
      const designation = body.designation?.trim();
      if (!designation) {
        return NextResponse.json(
          { ok: false, error: "Désignation invalide." },
          { status: 400 }
        );
      }
      payload.designation = designation;
    }

    if (Object.keys(payload).length === 0) {
      return NextResponse.json(
        { ok: false, error: "Aucune donnée à mettre à jour." },
        { status: 400 }
      );
    }

    const sb = supabaseAdmin();
    const updateRes = await sb
      .from("asso2_finance_budget_lines")
      .update(payload)
      .eq("id", id)
      .select("id")
      .single();

    if (updateRes.error) {
      return NextResponse.json(
        { ok: false, error: `Mise à jour ligne: ${updateRes.error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id: updateRes.data.id });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: errorMessage(error) },
      { status: 500 }
    );
  }
}
