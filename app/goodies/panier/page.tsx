"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Variant = { id: string; product_id: string; size: string | null; color: string | null; label: string | null; price_override_cents: number | null; stock_qty: number; is_active: boolean };
type Product = { id: string; title: string; slug: string; price_public_cents: number; is_preorder: boolean; is_personalizable: boolean; min_qty: number; goodies_variants: Variant[] };

type CatalogResp = { ok: boolean; products: Product[] };

type CartItem = {
  product_id: string;
  variant_id?: string | null;
  qty: number;
  personalization_value?: string | null;
};

const CART_KEY = "bw_goodies_cart_v1";

function eur(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

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

export default function GoodiesCartPage() {
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setCart(loadCart());
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch("/api/public/goodies/catalog", { cache: "no-store" });
        const json: CatalogResp = await res.json();
        if (!json.ok) throw new Error("Catalogue indisponible");
        if (!mounted) return;
        setCatalog(json.products || []);
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
  }, []);

  const productById = useMemo(() => new Map(catalog.map((p) => [p.id, p])), [catalog]);

  const enriched = useMemo(() => {
    return cart.map((ci) => {
      const p = productById.get(ci.product_id);
      const v = ci.variant_id ? p?.goodies_variants?.find((x) => x.id === ci.variant_id) : null;
      const unit = v?.price_override_cents != null ? v.price_override_cents : p?.price_public_cents || 0;
      const variantLabel = v ? [v.size, v.color].filter(Boolean).join(" · ") || v.label || null : null;
      return { ci, p, v, unit, variantLabel, line: unit * ci.qty };
    });
  }, [cart, productById]);

  const subtotal = useMemo(() => enriched.reduce((s, x) => s + x.line, 0), [enriched]);

  function updateQty(idx: number, qty: number) {
    const next = [...cart];
    next[idx] = { ...next[idx], qty: Math.max(1, qty) };
    setCart(next);
    saveCart(next);
  }

  function removeIdx(idx: number) {
    const next = cart.filter((_, i) => i !== idx);
    setCart(next);
    saveCart(next);
  }

  function clear() {
    setCart([]);
    saveCart([]);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-between">
          <Link href="/goodies" className="text-sm text-white/70 hover:text-white">
            ← Boutique
          </Link>
          <div className="text-sm text-white/60">Paiement sur place</div>
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Mon panier</h1>

        {loading ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">Chargement…</div>
        ) : err ? (
          <div className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-6 text-rose-100">{err}</div>
        ) : cart.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
            Ton panier est vide.{" "}
            <Link href="/goodies" className="text-white underline">
              Retour à la boutique
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-3">
              {enriched.map((x, idx) => (
                <div key={idx} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold">{x.p?.title || "Produit"}</div>
                      {x.variantLabel ? <div className="mt-1 text-sm text-white/60">{x.variantLabel}</div> : null}
                      {x.ci.personalization_value ? (
                        <div className="mt-1 text-sm text-white/60">Prénom : {x.ci.personalization_value}</div>
                      ) : null}
                      <div className="mt-2 text-sm text-white/70">Prix : {eur(x.unit)}</div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-white/60">Qté</div>
                      <input
                        type="number"
                        min={1}
                        value={x.ci.qty}
                        onChange={(e) => updateQty(idx, Number(e.target.value || 1))}
                        className="mt-1 w-24 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none"
                      />
                      <div className="mt-2 text-sm font-semibold">{eur(x.line)}</div>

                      <button
                        onClick={() => removeIdx(idx)}
                        className="mt-2 text-xs text-rose-200/80 hover:text-rose-100"
                      >
                        Retirer
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button onClick={clear} className="text-sm text-white/60 hover:text-white">
                Vider le panier
              </button>
            </div>

            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-5">
              <div className="text-sm text-white/60">Total</div>
              <div className="mt-2 text-3xl font-semibold">{eur(subtotal)}</div>
              <div className="mt-2 text-sm text-white/70">
                Le paiement sera validé au retrait. Une fois payé, tu recevras ton QR code de remise (ou le lien si déjà envoyé).
              </div>

              <Link
                href="/goodies/checkout"
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-white/90"
              >
                Continuer → Checkout
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
