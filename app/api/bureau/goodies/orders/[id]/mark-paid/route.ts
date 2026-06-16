import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

type Ctx = { params: Promise<{ id: string }> };

function asIsoOrNow(v?: string | null) {
  const d = v ? new Date(v) : new Date();
  if (isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

// Saison sportive : août N → juillet N+1
function seasonFromDateIso(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = d.getMonth() + 1; // 1..12
  const start = m >= 8 ? y : y - 1;
  const end = start + 1;
  return `${start}-${end}`;
}

function safeDateYYYYMMDD(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const method = String(body?.method || "").trim(); // "cash"|"card"|"transfer"|"other"
  const receivedAt = asIsoOrNow(body?.received_at);
  const payNote = String(body?.note || "").trim();

  const computedSeason = seasonFromDateIso(receivedAt);

  // 1) Charge la commande
  const { data: order, error: e1 } = await supabaseAdmin
    .from("goodies_orders")
    .select("id, status, order_number, buyer_name, total_cents, season, note, paid_at")
    .eq("id", id)
    .maybeSingle();

  if (e1) return NextResponse.json({ ok: false, error: `Supabase goodies_orders.select: ${e1.message}` }, { status: 500 });
  if (!order) return NextResponse.json({ ok: false, error: "Commande introuvable" }, { status: 404 });

  if (order.status === "cancelled") {
    return NextResponse.json({ ok: false, error: "Commande annulée : encaissement impossible." }, { status: 400 });
  }

  // ✅ VERROU 1 : déjà payée/remise → pas de double action
  if (order.status === "paid" || order.status === "delivered") {
    return NextResponse.json({ ok: true, skipped: true, reason: "already_paid" });
  }

  const methodLabel =
    method === "card" ? "CB" : method === "cash" ? "Espèces" : method === "transfer" ? "Virement" : method ? method : "—";

  // Note “métier” sur la commande (conserve ton comportement actuel)
  const appended = [`Paiement: ${methodLabel}`, payNote ? `Note: ${payNote}` : ""].filter(Boolean).join(" · ");
  const newNote = order.note ? `${order.note}\n${appended}` : appended;

  // 2) Update commande
  const { error: e2 } = await supabaseAdmin
    .from("goodies_orders")
    .update({
      status: "paid",
      paid_at: receivedAt,
      note: newNote || null,
      season: order.season ?? computedSeason, // ✅ backfill saison
    })
    .eq("id", order.id)
    .neq("status", "paid")
    .neq("status", "delivered");

  if (e2) return NextResponse.json({ ok: false, error: `Supabase goodies_orders.update: ${e2.message}` }, { status: 500 });

  // 3) Budget — agrégation par Catégorie + Poste
  const BUDGET_CATEGORIE = "Boutique & Merchandising";
  const POSTE_LABEL = "Vente goodies";

  const montant = Number(((order.total_cents || 0) / 100).toFixed(2));
  const dateStr = safeDateYYYYMMDD(receivedAt);

  // ✅ Poste stable pour le comparatif
  const designation = POSTE_LABEL;

  // ✅ Tag unique anti-doublon + trace demandée
  const uniqTag = `goodies_order=${order.id}`;
  const traceCore = `Cmd=${order.order_number} · Client=${order.buyer_name || "?"} · Paiement=${methodLabel}`;
  const trace = `${uniqTag} · ${traceCore}`.trim();

  // ✅ VERROU 2 : si déjà une ligne budget pour CETTE commande → on n'insère pas
  const { data: existing, error: eCheck } = await supabaseAdmin
    .from("budget_lignes")
    .select("id")
    .eq("type", "recette")
    .eq("categorie", BUDGET_CATEGORIE)
    .ilike("commentaire", `%${uniqTag}%`)
    .limit(1);

  if (eCheck) {
    return NextResponse.json({
      ok: true,
      warning: `Encaissement OK, mais check anti-doublon budget_lignes KO: ${eCheck.message}`,
    });
  }

  if (existing && existing.length > 0) {
    return NextResponse.json({ ok: true, skipped_budget: true, reason: "budget_already_exists" });
  }

  const { error: e3 } = await supabaseAdmin.from("budget_lignes").insert({
    saison: order.season ?? computedSeason,
    date: dateStr,
    type: "recette",
    montant,
    designation, // ✅ "Vente goodies" (poste)
    categorie: BUDGET_CATEGORIE, // ✅ "Boutique & Merchandising" (catégorie)
    commentaire: trace || null, // ✅ trace + anti-doublon
    facture_url: null,
    previsionnel_id: null,
  });

  if (e3) {
    return NextResponse.json({
      ok: true,
      warning: `Encaissement OK, mais insertion budget_lignes KO: ${e3.message}`,
    });
  }

  return NextResponse.json({ ok: true });
}
