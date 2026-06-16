"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Row = {
  id: string;
  created_at: string;
  order_number: string;
  status: string;
  buyer_name: string;
  buyer_email: string;
  total_cents: number;
  paid_at: string | null;
  delivered_at: string | null;
};

function euro(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
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

export default function BureauGoodiesOrdersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [status, setStatus] = useState<string>("");
  const [q, setQ] = useState<string>("");

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const sp = new URLSearchParams();
      if (status) sp.set("status", status);
      if (q.trim()) sp.set("q", q.trim());
      const res = await fetch(`/api/bureau/goodies/orders?${sp.toString()}`, { cache: "no-store" });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Erreur API");
      setRows(j.rows || []);
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
    const by: Record<string, number> = {};
    for (const r of rows) by[r.status] = (by[r.status] || 0) + 1;
    return by;
  }, [rows]);

  return (
    <div className="min-h-screen bg-[#070B18] text-white">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-sm text-white/60">Bureau · Goodies</div>
            <h1 className="text-2xl font-bold tracking-tight">Commandes</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {["awaiting_payment", "paid", "to_prepare", "ready", "delivered", "cancelled"].map((s) => (
                <span key={s} className={`rounded-full px-2.5 py-1 ${pillClass(s)}`}>
                  {labelStatus(s)} · {stats[s] || 0}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href="/bureau/goodies"
              className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
            >
              ← Dashboard
            </Link>
            <Link
              href="/bureau/goodies/remise"
              className="rounded-xl bg-indigo-500/20 px-4 py-2 text-sm ring-1 ring-indigo-300/30 hover:bg-indigo-500/25"
            >
              Scan remise (QR)
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="text-xs text-white/60">Statut</div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
            >
              <option value="">Tous</option>
              <option value="awaiting_payment">À encaisser</option>
              <option value="paid">Payée</option>
              <option value="to_prepare">À préparer</option>
              <option value="ready">Prête</option>
              <option value="delivered">Remise</option>
              <option value="cancelled">Annulée</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-white/60">Recherche</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="N° commande, email, nom…"
              className="mt-1 w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
            />
          </div>

          <div className="md:col-span-1 flex items-end gap-2">
            <button
              onClick={load}
              className="w-full rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium hover:bg-indigo-600"
            >
              Filtrer
            </button>
            <button
              onClick={() => {
                setStatus("");
                setQ("");
                setTimeout(load, 0);
              }}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="text-sm text-white/70">
              {loading ? "Chargement…" : `${rows.length} commande(s)`}
            </div>
            {err && <div className="text-sm text-red-300">{err}</div>}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-white/5 text-white/60">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Commande</th>
                  <th className="px-4 py-3 text-left font-medium">Client</th>
                  <th className="px-4 py-3 text-left font-medium">Statut</th>
                  <th className="px-4 py-3 text-left font-medium">Total</th>
                  <th className="px-4 py-3 text-left font-medium">Dates</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-white/60">
                      Aucune commande.
                    </td>
                  </tr>
                )}

                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.04]">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.order_number}</div>
                      <div className="text-xs text-white/50">
                        {new Date(r.created_at).toLocaleString("fr-FR")}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.buyer_name}</div>
                      <div className="text-xs text-white/60">{r.buyer_email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ${pillClass(r.status)}`}>
                        {labelStatus(r.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{euro(r.total_cents)}</td>
                    <td className="px-4 py-3 text-xs text-white/60">
                      <div>Payé: {r.paid_at ? new Date(r.paid_at).toLocaleString("fr-FR") : "—"}</div>
                      <div>Remis: {r.delivered_at ? new Date(r.delivered_at).toLocaleString("fr-FR") : "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/bureau/goodies/commandes/${r.id}`}
                        className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15"
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
            Astuce : utilise “À encaisser” pour ta file d’encaissement sur place.
          </div>
        </div>
      </div>
    </div>
  );
}
