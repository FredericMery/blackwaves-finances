"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Kpis = {
  orders_count: number;
  items_count: number;
  revenue_cents: number;      // CA encaissé (ou CA total selon ton choix serveur)
  discount_cents: number;
  cost_cents: number;         // coût d’achat total (si tu l’as)
  margin_cents: number;       // revenue - cost (si tu l’as)
  avg_basket_cents: number;
};

type ByStatus = Array<{
  status: string;
  count: number;
  total_cents: number;
}>;

type TopProduct = Array<{
  product_id: string;
  product_title: string;
  product_slug: string;
  qty: number;
  revenue_cents: number;
  margin_cents?: number | null;
}>;

type Daily = Array<{
  day: string; // YYYY-MM-DD
  orders_count: number;
  revenue_cents: number;
}>;

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function euro(cents: number | null | undefined) {
  const c = typeof cents === "number" ? cents : 0;
  return (c / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function labelStatus(status: string) {
  switch (status) {
    case "created":
      return "Créée";
    case "awaiting_payment":
      return "À encaisser";
    case "paid":
      return "Payée";
    case "to_prepare":
      return "À préparer";
    case "ready":
      return "Prête";
    case "delivered":
      return "Remise";
    case "cancelled":
      return "Annulée";
    default:
      return status;
  }
}

function pillClass(status: string) {
  switch (status) {
    case "awaiting_payment":
      return "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/30";
    case "paid":
      return "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30";
    case "to_prepare":
      return "bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/30";
    case "ready":
      return "bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-400/30";
    case "delivered":
      return "bg-zinc-500/15 text-zinc-200 ring-1 ring-zinc-400/30";
    case "cancelled":
      return "bg-red-500/15 text-red-200 ring-1 ring-red-400/30";
    default:
      return "bg-white/10 text-white/80 ring-1 ring-white/15";
  }
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * ✅ ADAPTE ICI SI BESOIN (si ton endpoint est différent)
 */
function REPORT_URL(from: string, to: string) {
  const sp = new URLSearchParams();
  sp.set("from", from);
  sp.set("to", to);
  return `/api/bureau/goodies/reporting?${sp.toString()}`;
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows || rows.length === 0) return "";

  // Build headers safely
  const headerSet = new Set<string>();
  for (const r of rows) {
    for (const k of Object.keys(r)) headerSet.add(k);
  }
  const headers = Array.from(headerSet);

  const esc = (v: unknown) => {
    const str = v == null ? "" : String(v);
    // escape if contains delimiter, quote or newline
    if (/[;\n"]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const lines: string[] = [];
  lines.push(headers.join(";"));
  for (const r of rows) {
    lines.push(headers.map((h) => esc((r as any)[h])).join(";"));
  }

  return lines.join("\n");
}


export default function BureauGoodiesReportingPage() {
  const [from, setFrom] = useState<string>(daysAgoISO(30));
  const [to, setTo] = useState<string>(todayISO());

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [byStatus, setByStatus] = useState<ByStatus>([]);
  const [topProducts, setTopProducts] = useState<TopProduct>([]);
  const [daily, setDaily] = useState<Daily>([]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(REPORT_URL(from, to), { cache: "no-store" });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Erreur reporting");
      setKpis(j.kpis || null);
      setByStatus(j.byStatus || []);
      setTopProducts(j.topProducts || []);
      setDaily(j.daily || []);
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

  const hasMargin = useMemo(() => {
    if (!kpis) return false;
    return typeof kpis.cost_cents === "number" && typeof kpis.margin_cents === "number";
  }, [kpis]);

  const avgItemsPerOrder = useMemo(() => {
    if (!kpis || !kpis.orders_count) return 0;
    return Math.round((kpis.items_count / kpis.orders_count) * 10) / 10;
  }, [kpis]);

  const exportTopCsv = () => {
    const csv = toCsv(
      topProducts.map((p) => ({
        product_title: p.product_title,
        slug: p.product_slug,
        qty: p.qty,
        revenue_eur: (p.revenue_cents / 100).toFixed(2),
        margin_eur: p.margin_cents != null ? (p.margin_cents / 100).toFixed(2) : "",
      }))
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `goodies_top_produits_${from}_au_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportDailyCsv = () => {
    const csv = toCsv(
      daily.map((d) => ({
        day: d.day,
        orders_count: d.orders_count,
        revenue_eur: (d.revenue_cents / 100).toFixed(2),
      }))
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `goodies_journalier_${from}_au_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#070B18] text-white">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-sm text-white/60">Bureau · Goodies</div>
            <h1 className="text-2xl font-bold tracking-tight">Reporting</h1>
            <div className="mt-1 text-sm text-white/60">
              Suivi CA / commandes / stocks vendus / marge (si coût renseigné) + exports CSV.
            </div>
          </div>

          <div className="flex gap-2">
            <Link href="/bureau/goodies" className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15">
              ← Dashboard
            </Link>
            <Link href="/bureau/goodies/commandes" className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15">
              Commandes
            </Link>
            <button
              onClick={load}
              className="rounded-xl bg-indigo-500/20 px-4 py-2 text-sm ring-1 ring-indigo-300/30 hover:bg-indigo-500/25"
            >
              Rafraîchir
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 grid gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 md:grid-cols-6">
          <div className="md:col-span-2">
            <div className="text-xs text-white/60">Du</div>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
            />
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-white/60">Au</div>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
            />
          </div>
          <div className="md:col-span-2 flex items-end gap-2">
            <button
              onClick={load}
              className="w-full rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold hover:bg-indigo-600"
            >
              Appliquer
            </button>
            <button
              onClick={() => {
                setFrom(daysAgoISO(30));
                setTo(todayISO());
                setTimeout(load, 0);
              }}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
            >
              Reset
            </button>
          </div>
        </div>

        {err && (
          <div className="mt-4 rounded-2xl bg-red-500/10 p-4 text-red-200 ring-1 ring-red-300/20">
            {err}
          </div>
        )}

        {/* KPI Cards */}
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <div className="text-xs text-white/60">Commandes</div>
            <div className="mt-2 text-2xl font-bold">{loading ? "—" : kpis?.orders_count ?? 0}</div>
            <div className="mt-1 text-xs text-white/50">Période {from} → {to}</div>
          </div>

          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <div className="text-xs text-white/60">Articles vendus</div>
            <div className="mt-2 text-2xl font-bold">{loading ? "—" : kpis?.items_count ?? 0}</div>
            <div className="mt-1 text-xs text-white/50">Moyenne: {loading ? "—" : avgItemsPerOrder} / commande</div>
          </div>

          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <div className="text-xs text-white/60">Chiffre d’affaires</div>
            <div className="mt-2 text-2xl font-bold">{loading ? "—" : euro(kpis?.revenue_cents)}</div>
            <div className="mt-1 text-xs text-white/50">
              Remises: {loading ? "—" : euro(kpis?.discount_cents)}
            </div>
          </div>

          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <div className="text-xs text-white/60">Panier moyen</div>
            <div className="mt-2 text-2xl font-bold">{loading ? "—" : euro(kpis?.avg_basket_cents)}</div>
            <div className="mt-1 text-xs text-white/50">
              {hasMargin ? `Marge: ${euro(kpis?.margin_cents)}` : "Marge: — (coût non renseigné)"}
            </div>
          </div>
        </div>

        {/* By status */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">Répartition par statut</div>
                <div className="text-xs text-white/50">Volume + total</div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {loading && <div className="text-white/60 text-sm">Chargement…</div>}

              {!loading && byStatus.length === 0 && (
                <div className="text-white/60 text-sm">Aucune donnée.</div>
              )}

              {byStatus.map((s) => (
                <div key={s.status} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={cn("rounded-full px-2.5 py-1 text-xs", pillClass(s.status))}>
                        {labelStatus(s.status)}
                      </span>
                      <span className="text-sm text-white/70">{s.count} commande(s)</span>
                    </div>
                    <div className="text-sm font-semibold">{euro(s.total_cents)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily */}
          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">Journalier</div>
                <div className="text-xs text-white/50">CA et commandes par jour</div>
              </div>
              <button
                onClick={exportDailyCsv}
                className="rounded-xl bg-white/10 px-3 py-2 text-xs hover:bg-white/15"
                disabled={!daily.length}
              >
                Export CSV
              </button>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="bg-white/5 text-white/60">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Jour</th>
                      <th className="px-4 py-3 text-right font-medium">Commandes</th>
                      <th className="px-4 py-3 text-right font-medium">CA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {!loading && daily.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-white/60">
                          Aucune donnée.
                        </td>
                      </tr>
                    )}

                    {daily.map((d) => (
                      <tr key={d.day} className="hover:bg-white/[0.04]">
                        <td className="px-4 py-3">{d.day}</td>
                        <td className="px-4 py-3 text-right">{d.orders_count}</td>
                        <td className="px-4 py-3 text-right font-medium">{euro(d.revenue_cents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-3 text-xs text-white/50">
              Si tu veux un graphe plus tard, on le fera (bar chart CA/jour).
            </div>
          </div>
        </div>

        {/* Top products */}
        <div className="mt-6 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="text-sm font-semibold">Top produits</div>
              <div className="text-xs text-white/50">Quantités + CA (+ marge si dispo)</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportTopCsv}
                className="rounded-xl bg-white/10 px-3 py-2 text-xs hover:bg-white/15"
                disabled={!topProducts.length}
              >
                Export CSV
              </button>
              <Link
                href="/bureau/goodies/produits"
                className="rounded-xl bg-indigo-500/20 px-3 py-2 text-xs ring-1 ring-indigo-300/30 hover:bg-indigo-500/25"
              >
                Gérer produits →
              </Link>
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-white/5 text-white/60">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Produit</th>
                    <th className="px-4 py-3 text-right font-medium">Qté</th>
                    <th className="px-4 py-3 text-right font-medium">CA</th>
                    <th className="px-4 py-3 text-right font-medium">Marge</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {!loading && topProducts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-white/60">
                        Aucune donnée.
                      </td>
                    </tr>
                  )}

                  {topProducts.map((p) => (
                    <tr key={p.product_id} className="hover:bg-white/[0.04]">
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.product_title}</div>
                        <div className="mt-1 text-xs text-white/60 font-mono">{p.product_slug}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{p.qty}</td>
                      <td className="px-4 py-3 text-right font-semibold">{euro(p.revenue_cents)}</td>
                      <td className="px-4 py-3 text-right">
                        {p.margin_cents != null ? (
                          <span className="font-semibold">{euro(p.margin_cents)}</span>
                        ) : (
                          <span className="text-white/50">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/bureau/goodies/produits/${p.product_id}`}
                          className="rounded-xl bg-white/10 px-3 py-2 text-xs hover:bg-white/15"
                        >
                          Ouvrir →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 text-xs text-white/50">
              Note : la marge nécessite les champs coût côté produits (et/ou lignes) pour être calculée correctement.
            </div>
          </div>
        </div>

        {/* Footer hint */}
        <div className="mt-6 text-xs text-white/50">
          Rappel : l’encaissement “sur place” validé dans le back-office alimente automatiquement le réalisé du budget (via budget_lignes).
        </div>
      </div>
    </div>
  );
}
