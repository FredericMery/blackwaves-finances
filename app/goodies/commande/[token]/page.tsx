"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type OrderItem = {
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
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  paid_at: string | null;
  delivered_at: string | null;
  goodies_pickup_points: { title: string; location: string | null; details: string | null } | null;
  goodies_order_items: OrderItem[];
};

function eur(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",") + " €";
}

function statusLabel(s: string) {
  switch (s) {
    case "awaiting_payment":
      return { label: "En attente de paiement", cls: "bg-amber-100 text-amber-900 border-amber-200" };
    case "paid":
      return { label: "Payée", cls: "bg-emerald-100 text-emerald-900 border-emerald-200" };
    case "ready":
      return { label: "Prête", cls: "bg-indigo-100 text-indigo-900 border-indigo-200" };
    case "delivered":
      return { label: "Remise", cls: "bg-slate-100 text-slate-900 border-slate-200" };
    case "cancelled":
      return { label: "Annulée", cls: "bg-rose-100 text-rose-900 border-rose-200" };
    default:
      return { label: s, cls: "bg-white/10 text-white border-white/10" };
  }
}

export default function GoodiesOrderTrackingPage() {
  const params = useParams();
  const token = String(params.token || "");

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch(`/api/public/goodies/order?token=${encodeURIComponent(token)}`, { cache: "no-store" });
        const json = await res.json();
        if (!json.ok) throw new Error(json.error || "Commande introuvable");
        if (!mounted) return;
        setOrder(json.order);
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message || "Erreur");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between">
          <Link href="/goodies" className="text-sm text-white/70 hover:text-white">← Boutique</Link>
          <Link href="/goodies/panier" className="text-sm text-white/70 hover:text-white">Panier</Link>
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Suivi de commande</h1>

        {loading ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">Chargement…</div>
        ) : err || !order ? (
          <div className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-6 text-rose-100">{err || "Introuvable"}</div>
        ) : (
          <div className="mt-6 grid gap-6">
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xs text-white/60">Commande</div>
                  <div className="text-2xl font-semibold">{order.order_number}</div>
                  <div className="mt-1 text-sm text-white/60">{order.buyer_name} · {order.buyer_email}</div>
                </div>

                <div className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-sm font-semibold ${statusLabel(order.status).cls}`}>
                  {statusLabel(order.status).label}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                <div className="font-semibold text-white">Retrait</div>
                <div className="mt-1">
                  {order.goodies_pickup_points ? (
                    <>
                      <div>{order.goodies_pickup_points.title}{order.goodies_pickup_points.location ? ` · ${order.goodies_pickup_points.location}` : ""}</div>
                      {order.goodies_pickup_points.details ? <div className="mt-1 text-white/60">{order.goodies_pickup_points.details}</div> : null}
                    </>
                  ) : (
                    <div className="text-white/60">Point de retrait à confirmer.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm font-semibold">Articles</div>
              <div className="mt-4 space-y-3">
                {(order.goodies_order_items || []).map((it) => (
                  <div key={it.id} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold">{it.product_title}</div>
                        {it.variant_label ? <div className="text-sm text-white/60">{it.variant_label}</div> : null}
                        {it.personalization_value ? <div className="text-sm text-white/60">Prénom : {it.personalization_value}</div> : null}
                        <div className="mt-1 text-sm text-white/70">Qté : {it.qty}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-white/60">{eur(it.unit_price_cents)} / unité</div>
                        <div className="mt-1 font-semibold">{eur(it.line_total_cents)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <div className="text-sm text-white/60">Total</div>
                <div className="text-xl font-semibold">{eur(order.total_cents)}</div>
              </div>

              <div className="mt-3 text-sm text-white/60">
                Paiement sur place. Le coach scanne votre QR code au retrait et valide la remise après paiement.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
