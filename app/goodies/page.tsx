"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";



type Variant = {
  id: string;
  size: string | null;
  color: string | null;
  label: string | null;
  price_override_cents: number | null;
  stock_qty: number;
  low_stock_threshold: number;
  is_active: boolean;
};

type ProductImage = {
  id: string;
  path: string;
  alt: string | null;
  sort_order: number;
  is_hero: boolean;
};

type Product = {
  id: string;
  slug: string;
  title: string;
  description_md: string | null;
  category: string | null;
  season: string | null;
  is_preorder: boolean;
  is_personalizable: boolean;
  personalization_label: string | null;
  min_qty: number;
  max_qty: number | null;
  price_public_cents: number;
  price_family_cents: number | null;
  hero_image_path: string | null;
  sort_order: number;
  goodies_product_images: ProductImage[];
  goodies_variants: Variant[];
};

type PickupPoint = {
  id: string;
  title: string;
  location: string | null;
  details: string | null;
  sort_order: number;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const GOODIES_BUCKET = "goodies";

function publicImageUrl(path?: string | null) {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${GOODIES_BUCKET}/${path}`;
}

function eur(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

function heroFrom(p: Product) {
  const hero = (p.goodies_product_images || []).find((x) => x.is_hero) || (p.goodies_product_images || [])[0];
  return hero?.path || p.hero_image_path || null;
}

function badge(p: Product) {
  if (p.is_preorder) return { label: "Précommande", cls: "bg-amber-100 text-amber-900 border-amber-200" };
  const variants = (p.goodies_variants || []).filter((v) => v.is_active);
  if (variants.length && variants.every((v) => v.stock_qty <= 0)) {
    return { label: "Rupture", cls: "bg-rose-100 text-rose-900 border-rose-200" };
  }
  return null;
}

export default function GoodiesCatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch("/api/public/goodies/catalog", { cache: "no-store" });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Erreur chargement catalogue");
        if (!mounted) return;
        setProducts(json.products || []);
        setPickupPoints(json.pickupPoints || []);
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

  const categories = useMemo(() => {
    const s = new Set<string>();
    for (const p of products) if (p.category) s.add(p.category);
    return Array.from(s).sort();
  }, [products]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return products.filter((p) => {
      if (cat && (p.category || "") !== cat) return false;
      if (!qq) return true;
      return (
        p.title.toLowerCase().includes(qq) ||
        (p.category || "").toLowerCase().includes(qq) ||
        (p.description_md || "").toLowerCase().includes(qq)
      );
    });
  }, [products, q, cat]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* HERO */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-8 shadow-xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Boutique officielle BlackWaves
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">Goodies du club</h1>
              <p className="mt-2 max-w-2xl text-white/70">
                Commande en ligne, paiement sur place, retrait sécurisé par QR code lors des entraînements ou événements.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link
                href="/goodies/panier"
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white/90"
              >
                Voir mon panier
              </Link>
              <Link
                href="/goodies/commande/xxx"
                className="hidden rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 md:inline-flex"
              >
                Suivi commande (via lien)
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-white/60">Recherche</div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="T-shirt, sweat, nœud…"
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none focus:border-indigo-400/40"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-white/60">Catégorie</div>
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400/40"
              >
                <option value="">Toutes</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-white/60">Points de retrait</div>
              <div className="mt-2 text-sm text-white/80">
                {pickupPoints.length ? (
                  <ul className="space-y-1">
                    {pickupPoints.slice(0, 3).map((pp) => (
                      <li key={pp.id} className="truncate">
                        <span className="font-medium">{pp.title}</span>
                        {pp.location ? <span className="text-white/50"> · {pp.location}</span> : null}
                      </li>
                    ))}
                    {pickupPoints.length > 3 ? <li className="text-white/40">+ {pickupPoints.length - 3} autres</li> : null}
                  </ul>
                ) : (
                  <span className="text-white/50">À configurer dans le Bureau</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mt-10">
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">Chargement…</div>
          ) : err ? (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-6 text-rose-100">
              <div className="font-semibold">Erreur</div>
              <div className="mt-1 text-sm text-rose-100/80">{err}</div>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-end justify-between">
                <div className="text-white/70">{filtered.length} article(s)</div>
                <Link href="/goodies/panier" className="text-sm text-white/80 hover:text-white">
                  Panier →
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((p) => {
                  const b = badge(p);
                  const img = publicImageUrl(heroFrom(p));
                  return (
                    <Link
                      key={p.id}
                      href={`/goodies/${p.slug}`}
                      className="group rounded-3xl border border-white/10 bg-white/5 p-4 shadow-sm transition hover:border-white/20 hover:bg-white/7"
                    >
                      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-50">
                        <div className="relative aspect-[4/3] w-full">
                            {img ? (
                              <img
                                src={img}
                                alt={p.title}
                                loading="lazy"
                                className="absolute inset-0 h-full w-full object-contain object-center p-4 transition duration-300 group-hover:scale-[1.02]"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-white/30">Image</div>
                            )}
                          </div>

                          {b ? (
                            <div className={`absolute left-3 top-3 rounded-full border px-3 py-1 text-xs font-semibold ${b.cls}`}>
                              {b.label}
                            </div>
                          ) : null}
                        </div>

                      <div className="mt-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-lg font-semibold">{p.title}</div>
                            <div className="mt-1 text-xs text-white/50">{p.category || "Goodies"}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{eur(p.price_public_cents)}</div>
                            {p.is_personalizable ? <div className="mt-1 text-[11px] text-white/50">Option prénom</div> : null}
                          </div>
                        </div>

                        <div className="mt-3 line-clamp-2 text-sm text-white/65">{p.description_md || "—"}</div>

                        <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
                          Voir le produit <span className="opacity-60">→</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
