"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Product = {
  id: string;
  created_at: string;
  slug: string;
  title: string;
  category: string | null;
  season: string | null;
  is_active: boolean;
  is_preorder: boolean;
  is_personalizable: boolean;
  min_qty: number;
  price_public_cents: number;
  price_family_cents: number | null;
  sort_order: number;
  hero_image_path: string | null;
};

function clsx(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function euro(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function apiJson<T>(
  url: string,
  opts?: RequestInit
): Promise<T> {
  const r = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts?.headers || {}),
    },
    cache: "no-store",
  });

  const text = await r.text();
  let j: any = null;
  try {
    j = text ? JSON.parse(text) : null;
  } catch {
    // non-json
  }

  if (!r.ok) {
    const msg =
      j?.error ||
      j?.message ||
      `HTTP ${r.status} (${r.statusText})`;
    throw new Error(msg);
  }

  return j as T;
}

export default function BureauGoodiesProductsPage() {
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);

  // create
  const [openCreate, setOpenCreate] = useState(false);
  const [cTitle, setCTitle] = useState("");
  const [cCategory, setCCategory] = useState("");
  const [cSeason, setCSeason] = useState("");
  const [cPricePublic, setCPricePublic] = useState("0");
  const [cPriceFamily, setCPriceFamily] = useState("");
  const [cMinQty, setCMinQty] = useState("1");
  const [busyCreate, setBusyCreate] = useState(false);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      let query = supabase
        .from("goodies_products")
        .select(
          "id, created_at, slug, title, category, season, is_active, is_preorder, is_personalizable, min_qty, price_public_cents, price_family_cents, sort_order, hero_image_path"
        )
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (onlyActive) query = query.eq("is_active", true);

      if (q.trim()) {
        const qq = `%${q.trim()}%`;
        query = query.or(
          `title.ilike.${qq},slug.ilike.${qq},category.ilike.${qq},season.ilike.${qq}`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      setRows((data as any) || []);
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const active = rows.filter((r) => r.is_active).length;
    const preorder = rows.filter((r) => r.is_preorder).length;
    const perso = rows.filter((r) => r.is_personalizable).length;
    return { total, active, preorder, perso };
  }, [rows]);

  async function createProduct() {
    setBusyCreate(true);
    setErr(null);
    try {
      const title = cTitle.trim();
      if (!title) throw new Error("Titre requis.");

      const slugBase = slugify(title);
      if (!slugBase) throw new Error("Impossible de générer un slug.");

      // ensure unique slug (lecture ok via select, pas d'insert ici)
      let slug = slugBase;
      for (let i = 0; i < 8; i++) {
        const { data: exists } = await supabase
          .from("goodies_products")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();

        if (!exists) break;
        slug = `${slugBase}-${Math.floor(Math.random() * 900 + 100)}`;
      }

      const pricePublicCents = Math.max(
        0,
        Math.round(Number(cPricePublic || "0") * 100)
      );
      if (!isFinite(pricePublicCents) || pricePublicCents <= 0) {
        throw new Error("Prix public invalide.");
      }

      const priceFamilyCents =
        cPriceFamily.trim() === ""
          ? null
          : Math.max(0, Math.round(Number(cPriceFamily || "0") * 100));

      const minQty = Math.max(1, Math.floor(Number(cMinQty || "1")));

      // sort order at end
      const maxSort = rows.reduce(
        (m, r) => Math.max(m, r.sort_order || 0),
        0
      );
      const sort_order = maxSort + 10;

      // ✅ IMPORTANT: on passe par l'API (service role) => pas de RLS client
      const payload = {
        slug,
        title,
        category: cCategory.trim() || null,
        season: cSeason.trim() || null,
        price_public_cents: pricePublicCents,
        price_family_cents: priceFamilyCents,
        min_qty: minQty,
        sort_order,
        is_active: true,
      };

      const j = await apiJson<any>("/api/bureau/goodies/products", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // accepte plusieurs formats de réponse
      const newId =
        j?.id ||
        j?.product?.id ||
        j?.data?.id ||
        j?.product_id;

      if (!newId) {
        throw new Error(
          "Produit créé mais réponse API inattendue (id manquant)."
        );
      }

      setOpenCreate(false);
      setCTitle("");
      setCCategory("");
      setCSeason("");
      setCPricePublic("0");
      setCPriceFamily("");
      setCMinQty("1");

      await load();

      // redirect to edit
      window.location.href = `/bureau/goodies/produits/${newId}`;
    } catch (e: any) {
      setErr(e?.message || "Erreur création");
    } finally {
      setBusyCreate(false);
    }
  }

  async function toggleActive(id: string, next: boolean) {
    setErr(null);
    const prev = rows;
    setRows((rs) =>
      rs.map((r) => (r.id === id ? { ...r, is_active: next } : r))
    );

    try {
      // ✅ UPDATE via API (service role)
      await apiJson<{ ok: boolean }>("/api/bureau/goodies/products/" + id, {
        method: "PATCH",
        body: JSON.stringify({ is_active: next }),
      });
    } catch (e: any) {
      setRows(prev);
      setErr(e?.message || "Erreur mise à jour");
    }
  }

  return (
    <div className="min-h-screen bg-[#070B18] text-white">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm text-white/60">Bureau · Goodies</div>
            <h1 className="text-2xl font-bold tracking-tight">Produits</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/10">
                Total · {stats.total}
              </span>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-emerald-200 ring-1 ring-emerald-400/30">
                Actifs · {stats.active}
              </span>
              <span className="rounded-full bg-indigo-500/15 px-2.5 py-1 text-indigo-200 ring-1 ring-indigo-300/30">
                Précommande · {stats.preorder}
              </span>
              <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-amber-200 ring-1 ring-amber-300/30">
                Perso · {stats.perso}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href="/bureau/goodies"
              className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
            >
              ← Dashboard
            </Link>
            <button
              onClick={() => setOpenCreate(true)}
              className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-600"
            >
              + Nouveau produit
            </button>
          </div>
        </div>

        {err && (
          <div className="mt-4 rounded-2xl bg-red-500/10 p-4 ring-1 ring-red-300/20 text-red-200">
            {err}
          </div>
        )}

        <div className="mt-6 grid gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="text-xs text-white/60">Recherche</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Titre, slug, catégorie, saison…"
              className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
            />
          </div>
          <div className="flex items-end gap-2 md:col-span-1">
            <label className="flex w-full items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm ring-1 ring-white/10">
              <input
                type="checkbox"
                checked={onlyActive}
                onChange={(e) => setOnlyActive(e.target.checked)}
                className="h-4 w-4"
              />
              Actifs seulement
            </label>
          </div>
          <div className="flex items-end gap-2 md:col-span-1">
            <button
              onClick={load}
              className="w-full rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
            >
              Filtrer
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="text-sm text-white/70">
              {loading ? "Chargement…" : `${rows.length} produit(s)`}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="bg-white/5 text-white/60">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Produit</th>
                  <th className="px-4 py-3 text-left font-medium">Catégorie</th>
                  <th className="px-4 py-3 text-left font-medium">Saison</th>
                  <th className="px-4 py-3 text-left font-medium">Règles</th>
                  <th className="px-4 py-3 text-left font-medium">Prix</th>
                  <th className="px-4 py-3 text-left font-medium">Actif</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {!loading && rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-white/60"
                    >
                      Aucun produit.
                    </td>
                  </tr>
                )}

                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.04]">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.title}</div>
                      <div className="text-xs text-white/50">{r.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {r.category || "—"}
                    </td>
                    <td className="px-4 py-3 text-white/70">{r.season || "—"}</td>
                    <td className="px-4 py-3 text-xs text-white/70">
                      <div>Min: {r.min_qty}</div>
                      <div className="text-white/50">
                        {r.is_preorder ? "Précommande" : "Stock"}
                        {" · "}
                        {r.is_personalizable ? "Perso" : "Sans perso"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {euro(r.price_public_cents)}
                      </div>
                      <div className="text-xs text-white/60">
                        Famille:{" "}
                        {r.price_family_cents != null
                          ? euro(r.price_family_cents)
                          : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(r.id, !r.is_active)}
                        className={clsx(
                          "rounded-full px-3 py-1 text-xs ring-1 transition",
                          r.is_active
                            ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30 hover:bg-emerald-500/20"
                            : "bg-white/10 text-white/70 ring-white/10 hover:bg-white/15"
                        )}
                      >
                        {r.is_active ? "Actif" : "Inactif"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/bureau/goodies/produits/${r.id}`}
                        className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
                      >
                        Éditer →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 text-xs text-white/50">
            Conseil: garde un <b>sort_order</b> (ordre) propre pour maîtriser
            l’affichage boutique.
          </div>
        </div>

        {/* CREATE MODAL */}
        {openCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-xl rounded-2xl bg-[#0B1024] p-4 ring-1 ring-white/10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-white/60">Goodies</div>
                  <div className="text-xl font-semibold">Créer un produit</div>
                </div>
                <button
                  onClick={() => setOpenCreate(false)}
                  className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
                >
                  Fermer
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <div className="text-xs text-white/60">Titre</div>
                  <input
                    value={cTitle}
                    onChange={(e) => setCTitle(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
                    placeholder="Ex: Sweat BlackWaves"
                  />
                </div>

                <div>
                  <div className="text-xs text-white/60">Catégorie</div>
                  <input
                    value={cCategory}
                    onChange={(e) => setCCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
                    placeholder="Textile, Accessoires…"
                  />
                </div>

                <div>
                  <div className="text-xs text-white/60">Saison (optionnel)</div>
                  <input
                    value={cSeason}
                    onChange={(e) => setCSeason(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
                    placeholder="2025-2026"
                  />
                </div>

                <div>
                  <div className="text-xs text-white/60">Prix public (€)</div>
                  <input
                    value={cPricePublic}
                    onChange={(e) => setCPricePublic(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
                    placeholder="35"
                  />
                </div>

                <div>
                  <div className="text-xs text-white/60">
                    Prix famille (€) (optionnel)
                  </div>
                  <input
                    value={cPriceFamily}
                    onChange={(e) => setCPriceFamily(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
                    placeholder="32"
                  />
                </div>

                <div>
                  <div className="text-xs text-white/60">Min commande</div>
                  <input
                    value={cMinQty}
                    onChange={(e) => setCMinQty(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
                    placeholder="1"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    onClick={createProduct}
                    disabled={busyCreate}
                    className="w-full rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold hover:bg-indigo-600 disabled:opacity-50"
                  >
                    {busyCreate ? "Création…" : "Créer"}
                  </button>
                </div>
              </div>

              <div className="mt-3 text-xs text-white/50">
                Le slug est généré automatiquement (unique).
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
