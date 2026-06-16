import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_TOKEN = process.env.BUREAU_ADMIN_TOKEN;

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normCode(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(req: Request) {
  try {
    const token = req.headers.get("x-admin-token");
    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const saison = String(body?.saison || "").trim();
    const label = String(body?.label || "").trim();
    const codeRaw = String(body?.code || "").trim();
    const categorie = body?.categorie ? String(body.categorie).trim() : null;
    const type_equipe = body?.type_equipe ? String(body.type_equipe).trim() : null;
    const ordre = Number.isFinite(Number(body?.ordre)) ? Number(body.ordre) : 0;

    if (!saison) {
      return NextResponse.json({ ok: false, error: "saison manquante" }, { status: 400 });
    }
    if (!label) {
      return NextResponse.json({ ok: false, error: "label manquant" }, { status: 400 });
    }

    const code = normCode(codeRaw || label);
    if (!code) {
      return NextResponse.json({ ok: false, error: "code invalide" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("equipes")
      .insert({
        saison,
        code,
        label,
        categorie,
        type_equipe,
        ordre,
        actif: true,
      })
      .select("id,saison,code,label,categorie,type_equipe,actif,ordre")
      .single();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, team: data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Erreur inconnue" },
      { status: 500 }
    );
  }
}
