"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type PickupPoint = { id: string; title: string; location: string | null; details: string | null; sort_order: number };
type CatalogResp = { ok: boolean; pickupPoints: PickupPoint[] };

type CartItem = { product_id: string; variant_id?: string | null; qty: number; personalization_value?: string | null };

const CART_KEY = "bw_goodies_cart_v1";

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function clearCart() {
  localStorage.setItem(CART_KEY, JSON.stringify([]));
}

export default function GoodiesCheckoutPage() {
  const router = useRouter();
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // MVP: famille connectée → à brancher plus tard à ton auth parent
  const [isFamily] = useState(false);
  const [buyerUserId] = useState<string | null>(null);

  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");

  const [pickupPointId, setPickupPointId] = useState<string>("");

  useEffect(() => {
    setCart(loadCart());
  }, []);

  const pickupPointsSorted = useMemo(() => {
    return [...pickupPoints].sort((a, b) => (a.sort_order ?? 100) - (b.sort_order ?? 100));
  }, [pickupPoints]);

  const selectedPickup = useMemo(() => {
    return pickupPointsSorted.find((x) => x.id === pickupPointId) || null;
  }, [pickupPointsSorted, pickupPointId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch("/api/public/goodies/catalog", { cache: "no-store" });
        const json: CatalogResp = await res.json();
        if (!json.ok) throw new Error("Points de retrait indisponibles");

        if (!mounted) return;

        const pp = json.pickupPoints || [];
        setPickupPoints(pp);

        // ⚠️ Initialise (ou répare) la sélection uniquement si besoin
        const sorted = [...pp].sort((a, b) => (a.sort_order ?? 100) - (b.sort_order ?? 100));
        const exists = sorted.some((x) => x.id === pickupPointId);

        if (!exists) {
          setPickupPointId(sorted[0]?.id || "");
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = useMemo(() => {
    const hasValidPickup = !!pickupPointId && pickupPointsSorted.some((p) => p.id === pickupPointId);
    return cart.length > 0 && buyerName.trim().length > 0 && buyerEmail.trim().length > 0 && hasValidPickup;
  }, [cart, buyerName, buyerEmail, pickupPointId, pickupPointsSorted]);

  async function submit() {
    if (busy) return;
    if (!canSubmit) {
      setErr("Merci de renseigner Nom, Email et de choisir un point de retrait.");
      return;
    }

    try {
      setBusy(true);
      setErr(null);

      const res = await fetch("/api/public/goodies/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer_name: buyerName.trim(),
          buyer_email: buyerEmail.trim(),
          buyer_phone: buyerPhone.trim() ? buyerPhone.trim() : null,
          pickup_point_id: pickupPointId,
          items: cart,
          is_family: isFamily,
          buyer_user_id: buyerUserId,
        }),
      });

      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Erreur checkout");

      clearCart();
      router.push(`/goodies/commande/${json.public_token}`);
    } catch (e: any) {
      setErr(e?.message || "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between">
          <Link href="/goodies/panier" className="text-sm text-white/70 hover:text-white">
            ← Panier
          </Link>
          <div className="text-sm text-white/60">Paiement sur place</div>
        </div>

        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Checkout</h1>

        {loading ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">Chargement…</div>
        ) : err ? (
          <div className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 p-6 text-rose-100">{err}</div>
        ) : cart.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
            Panier vide.{" "}
            <Link href="/goodies" className="underline">
              Retour boutique
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="text-sm font-semibold">Informations</div>

              <div className="mt-4 grid gap-3">
                <div>
                  <div className="text-xs text-white/60">Nom</div>
                  <input
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <div className="text-xs text-white/60">Email</div>
                  <input
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    type="email"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <div className="text-xs text-white/60">Téléphone (optionnel)</div>
                  <input
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none"
                  />
                </div>

                <div>
                  <div className="text-xs text-white/60">Point de retrait</div>
                  <select
                    value={pickupPointId}
                    onChange={(e) => setPickupPointId(e.target.value)}
                    disabled={pickupPointsSorted.length === 0}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pickupPointsSorted.length === 0 ? (
                      <option value="">Aucun point de retrait configuré</option>
                    ) : (
                      <>
                        <option value="" disabled>
                          Choisir un point de retrait…
                        </option>
                        {pickupPointsSorted.map((pp) => (
                          <option key={pp.id} value={pp.id}>
                            {pp.title}
                            {pp.location ? ` · ${pp.location}` : ""}
                          </option>
                        ))}
                      </>
                    )}
                  </select>

                  {selectedPickup?.details ? (
                    <div className="mt-2 text-xs text-white/60">{selectedPickup.details}</div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-5">
              <div className="text-sm font-semibold">Validation</div>
              <div className="mt-3 text-sm text-white/70">
                Après validation, tu recevras un lien de suivi. Le paiement est effectué sur place et validé au Bureau au moment du retrait.
              </div>

              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit || busy}
                className={`mt-6 w-full rounded-2xl px-5 py-3 text-sm font-semibold ${
                  !canSubmit || busy
                    ? "cursor-not-allowed bg-white/10 text-white/40"
                    : "bg-white text-slate-900 hover:bg-white/90"
                }`}
              >
                {busy ? "Validation…" : "Valider ma commande"}
              </button>

              <div className="mt-4 text-xs text-white/50">
                En validant, tu acceptes le retrait via QR code et le contrôle “payé” par le coach.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
