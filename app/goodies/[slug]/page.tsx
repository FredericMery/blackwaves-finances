"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type Variant = {
  id: string;
  size: string | null;
  color: string | null;
  label: string | null;
  price_override_cents: number | null;
  stock_qty: number;
  is_active: boolean;
};

type ProductImage = { id: string; path: string; alt: string | null; sort_order: number; is_hero: boolean };

type Product = {
  id: string;
  slug: string;
  title: string;
  description_md: string | null;
  category: string | null;
  is_preorder: boolean;
  is_personalizable: boolean;
  personalization_label: string | null;
  min_qty: number;
  max_qty: number | null;
  price_public_cents: number;
  price_family_cents: number | null;
  hero_image_path: string | null;
  goodies_product_images: ProductImage[];
  goodies_variants: Variant[];
};

type CatalogResp = { ok: boolean; products: Product[] };

function eur(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

/** Supabase Storage: path -> URL publique */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const GOODIES_BUCKET = "goodies";
function publicImageUrl(path?: string | null) {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${GOODIES_BUCKET}/${path}`;
}

type CartItem = {
  product_id: string;
  variant_id?: string | null;
  qty: number;
  personalization_value?: string | null;
};

const CART_KEY = "bw_goodies_cart_v1";

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export default function GoodiesProductPage() {
  const params = useParams();
  const router = useRouter();
  const slug = String(params.slug || "");

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [variantId, setVariantId] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [personalization, setPersonalization] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch("/api/public/goodies/catalog", { cache: "no-store" });
        const json: CatalogResp = await res.json();
        if (!json.ok) throw new Error("Catalogue indisponible");
        const p = (json.products || []).find((x) => x.slug === slug) || null;
        if (!mounted) return;
        setProduct(p);
        if (p) {
          const firstActive = (p.goodies_variants || []).find((v) => v.is_active) || null;
          setVariantId(firstActive?.id || "");
          setQty(Math.max(p.min_qty || 1, 1));
        }
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message || "Erreur");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [slug]);

  const images = useMemo(() => {
    if (!product) return [];
    const imgs = [...(product.goodies_product_images || [])].sort(
      (a, b) => (a.sort_order ?? 100) - (b.sort_order ?? 100)
    );
    const hero = imgs.find((x) => x.is_hero);
    if (hero) return [hero, ...imgs.filter((x) => x.id !== hero.id)];
    return imgs;
  }, [product]);

  const selectedVariant = useMemo(() => {
    if (!product || !variantId) return null;
    return (product.goodies_variants || []).find((v) => v.id === variantId) || null;
  }, [product, variantId]);

  const priceCents = useMemo(() => {
    if (!product) return 0;
    if (selectedVariant?.price_override_cents != null) return selectedVariant.price_override_cents;
    return product.price_public_cents;
  }, [product, selectedVariant]);

  const isOut = useMemo(() => {
    if (!product) return false;
    if (product.is_preorder) return false;
    if (!selectedVariant) return false;
    return selectedVariant.stock_qty <= 0;
  }, [product, selectedVariant]);

  function addToCart() {
    if (!product) return;
    const q = Math.max(product.min_qty || 1, qty);

    const item: CartItem = {
      product_id: product.id,
      variant_id: variantId || null,
      qty: q,
      personalization_value: product.is_personalizable ? (personalization.trim() || null) : null,
    };

    const cart = loadCart();

    const idx = cart.findIndex(
      (c) =>
        c.product_id === item.product_id &&
        (c.variant_id || null) === (item.variant_id || null) &&
        (c.personalization_value || null) === (item.personalization_value || null)
    );
    if (idx >= 0) cart[idx] = { ...cart[idx], qty: cart[idx].qty + item.qty };
    else cart.push(item);

    saveCart(cart);
    router.push("/goodies/panier");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-5xl px-4 py-10">Chargement…</div>
      </div>
    );
  }

  if (err || !product) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-6">
            <div className="font-semibold">Produit introuvable</div>
            <div className="mt-1 text-sm text-white/70">{err || "Le produit demandé n’existe pas."}</div>
          </div>
          <Link href="/goodies" className="mt-6 inline-flex text-white/80 hover:text-white">
            ← Retour boutique
          </Link>
        </div>
      </div>
    );
  }

  // URLs prêtes à afficher
  const heroUrl = publicImageUrl(images[0]?.path || product.hero_image_path);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-between">
          <Link href="/goodies" className="text-sm text-white/70 hover:text-white">
            ← Boutique
          </Link>
          <Link
            href="/goodies/panier"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white/90"
          >
            Panier
          </Link>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Images */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-50">
              <div className="relative aspect-[4/3] w-full">
                {heroUrl ? (
                  <img
                    src={heroUrl}
                    alt={images[0]?.alt || product.title}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-contain object-center p-4"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400">Image</div>
                )}
              </div>
            </div>

            {images.length > 1 ? (
              <div className="mt-4 grid grid-cols-4 gap-2">
                {images.slice(1, 5).map((im) => {
                  const thumbUrl = publicImageUrl(im.path);
                  return (
                    <div key={im.id} className="overflow-hidden rounded-xl border border-white/10 bg-slate-50">
                      <div className="relative aspect-square w-full">
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt={im.alt || product.title}
                            loading="lazy"
                            className="absolute inset-0 h-full w-full object-contain object-center p-2"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">
                            —
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* Info / CTA */}
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6">
            <div className="text-xs text-white/60">{product.category || "Goodies"}</div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{product.title}</h1>
            <div className="mt-3 text-white/70">{product.description_md || "—"}</div>

            <div className="mt-6 flex items-end justify-between gap-4">
              <div>
                <div className="text-xs text-white/60">Prix</div>
                <div className="text-2xl font-semibold">{eur(priceCents)}</div>
                {product.is_preorder ? <div className="mt-1 text-xs text-amber-200">Précommande (remise différée)</div> : null}
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-xs text-white/60">Seuil minimum</div>
                <div className="text-sm font-semibold">{product.min_qty}</div>
              </div>
            </div>

            {/* Variants */}
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-white/60">Variante</div>
                <select
                  value={variantId}
                  onChange={(e) => setVariantId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none"
                >
                  {(product.goodies_variants || [])
                    .filter((v) => v.is_active)
                    .map((v) => {
                      const label = [v.size, v.color].filter(Boolean).join(" · ") || v.label || "Variante";
                      const suffix = product.is_preorder ? "" : v.stock_qty <= 0 ? " — rupture" : ` — stock ${v.stock_qty}`;
                      return (
                        <option key={v.id} value={v.id}>
                          {label}
                          {suffix}
                        </option>
                      );
                    })}
                </select>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-white/60">Quantité</div>
                <input
                  type="number"
                  min={product.min_qty}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value || product.min_qty))}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none"
                />
                {product.max_qty ? <div className="mt-1 text-[11px] text-white/50">Max: {product.max_qty}</div> : null}
              </div>
            </div>

            {/* Personalization */}
            {product.is_personalizable ? (
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-white/60">{product.personalization_label || "Prénom"} (option)</div>
                <input
                  value={personalization}
                  onChange={(e) => setPersonalization(e.target.value)}
                  placeholder="Ex: Clara"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none"
                />
                <div className="mt-1 text-[11px] text-white/50">La personnalisation peut allonger le délai.</div>
              </div>
            ) : null}

            {/* CTA */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={addToCart}
                disabled={isOut}
                className={`rounded-2xl px-5 py-3 text-sm font-semibold ${
                  isOut ? "cursor-not-allowed bg-white/10 text-white/40" : "bg-white text-slate-900 hover:bg-white/90"
                }`}
              >
                {isOut ? "Rupture" : "Ajouter au panier"}
              </button>

              <Link
                href="/goodies/panier"
                className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 hover:bg-white/10"
              >
                Voir panier
              </Link>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
              Paiement sur place. Retrait sécurisé via QR code (coach scanne, statut payé requis, email de clôture).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
