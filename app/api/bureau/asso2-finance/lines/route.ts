import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type CreateLineBody = {
  seasonCode?: string;
  lineType?: "recette" | "depense";
  category?: string;
  designation?: string;
  note?: string;
  amountPlanned?: number;
  amountCommitted?: number;
};

function getSeasonLabel(code: string) {
  return `Saison ${code}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erreur serveur inattendue";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateLineBody;
    const seasonCode = (body.seasonCode || "").trim();
    const lineType = body.lineType;
    const category = (body.category || "").trim();
    const designation = (body.designation || "").trim();
    const note = (body.note || "").trim() || null;
    const amountPlanned = Number(body.amountPlanned || 0);
    const amountCommitted = Number(body.amountCommitted || 0);

    if (!seasonCode || !/^\d{4}-\d{4}$/.test(seasonCode)) {
      return NextResponse.json(
        { ok: false, error: "Saison invalide (ex: 2025-2026)." },
        { status: 400 }
      );
    }

    if (lineType !== "recette" && lineType !== "depense") {
      return NextResponse.json(
        { ok: false, error: "Type invalide. Utiliser recette ou depense." },
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
        { ok: false, error: "Le montant prévu est invalide." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(amountCommitted) || amountCommitted < 0) {
      return NextResponse.json(
        { ok: false, error: "Le montant engagé est invalide." },
        { status: 400 }
      );
    }

    const sb = supabaseAdmin();

    let seasonId: string | null = null;
    const existing = await sb
      .from("asso2_finance_seasons")
      .select("id")
      .eq("code", seasonCode)
      .maybeSingle();

    if (existing.error) {
      return NextResponse.json(
        { ok: false, error: `Erreur saison: ${existing.error.message}` },
        { status: 500 }
      );
    }

    if (existing.data?.id) {
      seasonId = existing.data.id;
    } else {
      const createdSeason = await sb
        .from("asso2_finance_seasons")
        .insert({
          code: seasonCode,
          label: getSeasonLabel(seasonCode),
          is_active: true,
        })
        .select("id")
        .single();

      if (createdSeason.error) {
        return NextResponse.json(
          { ok: false, error: `Création saison: ${createdSeason.error.message}` },
          { status: 500 }
        );
      }

      seasonId = createdSeason.data.id;
    }

    const insertRes = await sb
      .from("asso2_finance_budget_lines")
      .insert({
        season_id: seasonId,
        line_type: lineType,
        category,
        designation,
        note,
        amount_planned: amountPlanned,
        amount_committed: amountCommitted,
      })
      .select("id")
      .single();

    if (insertRes.error) {
      return NextResponse.json(
        { ok: false, error: `Création ligne: ${insertRes.error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id: insertRes.data.id });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: errorMessage(error) },
      { status: 500 }
    );
  }
}
