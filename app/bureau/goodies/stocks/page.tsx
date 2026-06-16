"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type StockRow = {
  product_id: string;
  product_title: string;
  product_slug: string;
  product_is_active: boolean;

  variant_id: string;
  variant_label: string | null;
  sku: string | null;
  size: string | null;
  color: string | null;
  variant_is_active: boolean;

  stock_qty: number;
  low_stock_threshold: number;

  // optionnel si tu l’as dans ta vue/API
  season?: string | null;
  category?: string | null;
};

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const LIST_URL = `/api/bureau/goodies/stocks`; // ✅ adapte si besoin

export default function BureauGoodiesStocksPage() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [onlyLow, setOnlyLow] = useState(true);
  const [onlyActive, setOnlyActive] = useState(true);
  const [sort, setSort] = useState<"lowFirst" | "product" | "stockAsc" | "stockDesc">("lowFirst");

  async function load() {
    setLoading(true);
    setErr(null);
    setOkMsg(null);
    try {
      const res = await fetch(LIST_URL, { cache: "no-store" });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Erreur chargement stocks");
      setRows(j.rows || []);
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const total = rows.length;
    const low = rows.filter((r) => r.stock_qty <= r.low_stock_threshold).length;
    const oos = rows.filter((r) => r.stock_qty <= 0).length;
    return { total, low, oos };
  }, [rows]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    let r = rows.slice();

    if (onlyActive) {
      r = r.filter((x) => x.product_is_active && x.variant_is_active);
    }

    if (onlyLow) {
      r = r.filter((x) => x.stock_qty <= x.low_stock_threshold);
    }

    if (qq) {
      r = r.filter((x) => {
        const hay = [
          x.product_title,
          x.product_slug,
          x.variant_label || "",
          x.sku || "",
          x.size || "",
          x.color || "",
          x.category || "",
          x.season || "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(qq);
      });
    }

    const cmp = (a: number, b: number) => (a < b ? -1 : a > b ? 1 : 0);

    if (sort === "product") {
      r.sort((a, b) => {
        const t = a.product_title.localeCompare(b.product_title, "fr");
        if (t !== 0) return t;
        return (a.variant_label || "").localeCompare(b.variant_label || "", "fr");
      });
    } else if (sort === "stockAsc") {
      r.sort((a, b) => cmp(a.stock_qty, b.stock_qty));
    } else if (sort === "stockDesc") {
      r.sort((a, b) => cmp(b.stock_qty, a.stock_qty));
    } else {
      // lowFirst: prioritize out-of-stock, then low, then rest
      r.sort((a, b) => {
        const aOos = a.stock_qty <= 0 ? 1 : 0;
        const bOos = b.stock_qty <= 0 ? 1 : 0;
        if (aOos !== bOos) return bOos - aOos;

        const aLow = a.stock_qty <= a.low_stock_threshold ? 1 : 0;
        const bLow = b.stock_qty <= b.low_stock_threshold ? 1 : 0;
        if (aLow !== bLow) return bLow - aLow;

        // smaller stock first
        const s = cmp(a.stock_qty, b.stock_qty);
        if (s !== 0) return s;

        return a.product_title.localeCompare(b.product_title, "fr");
      });
    }

    return r;
  }, [rows, q, onlyLow, onlyActive, sort]);

  async function patchVariant(variantId: string, patch: any) {
    setBusyId(variantId);
    setErr(null);
    setOkMsg(null);
    try {
      const res = await fetch(`/api/bureau/goodies/variants/${variantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Update impossible");
      setOkMsg("Mis à jour.");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally {
      setBusyId(null);
      setTimeout(() => setOkMsg(null), 1500);
    }
  }

  return (
    <div className="min-h-screen bg-[#070B18] text-white">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm text-white/60">Bureau · Goodies</div>
            <h1 className="text-2xl font-bold tracking-tight">Stocks</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/10">
                Total variantes · {stats.total}
              </span>
              <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-amber-200 ring-1 ring-amber-400/30">
                Sous seuil · {stats.low}
              </span>
              <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-red-200 ring-1 ring-red-400/30">
                Rupture · {stats.oos}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Link href="/bureau/goodies" className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15">
              ← Dashboard
            </Link>
            <Link href="/bureau/goodies/produits" className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15">
              Produits
            </Link>
            <button
              onClick={load}
              className="rounded-xl bg-indigo-500/20 px-4 py-2 text-sm ring-1 ring-indigo-300/30 hover:bg-indigo-500/25"
            >
              Rafraîchir
            </button>
          </div>
        </div>

        {(err || okMsg) && (
          <div
            className={cn(
              "mt-4 rounded-2xl p-4 ring-1",
              err ? "bg-red-500/10 text-red-200 ring-red-300/20" : "bg-emerald-500/10 text-emerald-200 ring-emerald-300/20"
            )}
          >
            {err || okMsg}
          </div>
        )}

        <div className="mt-6 grid gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 md:grid-cols-6">
          <div className="md:col-span-3">
            <div className="text-xs text-white/60">Recherche</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Produit, slug, SKU, taille, couleur…"
              className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
            />
          </div>

          <div className="md:col-span-1 flex items-end gap-2">
            <label className="flex w-full items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
              <span className="text-sm">Sous seuil</span>
              <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} />
            </label>
          </div>

          <div className="md:col-span-1 flex items-end gap-2">
            <label className="flex w-full items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
              <span className="text-sm">Actifs</span>
              <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />
            </label>
          </div>

          <div className="md:col-span-1">
            <div className="text-xs text-white/60">Tri</div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
            >
              <option value="lowFirst">Alertes d’abord</option>
              <option value="product">Produit</option>
              <option value="stockAsc">Stock ↑</option>
              <option value="stockDesc">Stock ↓</option>
            </select>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="text-sm text-white/70">
              {loading ? "Chargement…" : `${filtered.length} variante(s) affichée(s)`}
            </div>
            <div className="text-xs text-white/50">Edition rapide: stock, seuil, active</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm">
              <thead className="bg-white/5 text-white/60">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Produit</th>
                  <th className="px-4 py-3 text-left font-medium">Variante</th>
                  <th className="px-4 py-3 text-left font-medium">SKU</th>
                  <th className="px-4 py-3 text-right font-medium">Stock</th>
                  <th className="px-4 py-3 text-right font-medium">Seuil</th>
                  <th className="px-4 py-3 text-center font-medium">Actif</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-white/60">
                      Aucun résultat.
                    </td>
                  </tr>
                )}

                {filtered.map((r) => {
                  const low = r.stock_qty <= r.low_stock_threshold;
                  const oos = r.stock_qty <= 0;

                  return (
                    <tr key={r.variant_id} className={cn("hover:bg-white/[0.04]", oos && "bg-red-500/5", !oos && low && "bg-amber-500/5")}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.product_title}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/60">
                          <span className="font-mono">{r.product_slug}</span>
                          {!r.product_is_active && (
                            <span className="rounded-full bg-white/10 px-2 py-0.5 ring-1 ring-white/10">Produit inactif</span>
                          )}
                          {r.category && <span className="rounded-full bg-white/10 px-2 py-0.5 ring-1 ring-white/10">{r.category}</span>}
                          {r.season && <span className="rounded-full bg-white/10 px-2 py-0.5 ring-1 ring-white/10">{r.season}</span>}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-white/80">
                        <div className="font-medium">{r.variant_label || "—"}</div>
                        <div className="mt-1 text-xs text-white/60">
                          {[r.size, r.color].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-white/70">{r.sku || "—"}</div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          defaultValue={r.stock_qty}
                          onBlur={(e) => patchVariant(r.variant_id, { stock_qty: Math.max(0, Number(e.target.value || 0)) })}
                          className={cn(
                            "w-24 rounded-xl px-2 py-1 text-right text-sm outline-none ring-1 focus:ring-indigo-300/40",
                            "bg-white/10 ring-white/10",
                            oos && "ring-red-300/30",
                            !oos && low && "ring-amber-300/30"
                          )}
                          disabled={busyId === r.variant_id}
                        />
                        <div className={cn("mt-1 text-xs", oos ? "text-red-200" : low ? "text-amber-200" : "text-white/50")}>
                          {oos ? "Rupture" : low ? "Sous seuil" : "OK"}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          defaultValue={r.low_stock_threshold}
                          onBlur={(e) => patchVariant(r.variant_id, { low_stock_threshold: Math.max(0, Number(e.target.value || 0)) })}
                          className="w-24 rounded-xl bg-white/10 px-2 py-1 text-right text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
                          disabled={busyId === r.variant_id}
                        />
                      </td>

                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          defaultChecked={r.variant_is_active}
                          onChange={(e) => patchVariant(r.variant_id, { is_active: e.target.checked })}
                          disabled={busyId === r.variant_id}
                        />
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => patchVariant(r.variant_id, { stock_qty: 0 })}
                            className="rounded-xl bg-white/10 px-3 py-2 text-xs hover:bg-white/15"
                            disabled={busyId === r.variant_id}
                          >
                            Mettre à 0
                          </button>
                          <Link
                            href={`/bureau/goodies/produits/${r.product_id}`}
                            className="rounded-xl bg-indigo-500/20 px-3 py-2 text-xs ring-1 ring-indigo-300/30 hover:bg-indigo-500/25"
                          >
                            Ouvrir produit →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 text-xs text-white/50">
            Règle: <b>stock_qty ≤ low_stock_threshold</b> → alerte. <b>stock_qty = 0</b> → rupture.
          </div>
        </div>
      </div>
    </div>
  );
}
