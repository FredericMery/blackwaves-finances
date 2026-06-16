"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type Item = {
  id: string;
  product_title: string;
  variant_label: string | null;
  personalization_value: string | null;
  unit_price_cents: number;
  qty: number;
  line_total_cents: number;
};

type Order = {
  id: string;
  created_at: string;
  order_number: string;
  status: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  note: string | null;
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  paid_at: string | null;
  delivered_at: string | null;
  pickup_qr_token: string;
  goodies_pickup_points: null | {
    id: string;
    title: string;
    location: string | null;
    details: string | null;
  };
  goodies_order_items: Item[];
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

export default function BureauGoodiesOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [payMethod, setPayMethod] = useState<"cash" | "card" | "transfer" | "other">("card");
  const [payNote, setPayNote] = useState<string>("");

  const [busyPay, setBusyPay] = useState(false);

  async function load() {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/bureau/goodies/orders/${id}`, { cache: "no-store" });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Erreur API");
      setOrder(j.order);
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

  const totals = useMemo(() => {
    if (!order) return null;
    const items = order.goodies_order_items || [];
    const qty = items.reduce((a, b) => a + (b.qty || 0), 0);
    return { qty };
  }, [order]);

  async function markPaid() {
    if (!order) return;
    setBusyPay(true);
    setErr(null);
    try {
      const res = await fetch(`/api/bureau/goodies/orders/${order.id}/mark-paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: payMethod,
          received_at: new Date().toISOString(),
          note: payNote || null,
        }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Impossible de marquer payé");
      await load();
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally {
      setBusyPay(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070B18] text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 text-white/70">Chargement…</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#070B18] text-white">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="text-white/70">Commande introuvable.</div>
          {err && <div className="mt-2 text-red-300">{err}</div>}
          <Link href="/bureau/goodies/commandes" className="mt-6 inline-block rounded-xl bg-white/10 px-4 py-2 hover:bg-white/15">
            ← Retour
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
            <div className="text-sm text-white/60">Bureau · Goodies · Commandes</div>
            <div className="mt-1 flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{order.order_number}</h1>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ${pillClass(order.status)}`}>
                {labelStatus(order.status)}
              </span>
            </div>
            <div className="mt-2 text-xs text-white/50">
              Créée le {new Date(order.created_at).toLocaleString("fr-FR")}
            </div>
          </div>

          <div className="flex gap-2">
            <Link href="/bureau/goodies/commandes" className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15">
              ← Liste
            </Link>
            <Link href="/bureau/goodies/remise" className="rounded-xl bg-indigo-500/20 px-4 py-2 text-sm ring-1 ring-indigo-300/30 hover:bg-indigo-500/25">
              Scan remise (QR)
            </Link>
          </div>
        </div>

        {err && (
          <div className="mt-4 rounded-2xl bg-red-500/10 p-4 ring-1 ring-red-300/20 text-red-200">
            {err}
          </div>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {/* Client */}
          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <div className="text-sm font-semibold">Client</div>
            <div className="mt-2 text-sm">
              <div className="font-medium">{order.buyer_name}</div>
              <div className="text-white/70">{order.buyer_email}</div>
              {order.buyer_phone && <div className="text-white/70">{order.buyer_phone}</div>}
            </div>
            {order.note && <div className="mt-3 text-sm text-white/70">Note: {order.note}</div>}
          </div>

          {/* Retrait */}
          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <div className="text-sm font-semibold">Retrait</div>
            <div className="mt-2 text-sm text-white/80">
              {order.goodies_pickup_points ? (
                <>
                  <div className="font-medium">{order.goodies_pickup_points.title}</div>
                  {order.goodies_pickup_points.location && <div className="text-white/70">{order.goodies_pickup_points.location}</div>}
                  {order.goodies_pickup_points.details && <div className="mt-1 text-xs text-white/60">{order.goodies_pickup_points.details}</div>}
                </>
              ) : (
                <div className="text-white/60">—</div>
              )}
            </div>

            <div className="mt-4 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
              <div className="text-xs text-white/60">Token QR (remise)</div>
              <div className="mt-1 font-mono text-xs break-all text-white/80">{order.pickup_qr_token}</div>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(order.pickup_qr_token);
                }}
                className="mt-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15"
              >
                Copier
              </button>
            </div>
          </div>

          {/* Paiement */}
          <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <div className="text-sm font-semibold">Paiement</div>

            <div className="mt-2 text-sm text-white/70">
              <div>Payé: {order.paid_at ? new Date(order.paid_at).toLocaleString("fr-FR") : "Non"}</div>
              <div>Remis: {order.delivered_at ? new Date(order.delivered_at).toLocaleString("fr-FR") : "Non"}</div>
            </div>

            <div className="mt-4 grid gap-2">
              <div className="text-xs text-white/60">Méthode</div>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as any)}
                className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
                disabled={order.status === "paid" || order.status === "delivered"}
              >
                <option value="card">CB</option>
                <option value="cash">Espèces</option>
                <option value="transfer">Virement</option>
                <option value="other">Autre</option>
              </select>

              <div className="text-xs text-white/60">Commentaire (optionnel)</div>
              <input
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                placeholder="Ex: CB au club / reçu le…"
                className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40"
                disabled={order.status === "paid" || order.status === "delivered"}
              />

              <button
                onClick={markPaid}
                disabled={busyPay || order.status === "paid" || order.status === "delivered" || order.status === "cancelled"}
                className="mt-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                {order.status === "paid" || order.status === "delivered" ? "Déjà payé" : busyPay ? "Validation…" : "Marquer comme payé"}
              </button>

              <div className="text-xs text-white/50">
                Cette action crée automatiquement une <span className="text-white/80">recette</span> dans le budget réalisé.
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="mt-6 overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="text-sm font-semibold">Articles</div>
            <div className="text-xs text-white/60">{totals?.qty ?? 0} article(s)</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-white/5 text-white/60">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Produit</th>
                  <th className="px-4 py-3 text-left font-medium">Variante</th>
                  <th className="px-4 py-3 text-left font-medium">Perso</th>
                  <th className="px-4 py-3 text-right font-medium">PU</th>
                  <th className="px-4 py-3 text-right font-medium">Qté</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {order.goodies_order_items.map((it) => (
                  <tr key={it.id} className="hover:bg-white/[0.04]">
                    <td className="px-4 py-3">
                      <div className="font-medium">{it.product_title}</div>
                    </td>
                    <td className="px-4 py-3 text-white/70">{it.variant_label || "—"}</td>
                    <td className="px-4 py-3 text-white/70">{it.personalization_value || "—"}</td>
                    <td className="px-4 py-3 text-right">{euro(it.unit_price_cents)}</td>
                    <td className="px-4 py-3 text-right">{it.qty}</td>
                    <td className="px-4 py-3 text-right font-medium">{euro(it.line_total_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-2 px-4 py-4 md:grid-cols-3">
            <div className="md:col-span-2 text-xs text-white/50">
              Rappel: la remise se fait via scan QR. Statut “payé” requis.
            </div>
            <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
              <div className="flex justify-between text-sm">
                <span className="text-white/70">Sous-total</span>
                <span className="font-medium">{euro(order.subtotal_cents)}</span>
              </div>
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-white/70">Remise</span>
                <span className="font-medium">{euro(order.discount_cents)}</span>
              </div>
              <div className="mt-2 flex justify-between text-base">
                <span className="text-white/80">Total</span>
                <span className="font-semibold">{euro(order.total_cents)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={() => router.refresh()}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
          >
            Rafraîchir
          </button>
        </div>
      </div>
    </div>
  );
}
