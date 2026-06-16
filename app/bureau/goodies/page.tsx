"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

function eur(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

type OrderRow = {
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

export default function BureauGoodiesDashboard() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const res = await fetch("/api/bureau/goodies/orders", { cache: "no-store" });
      const json = await res.json();
      if (mounted) {
        setRows(json.ok ? (json.rows || []) : []);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const kpi = useMemo(() => {
    const total = rows.reduce((s, r) => s + (r.total_cents || 0), 0);
    const awaiting = rows.filter((r) => r.status === "awaiting_payment").length;
    const paid = rows.filter((r) => r.status === "paid").length;
    const delivered = rows.filter((r) => r.status === "delivered").length;
    return { total, awaiting, paid, delivered };
  }, [rows]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-white/60">Bureau</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Goodies</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/bureau/goodies/commandes" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-white/90">
              Commandes
            </Link>
            <Link href="/bureau/goodies/remise" className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10">
              Scan QR (remise)
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs text-white/60">CA (toutes commandes)</div>
            <div className="mt-2 text-2xl font-semibold">{eur(kpi.total)}</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs text-white/60">À encaisser</div>
            <div className="mt-2 text-2xl font-semibold">{kpi.awaiting}</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs text-white/60">Payées</div>
            <div className="mt-2 text-2xl font-semibold">{kpi.paid}</div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="text-xs text-white/60">Remises</div>
            <div className="mt-2 text-2xl font-semibold">{kpi.delivered}</div>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Dernières commandes</div>
            <Link href="/bureau/goodies/commandes" className="text-sm text-white/70 hover:text-white">Voir tout →</Link>
          </div>

          {loading ? (
            <div className="mt-4 text-white/60">Chargement…</div>
          ) : (
            <div className="mt-4 space-y-2">
              {rows.slice(0, 6).map((r) => (
                <Link key={r.id} href={`/bureau/goodies/commandes/${r.id}`} className="block rounded-2xl border border-white/10 bg-slate-950/30 p-4 hover:border-white/20">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold">{r.order_number}</div>
                      <div className="text-sm text-white/60">{r.buyer_name} · {r.buyer_email}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{eur(r.total_cents)}</div>
                      <div className="text-xs text-white/50">{r.status}</div>
                    </div>
                  </div>
                </Link>
              ))}
              {!rows.length ? <div className="text-white/60">Aucune commande.</div> : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
