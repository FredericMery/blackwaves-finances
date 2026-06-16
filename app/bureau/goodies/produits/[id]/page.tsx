"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";


type Product = {
  id: string;
  slug: string;
  title: string;
  description_md: string | null;
  category: string | null;
  season: string | null;

  is_active: boolean;
  is_preorder: boolean;

  is_personalizable: boolean;
  personalization_label: string | null;

  min_qty: number;
  max_qty: number | null;

  price_public_cents: number;
  price_family_cents: number | null;
  cost_cents: number | null;

  hero_image_path: string | null;
  sort_order: number;
};

type Img = {
  id: string;
  path: string;
  alt: string | null;
  sort_order: number;
  is_hero: boolean;
};

type Variant = {
  id: string;
  sku: string | null;
  size: string | null;
  color: string | null;
  label: string | null;

  price_override_cents: number | null;

  stock_qty: number;
  low_stock_threshold: number;
  is_active: boolean;
};

function euro(cents: number | null | undefined) {
  const c = typeof cents === "number" ? cents : 0;
  return (c / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function numOrNull(v: string) {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function centsFromEuroInput(v: string) {
  const t = v.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

// ✅ BUCKET goodies (doit matcher celui utilisé par l'API d'upload)
const GOODIES_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_GOODIES_BUCKET || "goodies";

function storagePublicUrl(path: string | null | undefined) {
  if (!path) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });

  const { data } = supabase.storage.from(GOODIES_BUCKET).getPublicUrl(path);

  // cache-buster pour éviter l’image “cassée” à cause d’un cache agressif
  const url = data?.publicUrl || null;
  return url ? `${url}?v=${encodeURIComponent(path)}` : null;
}


export default function GoodiesProductEditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<Img[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);

  // Upload image local state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadAlt, setUploadAlt] = useState("");
  const [uploadSort, setUploadSort] = useState("100");
  const [uploadIsHero, setUploadIsHero] = useState(false);
  const [uploading, setUploading] = useState(false);

  // New variant state
  const [nvSku, setNvSku] = useState("");
  const [nvSize, setNvSize] = useState("");
  const [nvColor, setNvColor] = useState("");
  const [nvLabel, setNvLabel] = useState("");
  const [nvPrice, setNvPrice] = useState(""); // euro
  const [nvStock, setNvStock] = useState("0");
  const [nvLow, setNvLow] = useState("3");
  const [nvActive, setNvActive] = useState(true);
  const [creatingVariant, setCreatingVariant] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    setErr(null);
    setOkMsg(null);
    try {
      const res = await fetch(`/api/bureau/goodies/products/${id}`, { cache: "no-store" });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Erreur chargement produit");

      setProduct(j.product);
      setImages(j.images || []);
      setVariants(j.variants || []);
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const heroPath = useMemo(() => {
    if (!product) return null;
    return product.hero_image_path || null;
  }, [product]);

  const heroUrl = useMemo(() => storagePublicUrl(heroPath), [heroPath]);

  function setField<K extends keyof Product>(key: K, value: Product[K]) {
    setProduct((p) => (p ? { ...p, [key]: value } : p));
  }

  async function saveProduct() {
    if (!product) return;
    setSaving(true);
    setErr(null);
    setOkMsg(null);
    try {
      const payload: Partial<Product> = {
        slug: product.slug,
        title: product.title,
        description_md: product.description_md,
        category: product.category,
        season: product.season,
        is_active: product.is_active,
        is_preorder: product.is_preorder,
        is_personalizable: product.is_personalizable,
        personalization_label: product.personalization_label,
        min_qty: product.min_qty,
        max_qty: product.max_qty,
        price_public_cents: product.price_public_cents,
        price_family_cents: product.price_family_cents,
        cost_cents: product.cost_cents,
        hero_image_path: product.hero_image_path,
        sort_order: product.sort_order,
      };

      const res = await fetch(`/api/bureau/goodies/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error || "Erreur sauvegarde produit");

      setOkMsg("Produit sauvegardé.");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally {
      setSaving(false);
      setTimeout(() => setOkMsg(null), 2500);
    }
  }

  
async function uploadAndAddImage() {
  if (!product) return;
  if (!uploadFile) {
    setErr("Sélectionne un fichier image.");
    return;
  }

  setUploading(true);
  setErr(null);
  setOkMsg(null);

  try {
    const fd = new FormData();
    fd.append("file", uploadFile);
    fd.append("alt", uploadAlt.trim());
    fd.append("sort_order", String(Number(uploadSort || 100)));
    fd.append("is_hero", uploadIsHero ? "true" : "false");

    const res = await fetch(`/api/bureau/goodies/products/${product.id}/hero`, {
      method: "POST",
      body: fd,
    });

    const j = await res.json();
    if (!j.ok) throw new Error(j.error || "Ajout image impossible");

    setOkMsg(uploadIsHero ? "Image hero ajoutée." : "Image ajoutée.");
    setUploadFile(null);
    setUploadAlt("");
    setUploadSort("100");
    setUploadIsHero(false);

    await load();
  } catch (e: any) {
    setErr(e?.message || "Erreur");
  } finally {
    setUploading(false);
    setTimeout(() => setOkMsg(null), 2500);
  }
}




  async function deleteImage(imageId: string) {
    if (!confirm("Supprimer cette image ?")) return;
    setErr(null);
    setOkMsg(null);

    try {
      const img = images.find((x) => x.id === imageId);
      const wasHero = !!img && img.path === heroPath;

      const res = await fetch(`/api/bureau/goodies/products/images/${imageId}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error || "Suppression impossible");

      // ✅ si on a supprimé l’image hero : on nettoie hero_image_path
      if (product && wasHero) {
        const r2 = await fetch(`/api/bureau/goodies/products/${product.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hero_image_path: null }),
        });
        const j2 = await r2.json().catch(() => ({}));
        if (!r2.ok || !j2.ok) {
          throw new Error(j2.error || "Image supprimée mais impossible de réinitialiser l'image HERO");
        }
      }

      setOkMsg("Image supprimée.");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally {
      setTimeout(() => setOkMsg(null), 2500);
    }
  }

  async function setAsHero(img: Img) {
    if (!product) return;
    setErr(null);
    setOkMsg(null);

    try {
      const res = await fetch(`/api/bureau/goodies/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hero_image_path: img.path }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error || "Impossible de définir l'image hero");

      setOkMsg("Image hero mise à jour.");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally {
      setTimeout(() => setOkMsg(null), 2500);
    }
  }

  async function createVariant() {
    if (!product) return;
    setCreatingVariant(true);
    setErr(null);
    setOkMsg(null);

    try {
      const payload = {
        sku: nvSku.trim() || null,
        size: nvSize.trim() || null,
        color: nvColor.trim() || null,
        label: nvLabel.trim() || null,
        price_override_cents: centsFromEuroInput(nvPrice),
        stock_qty: Math.max(0, Number(nvStock || 0)),
        low_stock_threshold: Math.max(0, Number(nvLow || 0)),
        is_active: Boolean(nvActive),
      };

      const res = await fetch(`/api/bureau/goodies/products/${product.id}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error || "Création variante impossible");

      setOkMsg("Variante créée.");
      setNvSku("");
      setNvSize("");
      setNvColor("");
      setNvLabel("");
      setNvPrice("");
      setNvStock("0");
      setNvLow("3");
      setNvActive(true);

      await load();
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally {
      setCreatingVariant(false);
      setTimeout(() => setOkMsg(null), 2500);
    }
  }

  async function patchVariant(variantId: string, patch: Partial<Variant>) {
    setErr(null);
    setOkMsg(null);

    try {
      const res = await fetch(`/api/bureau/goodies/variants/${variantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error || "Update variante impossible");

      setOkMsg("Variante mise à jour.");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally {
      setTimeout(() => setOkMsg(null), 1800);
    }
  }

  async function deleteVariant(variantId: string) {
    if (!confirm("Supprimer cette variante ?")) return;
    setErr(null);
    setOkMsg(null);

    try {
      const res = await fetch(`/api/bureau/goodies/variants/${variantId}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) throw new Error(j.error || "Suppression variante impossible");

      setOkMsg("Variante supprimée.");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally {
      setTimeout(() => setOkMsg(null), 2500);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070B18] text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 text-white/70">Chargement…</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#070B18] text-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="text-white/70">Produit introuvable.</div>
          {err && <div className="mt-3 text-red-300">{err}</div>}
          <Link
            href="/bureau/goodies/produits"
            className="mt-6 inline-block rounded-xl bg-white/10 px-4 py-2 hover:bg-white/15"
          >
            ← Retour produits
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070B18] text-white">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm text-white/60">Bureau · Goodies · Produits</div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Édition produit</h1>
            <div className="mt-2 text-sm text-white/70">
              <span className="font-semibold">{product.title}</span>{" "}
              <span className="text-white/50">·</span>{" "}
              <span className="font-mono text-xs text-white/60">{product.slug}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/bureau/goodies/produits"
              className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
            >
              ← Produits
            </Link>
            <Link href="/bureau/goodies" className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15">
              Dashboard
            </Link>
          </div>
        </div>

        {(err || okMsg) && (
          <div
            className={cn(
              "mt-4 rounded-2xl p-4 ring-1",
              err
                ? "bg-red-500/10 text-red-200 ring-red-300/20"
                : "bg-emerald-500/10 text-emerald-200 ring-emerald-300/20"
            )}
          >
            {err || okMsg}
          </div>
        )}

        {/* TOP GRID */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {/* MAIN FIELDS */}
          <div className="md:col-span-2 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Informations</div>
              <button
                onClick={saveProduct}
                disabled={saving}
                className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold hover:bg-indigo-600 disabled:opacity-50"
              >
                {saving ? "Sauvegarde…" : "Sauvegarder"}
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs text-white/60">Titre</div>
                <input
                  value={product.title}
                  onChange={(e) => setField("title", e.target.value)}
                  className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
                />
              </div>

              <div>
                <div className="text-xs text-white/60">Slug</div>
                <input
                  value={product.slug}
                  onChange={(e) => setField("slug", e.target.value)}
                  className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 font-mono text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
                />
              </div>

              <div>
                <div className="text-xs text-white/60">Catégorie</div>
                <input
                  value={product.category || ""}
                  onChange={(e) => setField("category", e.target.value || null)}
                  placeholder="Textile / Accessoires…"
                  className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
                />
              </div>

              <div>
                <div className="text-xs text-white/60">Saison</div>
                <input
                  value={product.season || ""}
                  onChange={(e) => setField("season", e.target.value || null)}
                  placeholder="2025-2026"
                  className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
                />
              </div>

              <div>
                <div className="text-xs text-white/60">Ordre</div>
                <input
                  type="number"
                  value={product.sort_order}
                  onChange={(e) => setField("sort_order", Number(e.target.value || 0))}
                  className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
                />
              </div>

              <div className="flex items-end gap-3">
                <label className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
                  <input
                    type="checkbox"
                    checked={product.is_active}
                    onChange={(e) => setField("is_active", e.target.checked)}
                  />
                  <span className="text-sm">Actif</span>
                </label>
                <label className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
                  <input
                    type="checkbox"
                    checked={product.is_preorder}
                    onChange={(e) => setField("is_preorder", e.target.checked)}
                  />
                  <span className="text-sm">Précommande</span>
                </label>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs text-white/60">Description (markdown)</div>
              <textarea
                value={product.description_md || ""}
                onChange={(e) => setField("description_md", e.target.value || null)}
                rows={7}
                placeholder="Décris le produit, guide taille, délais…"
                className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
              />
            </div>
          </div>

          {/* PRICING / RULES */}
          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <div className="text-sm font-semibold">Tarifs & règles</div>

            <div className="mt-4 grid gap-3">
              <div>
                <div className="text-xs text-white/60">Prix public</div>
                <input
                  value={(product.price_public_cents / 100).toFixed(2)}
                  onChange={(e) => {
                    const c = centsFromEuroInput(e.target.value);
                    if (c != null) setField("price_public_cents", c);
                  }}
                  className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
                />
                <div className="mt-1 text-xs text-white/50">{euro(product.price_public_cents)}</div>
              </div>

              <div>
                <div className="text-xs text-white/60">Prix famille (si connecté)</div>
                <input
                  value={product.price_family_cents != null ? (product.price_family_cents / 100).toFixed(2) : ""}
                  onChange={(e) => setField("price_family_cents", centsFromEuroInput(e.target.value))}
                  placeholder="ex: 19.90"
                  className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
                />
                <div className="mt-1 text-xs text-white/50">
                  {product.price_family_cents != null ? euro(product.price_family_cents) : "—"}
                </div>
              </div>

              <div>
                <div className="text-xs text-white/60">Coût (marge/reporting)</div>
                <input
                  value={product.cost_cents != null ? (product.cost_cents / 100).toFixed(2) : ""}
                  onChange={(e) => setField("cost_cents", centsFromEuroInput(e.target.value))}
                  placeholder="ex: 8.50"
                  className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
                />
                <div className="mt-1 text-xs text-white/50">
                  {product.cost_cents != null
                    ? `Marge estimée: ${euro(product.price_public_cents - product.cost_cents)}`
                    : "—"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-white/60">Seuil min</div>
                  <input
                    type="number"
                    value={product.min_qty}
                    onChange={(e) => setField("min_qty", Math.max(1, Number(e.target.value || 1)))}
                    className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
                  />
                </div>
                <div>
                  <div className="text-xs text-white/60">Max (optionnel)</div>
                  <input
                    type="number"
                    value={product.max_qty ?? ""}
                    onChange={(e) => setField("max_qty", numOrNull(e.target.value))}
                    className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
                  />
                </div>
              </div>

              <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">Personnalisation</div>
                    <div className="text-xs text-white/50">Option prénom par article</div>
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={product.is_personalizable}
                      onChange={(e) => setField("is_personalizable", e.target.checked)}
                    />
                    <span className="text-sm">Activer</span>
                  </label>
                </div>

                <div className="mt-3">
                  <div className="text-xs text-white/60">Libellé champ</div>
                  <input
                    value={product.personalization_label || ""}
                    onChange={(e) => setField("personalization_label", e.target.value || null)}
                    placeholder="Prénom"
                    className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
                    disabled={!product.is_personalizable}
                  />
                </div>
              </div>

              <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                <div className="text-xs text-white/60">Image hero actuelle</div>

                {heroUrl ? (
                  <div className="mt-2 overflow-hidden rounded-xl ring-1 ring-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={heroUrl} alt="Hero" className="h-44 w-full object-cover" />
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-white/60">—</div>
                )}

                <div className="mt-2 font-mono text-xs break-all text-white/70">{heroPath || "—"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* IMAGES */}
        <div className="mt-6 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Images</div>
              <div className="text-xs text-white/50">Upload + set hero + suppression</div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="text-xs text-white/60">Fichier</div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm ring-1 ring-white/10"
              />
              <div className="mt-1 text-xs text-white/50">Conseillé: jpg/webp, ~1600px large.</div>
            </div>

            <div>
              <div className="text-xs text-white/60">Ordre</div>
              <input
                type="number"
                value={uploadSort}
                onChange={(e) => setUploadSort(e.target.value)}
                className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
              />
            </div>

            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
                <input type="checkbox" checked={uploadIsHero} onChange={(e) => setUploadIsHero(e.target.checked)} />
                <span className="text-sm">Hero</span>
              </label>
            </div>

            <div className="md:col-span-3">
              <div className="text-xs text-white/60">Alt (optionnel)</div>
              <input
                value={uploadAlt}
                onChange={(e) => setUploadAlt(e.target.value)}
                placeholder="Ex: Sweat noir BlackWaves"
                className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
              />
            </div>

            <div className="md:col-span-1 flex items-end">
              <button
                onClick={uploadAndAddImage}
                disabled={uploading}
                className="w-full rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold hover:bg-indigo-600 disabled:opacity-50"
              >
                {uploading ? "Upload…" : "Ajouter"}
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {images.length === 0 && <div className="text-sm text-white/60">Aucune image.</div>}

            {images
              .slice()
              .sort((a, b) => (a.sort_order ?? 100) - (b.sort_order ?? 100))
              .map((img) => {
                const url = storagePublicUrl(img.path);
                const isHero = img.path === heroPath;

                return (
                  <div key={img.id} className="overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt={img.alt || "Image"} className="h-40 w-full object-cover" />
                    ) : (
                      <div className="flex h-40 items-center justify-center text-white/30">Image</div>
                    )}

                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs text-white/60">Path</div>
                          <div className="mt-1 break-all font-mono text-xs text-white/70">{img.path}</div>
                          <div className="mt-2 text-xs text-white/50">
                            Ordre: {img.sort_order} {isHero ? "· HERO" : ""}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteImage(img.id)}
                          className="rounded-xl bg-red-500/15 px-3 py-2 text-xs text-red-200 ring-1 ring-red-300/20 hover:bg-red-500/20"
                        >
                          Supprimer
                        </button>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => setAsHero(img)}
                          className={cn(
                            "flex-1 rounded-xl px-3 py-2 text-xs font-semibold ring-1",
                            isHero
                              ? "bg-emerald-500/15 text-emerald-200 ring-emerald-300/20"
                              : "bg-white/10 text-white/80 ring-white/10 hover:bg-white/15"
                          )}
                        >
                          {isHero ? "Hero actuel" : "Définir en hero"}
                        </button>
                      </div>

                      {img.alt && <div className="mt-2 text-xs text-white/60">Alt: {img.alt}</div>}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* VARIANTS */}
        <div className="mt-6 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Variantes</div>
              <div className="text-xs text-white/50">Tailles / couleurs / stock / seuils / prix override</div>
            </div>
          </div>

          {/* Create variant */}
          <div className="mt-4 grid gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 md:grid-cols-6">
            <div className="md:col-span-1">
              <div className="text-xs text-white/60">SKU</div>
              <input
                value={nvSku}
                onChange={(e) => setNvSku(e.target.value)}
                className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
              />
            </div>
            <div className="md:col-span-1">
              <div className="text-xs text-white/60">Taille</div>
              <input
                value={nvSize}
                onChange={(e) => setNvSize(e.target.value)}
                placeholder="M"
                className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
              />
            </div>
            <div className="md:col-span-1">
              <div className="text-xs text-white/60">Couleur</div>
              <input
                value={nvColor}
                onChange={(e) => setNvColor(e.target.value)}
                placeholder="Noir"
                className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
              />
            </div>
            <div className="md:col-span-1">
              <div className="text-xs text-white/60">Libellé</div>
              <input
                value={nvLabel}
                onChange={(e) => setNvLabel(e.target.value)}
                placeholder="M · Noir"
                className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
              />
            </div>
            <div className="md:col-span-1">
              <div className="text-xs text-white/60">Prix override (€)</div>
              <input
                value={nvPrice}
                onChange={(e) => setNvPrice(e.target.value)}
                placeholder="ex: 24.90"
                className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
              />
            </div>
            <div className="md:col-span-1 flex items-end gap-2">
              <label className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
                <input type="checkbox" checked={nvActive} onChange={(e) => setNvActive(e.target.checked)} />
                <span className="text-sm">Active</span>
              </label>
            </div>

            <div className="md:col-span-2">
              <div className="text-xs text-white/60">Stock</div>
              <input
                type="number"
                value={nvStock}
                onChange={(e) => setNvStock(e.target.value)}
                className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
              />
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-white/60">Seuil alerte</div>
              <input
                type="number"
                value={nvLow}
                onChange={(e) => setNvLow(e.target.value)}
                className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
              />
            </div>
            <div className="md:col-span-2 flex items-end">
              <button
                onClick={createVariant}
                disabled={creatingVariant}
                className="w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50"
              >
                {creatingVariant ? "Création…" : "Ajouter la variante"}
              </button>
            </div>
          </div>

          {/* Variants table */}
          <div className="mt-4 overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="bg-white/5 text-white/60">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">SKU</th>
                    <th className="px-4 py-3 text-left font-medium">Taille</th>
                    <th className="px-4 py-3 text-left font-medium">Couleur</th>
                    <th className="px-4 py-3 text-left font-medium">Libellé</th>
                    <th className="px-4 py-3 text-right font-medium">Prix override</th>
                    <th className="px-4 py-3 text-right font-medium">Stock</th>
                    <th className="px-4 py-3 text-right font-medium">Seuil</th>
                    <th className="px-4 py-3 text-center font-medium">Active</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {variants.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-white/60">
                        Aucune variante.
                      </td>
                    </tr>
                  )}

                  {variants.map((v) => {
                    const low = v.stock_qty <= v.low_stock_threshold;
                    return (
                      <tr key={v.id} className={cn("hover:bg-white/[0.04]", low && "bg-amber-500/5")}>
                        <td className="px-4 py-3">
                          <input
                            defaultValue={v.sku || ""}
                            onBlur={(e) => patchVariant(v.id, { sku: e.target.value || null } as any)}
                            className="w-full rounded-xl bg-white/10 px-2 py-1 font-mono text-xs outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            defaultValue={v.size || ""}
                            onBlur={(e) => patchVariant(v.id, { size: e.target.value || null } as any)}
                            className="w-full rounded-xl bg-white/10 px-2 py-1 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            defaultValue={v.color || ""}
                            onBlur={(e) => patchVariant(v.id, { color: e.target.value || null } as any)}
                            className="w-full rounded-xl bg-white/10 px-2 py-1 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            defaultValue={v.label || ""}
                            onBlur={(e) => patchVariant(v.id, { label: e.target.value || null } as any)}
                            className="w-full rounded-xl bg-white/10 px-2 py-1 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            defaultValue={
                              v.price_override_cents != null ? (v.price_override_cents / 100).toFixed(2) : ""
                            }
                            onBlur={(e) =>
                              patchVariant(
                                v.id,
                                { price_override_cents: centsFromEuroInput(e.target.value) } as any
                              )
                            }
                            className="w-28 rounded-xl bg-white/10 px-2 py-1 text-right text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            defaultValue={v.stock_qty}
                            onBlur={(e) =>
                              patchVariant(v.id, { stock_qty: Math.max(0, Number(e.target.value || 0)) } as any)
                            }
                            className="w-24 rounded-xl bg-white/10 px-2 py-1 text-right text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <input
                            type="number"
                            defaultValue={v.low_stock_threshold}
                            onBlur={(e) =>
                              patchVariant(
                                v.id,
                                { low_stock_threshold: Math.max(0, Number(e.target.value || 0)) } as any
                              )
                            }
                            className="w-24 rounded-xl bg-white/10 px-2 py-1 text-right text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            defaultChecked={v.is_active}
                            onChange={(e) => patchVariant(v.id, { is_active: e.target.checked } as any)}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => deleteVariant(v.id)}
                            className="rounded-xl bg-red-500/15 px-3 py-2 text-xs text-red-200 ring-1 ring-red-300/20 hover:bg-red-500/20"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 text-xs text-white/50">
              Astuce: le stock et le seuil d’alerte sont utilisés par la page <b>Stocks</b> (alertes bas).
            </div>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={saveProduct}
            disabled={saving}
            className="rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold hover:bg-indigo-600 disabled:opacity-50"
          >
            {saving ? "Sauvegarde…" : "Sauvegarder"}
          </button>

          <button onClick={load} className="rounded-xl bg-white/10 px-5 py-2.5 text-sm hover:bg-white/15">
            Rafraîchir
          </button>

          <Link
            href={`/goodies/${product.slug}`}
            className="rounded-xl bg-white/10 px-5 py-2.5 text-sm hover:bg-white/15"
            target="_blank"
          >
            Voir côté public ↗
          </Link>
        </div>
      </div>
    </div>
  );
}
