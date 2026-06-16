import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function json(ok: boolean, extra: any = {}, status = 200) {
  return NextResponse.json({ ok, ...extra }, { status });
}

// transforme "Mini Mates" -> "MINI_MATES"
function toCode(label: string) {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // accents
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const label = (body?.label as string | undefined)?.trim() || "";
    const ordre = Number.isFinite(body?.ordre) ? Number(body.ordre) : 0;
    const saison = (body?.saison as string | undefined)?.trim() || ""; // optionnel : pour init ages

    if (!label) return json(false, { error: "Champ 'label' manquant." }, 400);

    const code = (body?.code as string | undefined)?.trim() || toCode(label);
    if (!code) return json(false, { error: "Impossible de générer le code." }, 400);

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return json(
        false,
        { error: "Variables Supabase manquantes (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)." },
        500
      );
    }

    const sb = createClient(supabaseUrl, serviceKey);

    // 1) Insert type
    const { data: inserted, error: e1 } = await sb
      .from("def_equipe_types")
      .insert([{ code, label, ordre, actif: true }])
      .select("code,label,ordre,actif")
      .single();

    if (e1) {
      // collision code ?
      const msg = e1.message || "";
      return json(false, { error: `Création impossible: ${msg}` }, 400);
    }

    // 2) (optionnel mais pratique) : initialiser une règle d'âge pour cette saison
    // pour que la ligne apparaisse tout de suite avec une valeur par défaut
    if (saison) {
      await sb
        .from("def_equipe_ages")
        .upsert(
          [
            {
              saison,
              type_code: code,
              annee_naissance_min: 2010,
              annee_naissance_max: 2012,
            },
          ],
          { onConflict: "saison,type_code" }
        );
    }

    return json(true, { type: inserted });
  } catch (e: any) {
    return json(false, { error: e?.message || "Erreur inconnue." }, 500);
  }
}
