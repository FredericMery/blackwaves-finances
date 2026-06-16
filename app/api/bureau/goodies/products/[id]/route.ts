import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ✅ IMPORTANT (Next.js App Router): params est une Promise
async function getId(context: { params: Promise<{ id: string }> }) {
  const p = await context.params;
  const id = p?.id;
  if (!id) throw new Error("Paramètre id manquant.");
  return id;
}

function isNonEmptyString(v: any) {
  return typeof v === "string" && v.trim().length > 0;
}

function normalizeNullableString(v: any) {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

function normalizeBool(v: any) {
  // le front envoie déjà des bools, mais on sécurise
  return Boolean(v);
}

function normalizeInt(v: any, { min, allowNull = false }: { min: number; allowNull?: boolean }) {
  if (v === null || v === undefined || v === "") return allowNull ? null : min;
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return allowNull ? null : min;
  return Math.max(min, n);
}

function normalizeCents(v: any, { allowNull = false }: { allowNull?: boolean }) {
  if (v === null || v === undefined || v === "") return allowNull ? null : 0;
  const n = Number(v);
  if (!Number.isFinite(n)) return allowNull ? null : 0;
  return Math.round(n);
}

// GET: récupérer un produit
export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getAdmin();
    const id = await getId(context);

    const { data, error } = await supabase.from("goodies_products").select("*").eq("id", id).single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: `Supabase goodies_products.get: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, product: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erreur" }, { status: 500 });
  }
}

// PATCH: mettre à jour un produit (bureau)
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getAdmin();
    const id = await getId(context);

    const body = await req.json().catch(() => ({}));

    /**
     * ✅ whitelist des champs modifiables depuis le bureau
     * (aligné avec ta page d’édition)
     */
    const allowed = [
      "title",
      "slug",
      "description_md",
      "category",
      "season",

      "is_active",
      "is_preorder",

      "is_personalizable",
      "personalization_label",

      "min_qty",
      "max_qty",

      "price_public_cents",
      "price_family_cents",
      "cost_cents",

      "sort_order",
      "hero_image_path",
    ] as const;

    const patch: Record<string, any> = {};
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, k)) patch[k] = (body as any)[k];
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ ok: false, error: "Aucune donnée à mettre à jour." }, { status: 400 });
    }

    // ---------- Validations / normalisations ----------
    if ("title" in patch) {
      if (!isNonEmptyString(patch.title)) {
        return NextResponse.json({ ok: false, error: "Titre requis." }, { status: 400 });
      }
      patch.title = String(patch.title).trim();
    }

    if ("slug" in patch) {
      if (!isNonEmptyString(patch.slug)) {
        return NextResponse.json({ ok: false, error: "Slug requis." }, { status: 400 });
      }
      patch.slug = String(patch.slug).trim();
      // Optionnel: tu peux forcer lowercase si tu veux
      // patch.slug = patch.slug.toLowerCase();
    }

    if ("category" in patch) patch.category = normalizeNullableString(patch.category);
    if ("season" in patch) patch.season = normalizeNullableString(patch.season);
    if ("description_md" in patch) patch.description_md = normalizeNullableString(patch.description_md);

    if ("hero_image_path" in patch) patch.hero_image_path = normalizeNullableString(patch.hero_image_path);

    if ("is_active" in patch) patch.is_active = normalizeBool(patch.is_active);
    if ("is_preorder" in patch) patch.is_preorder = normalizeBool(patch.is_preorder);
    if ("is_personalizable" in patch) patch.is_personalizable = normalizeBool(patch.is_personalizable);

    if ("personalization_label" in patch) {
      patch.personalization_label = normalizeNullableString(patch.personalization_label);
    }

    if ("min_qty" in patch) patch.min_qty = normalizeInt(patch.min_qty, { min: 1 });

    if ("max_qty" in patch) {
      patch.max_qty = normalizeInt(patch.max_qty, { min: 1, allowNull: true });
      // si max < min, on rejette
      const minQty = "min_qty" in patch ? patch.min_qty : null;
      if (patch.max_qty != null && minQty != null && patch.max_qty < minQty) {
        return NextResponse.json(
          { ok: false, error: "Max qty doit être ≥ min qty." },
          { status: 400 }
        );
      }
    }

    if ("price_public_cents" in patch) {
      patch.price_public_cents = normalizeCents(patch.price_public_cents, { allowNull: false });
      if (!Number.isFinite(patch.price_public_cents) || patch.price_public_cents <= 0) {
        return NextResponse.json({ ok: false, error: "Prix public invalide." }, { status: 400 });
      }
    }

    if ("price_family_cents" in patch) {
      patch.price_family_cents = normalizeCents(patch.price_family_cents, { allowNull: true });
      if (patch.price_family_cents != null && patch.price_family_cents < 0) {
        return NextResponse.json({ ok: false, error: "Prix famille invalide." }, { status: 400 });
      }
    }

    if ("cost_cents" in patch) {
      patch.cost_cents = normalizeCents(patch.cost_cents, { allowNull: true });
      if (patch.cost_cents != null && patch.cost_cents < 0) {
        return NextResponse.json({ ok: false, error: "Coût invalide." }, { status: 400 });
      }
    }

    if ("sort_order" in patch) patch.sort_order = normalizeInt(patch.sort_order, { min: 0 });

    // Si personnalisation désactivée, on nettoie le label (optionnel mais propre)
    if ("is_personalizable" in patch && patch.is_personalizable === false) {
      patch.personalization_label = null;
    }

    // ---------- Update ----------
    const { data, error } = await supabase
      .from("goodies_products")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { ok: false, error: `Supabase goodies_products.update: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, product: data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erreur" }, { status: 500 });
  }
}

// DELETE: supprimer un produit
export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getAdmin();
    const id = await getId(context);

    const { error } = await supabase.from("goodies_products").delete().eq("id", id);

    if (error) {
      return NextResponse.json(
        { ok: false, error: `Supabase goodies_products.delete: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erreur" }, { status: 500 });
  }
}
