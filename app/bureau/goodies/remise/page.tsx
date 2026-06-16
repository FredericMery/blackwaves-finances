"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";

type LookupOrder = {
  id: string;
  order_number: string;
  status: string;
  buyer_name: string;
  buyer_email: string;
  total_cents: number;
  paid_at: string | null;
  delivered_at: string | null;
  goodies_pickup_points: null | { title: string; location: string | null };
  goodies_order_items: Array<{
    product_title: string;
    variant_label: string | null;
    personalization_value: string | null;
    qty: number;
  }>;
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
    case "ready":
      return "bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-400/30";
    case "delivered":
      return "bg-zinc-500/15 text-zinc-200 ring-1 ring-zinc-400/30";
    default:
      return "bg-white/10 text-white/80 ring-1 ring-white/15";
  }
}

function labelStatus(status: string) {
  switch (status) {
    case "awaiting_payment":
      return "À encaisser";
    case "paid":
      return "Payée";
    case "ready":
      return "Prête";
    case "delivered":
      return "Remise";
    default:
      return status;
  }
}

export default function BureauGoodiesPickupScanPage() {
  const [token, setToken] = useState("");
  const [order, setOrder] = useState<LookupOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyDeliver, setBusyDeliver] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const tokenTrim = useMemo(() => token.trim(), [token]);

  const canLookup = useMemo(() => {
    return !loading && tokenTrim.length > 0;
  }, [loading, tokenTrim]);

  const canDeliver = useMemo(() => {
    if (!order) return false;
    return order.status === "paid" || order.status === "ready";
  }, [order]);

  async function lookup() {
    const t = tokenTrim;
    if (!t) {
      // UX: pas une “erreur”, juste un rappel + on ne casse pas l’affichage courant
      setErr("Colle le token QR.");
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const res = await fetch(`/api/bureau/goodies/pickup/lookup?token=${encodeURIComponent(t)}`, { cache: "no-store" });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Lookup impossible");
      setOrder(j.order);
    } catch (e: any) {
      setErr(e?.message || "Erreur");
      // on garde la commande affichée si elle existait déjà (pas de setOrder(null))
    } finally {
      setLoading(false);
    }
  }

  async function pasteFromClipboard() {
    try {
      const txt = await navigator.clipboard.readText();
      const v = (txt || "").trim();
      if (!v) {
        setErr("Aucun token trouvé dans le presse-papier.");
        return;
      }
      setToken(v);
      setErr(null);
      // Auto lookup après collage
      setTimeout(() => lookup(), 0);
    } catch {
      setErr("Impossible d’accéder au presse-papier (autorisation navigateur).");
    }
  }

  async function deliver() {
    if (!order) return;

    setBusyDeliver(true);
    setErr(null);

    try {
      const res = await fetch(`/api/bureau/goodies/pickup/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.id, delivered_to: "parent", delivered_note: null }),
      });

      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Remise impossible");

      // refresh lookup (en gardant le token)
      await lookup();
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally {
      setBusyDeliver(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070B18] text-white">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-white/60">Bureau · Goodies</div>
            <h1 className="text-2xl font-bold tracking-tight">Remise (scan QR)</h1>
            <div className="mt-1 text-sm text-white/60">
              Colle le token (ou scanne plus tard) → vérifie “Payée” → valide la remise.
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/bureau/goodies" className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15">
              ← Dashboard
            </Link>
            <Link href="/bureau/goodies/commandes" className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15">
              Commandes
            </Link>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <div className="text-xs text-white/60">Token QR</div>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") lookup();
            }}
            placeholder="Colle ici le token de remise…"
            className="mt-2 w-full rounded-xl bg-white/10 px-3 py-3 text-sm outline-none ring-1 ring-white/10 focus:ring-indigo-300/40 font-mono"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />

          <div className="mt-3 flex gap-2">
            <button
              onClick={lookup}
              disabled={!canLookup}
              className="flex-1 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-medium hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
              title={!tokenTrim ? "Colle un token pour activer Lookup" : undefined}
            >
              {loading ? "Recherche…" : "Lookup"}
            </button>

            <button
              onClick={pasteFromClipboard}
              className="rounded-xl bg-white/10 px-4 py-3 text-sm hover:bg-white/15"
              title="Coller depuis le presse-papier"
            >
              Coller
            </button>

            <button
              onClick={() => {
                setToken("");
                setOrder(null);
                setErr(null);
              }}
              className="rounded-xl bg-white/10 px-4 py-3 text-sm hover:bg-white/15"
            >
              Reset
            </button>
          </div>

          {err && (
            <div className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm text-red-200 ring-1 ring-red-300/20">
              {err}
            </div>
          )}
        </div>

        {order && (
          <div className="mt-6 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm text-white/60">Commande</div>
                <div className="mt-1 text-xl font-semibold">{order.order_number}</div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ${pillClass(order.status)}`}>
                    {labelStatus(order.status)}
                  </span>
                  <span className="text-sm text-white/70">{euro(order.total_cents)}</span>
                </div>
              </div>

              <div className="text-sm text-white/70">
                <div className="font-medium">{order.buyer_name}</div>
                <div className="text-white/60">{order.buyer_email}</div>
                <div className="mt-1 text-xs text-white/50">
                  Payé: {order.paid_at ? new Date(order.paid_at).toLocaleString("fr-FR") : "Non"} · Remis:{" "}
                  {order.delivered_at ? new Date(order.delivered_at).toLocaleString("fr-FR") : "Non"}
                </div>
              </div>
            </div>

            {order.goodies_pickup_points && (
              <div className="mt-4 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                <div className="text-xs text-white/60">Point de retrait</div>
                <div className="mt-1 text-sm font-medium">{order.goodies_pickup_points.title}</div>
                {order.goodies_pickup_points.location && <div className="text-xs text-white/60">{order.goodies_pickup_points.location}</div>}
              </div>
            )}

            <div className="mt-4">
              <div className="text-sm font-semibold">Articles</div>
              <div className="mt-2 space-y-2">
                {order.goodies_order_items.map((it, idx) => (
                  <div key={idx} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{it.product_title}</div>
                      <div className="text-sm text-white/70">x{it.qty}</div>
                    </div>
                    <div className="mt-1 text-xs text-white/60">
                      {it.variant_label || "—"}
                      {it.personalization_value ? ` · Perso: ${it.personalization_value}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 md:flex-row">
              <Link
                href={`/bureau/goodies/commandes/${order.id}`}
                className="rounded-xl bg-white/10 px-4 py-3 text-center text-sm hover:bg-white/15"
              >
                Ouvrir la commande →
              </Link>

              <button
                onClick={deliver}
                disabled={!canDeliver || busyDeliver}
                className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {order.status === "delivered" ? "Déjà remise" : busyDeliver ? "Validation…" : "Valider la remise"}
              </button>
            </div>

            {!canDeliver && order.status !== "delivered" && (
              <div className="mt-3 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-200 ring-1 ring-amber-300/20">
                Cette commande n’est pas remise car elle n’est pas au statut <b>payée</b>.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
