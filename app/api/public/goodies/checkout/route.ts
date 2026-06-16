import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import crypto from "crypto";

type ItemIn = { product_id: string; variant_id?: string; qty: number; personalization_value?: string | null };

export async function POST(req: Request) {
  const body = await req.json();

  const buyer_name = String(body.buyer_name || "").trim();
  const buyer_email = String(body.buyer_email || "").trim().toLowerCase();
  const buyer_phone = body.buyer_phone ? String(body.buyer_phone).trim() : null;
  const pickup_point_id = body.pickup_point_id ? String(body.pickup_point_id) : null;

  const is_family = Boolean(body.is_family);
  const buyer_user_id = body.buyer_user_id ? String(body.buyer_user_id) : null;

  const athlete_id = body.athlete_id ? String(body.athlete_id) : null;
  const athlete_label = body.athlete_label ? String(body.athlete_label) : null;

  const items: ItemIn[] = Array.isArray(body.items) ? body.items : [];
  if (!buyer_name || !buyer_email || items.length === 0) {
    return NextResponse.json({ ok: false, error: "Champs manquants." }, { status: 400 });
  }

  // 1) Load products + variants for pricing & rules
  const productIds = [...new Set(items.map(i => i.product_id))];

  const { data: products, error: eP } = await supabaseAdmin
    .from("goodies_products")
    .select("id, title, min_qty, max_qty, is_active, is_preorder, is_personalizable, personalization_label, price_public_cents, price_family_cents")
    .in("id", productIds);

  if (eP) return NextResponse.json({ ok: false, error: eP.message }, { status: 500 });

  const productById = new Map(products?.map(p => [p.id, p]) || []);
  for (const pid of productIds) {
    const p = productById.get(pid);
    if (!p || !p.is_active) return NextResponse.json({ ok: false, error: "Produit indisponible." }, { status: 400 });
  }

  // Load variants for all variant_ids
  const variantIds = items.map(i => i.variant_id).filter(Boolean) as string[];
  let variants: any[] = [];
  if (variantIds.length) {
    const { data: v, error: eV } = await supabaseAdmin
      .from("goodies_variants")
      .select("id, product_id, size, color, label, price_override_cents, stock_qty, is_active")
      .in("id", variantIds);

    if (eV) return NextResponse.json({ ok: false, error: eV.message }, { status: 500 });
    variants = v || [];
  }
  const variantById = new Map(variants.map(v => [v.id, v]));

  // 2) Validate quantities / min thresholds per product
  const qtyPerProduct = new Map<string, number>();
  for (const it of items) qtyPerProduct.set(it.product_id, (qtyPerProduct.get(it.product_id) || 0) + Number(it.qty || 0));
  for (const [pid, q] of qtyPerProduct.entries()) {
    const p = productById.get(pid);
    if (!p) continue;
    if (q < p.min_qty) return NextResponse.json({ ok: false, error: `Seuil minimum non atteint pour ${p.title}.` }, { status: 400 });
    if (p.max_qty && q > p.max_qty) return NextResponse.json({ ok: false, error: `Quantité maximum dépassée pour ${p.title}.` }, { status: 400 });
  }

  // 3) Compute pricing + check personalization rules
  const orderItems: any[] = [];
  let subtotal = 0;

  for (const it of items) {
    const p = productById.get(it.product_id);
    if (!p) continue;

    let variantLabel: string | null = null;
    let unit = is_family && p.price_family_cents ? p.price_family_cents : p.price_public_cents;

    if (it.variant_id) {
      const v = variantById.get(it.variant_id);
      if (!v || !v.is_active) return NextResponse.json({ ok: false, error: "Variante indisponible." }, { status: 400 });
      if (v.product_id !== it.product_id) return NextResponse.json({ ok: false, error: "Variante incohérente." }, { status: 400 });
      if (v.price_override_cents != null) unit = v.price_override_cents;
      const parts = [v.size, v.color].filter(Boolean);
      variantLabel = parts.length ? parts.join(" · ") : (v.label || null);
    }

    const personalization = it.personalization_value ? String(it.personalization_value).trim() : null;
    if (personalization && !p.is_personalizable) {
      return NextResponse.json({ ok: false, error: "Personnalisation non autorisée pour ce produit." }, { status: 400 });
    }

    const qty = Math.max(1, Number(it.qty || 1));
    const line = unit * qty;
    subtotal += line;

    orderItems.push({
      product_id: it.product_id,
      variant_id: it.variant_id || null,
      product_title: p.title,
      variant_label: variantLabel,
      personalization_value: personalization,
      unit_price_cents: unit,
      qty,
      line_total_cents: line,
    });
  }

  const discount = 0; // pour MVP: prix famille = prix direct, pas une remise affichée
  const total = subtotal - discount;

  // 4) Create order + items + reserve stock (transaction-ish)
  const public_token = crypto.randomBytes(18).toString("hex");
  const pickup_qr_token = crypto.randomBytes(18).toString("hex");

  const { data: orderNumberRow, error: eN } = await supabaseAdmin.rpc("goodies_next_order_number");
  if (eN) return NextResponse.json({ ok: false, error: eN.message }, { status: 500 });
  const order_number = orderNumberRow as unknown as string;

  const { data: order, error: eO } = await supabaseAdmin
    .from("goodies_orders")
    .insert({
      order_number,
      status: "awaiting_payment",
      buyer_name, buyer_email, buyer_phone,
      buyer_user_id,
      is_family,
      athlete_id,
      athlete_label,
      pickup_point_id,
      subtotal_cents: subtotal,
      discount_cents: discount,
      total_cents: total,
      public_token,
      pickup_qr_token,
    })
    .select("id, order_number, public_token")
    .single();

  if (eO) return NextResponse.json({ ok: false, error: eO.message }, { status: 500 });

  const order_id = order.id;

  const { error: eI } = await supabaseAdmin
    .from("goodies_order_items")
    .insert(orderItems.map(oi => ({ ...oi, order_id })));

  if (eI) return NextResponse.json({ ok: false, error: eI.message }, { status: 500 });

  // Reserve stock for non-preorder products (decrement variants)
  // Note: si pas de variant_id (produit sans variantes), on ne décrémente pas ici (à définir plus tard)
  for (const it of orderItems) {
    if (!it.variant_id) continue;
    // fetch product preorder flag
    const p = productById.get(it.product_id);
    if (p?.is_preorder) continue;

    const v = variantById.get(it.variant_id);
    if (v && v.stock_qty < it.qty) {
      // rollback basic
      await supabaseAdmin.from("goodies_orders").delete().eq("id", order_id);
      return NextResponse.json({ ok: false, error: `Stock insuffisant pour ${it.product_title}.` }, { status: 400 });
    }

    await supabaseAdmin
      .from("goodies_variants")
      .update({ stock_qty: (v.stock_qty - it.qty) })
      .eq("id", it.variant_id);

    await supabaseAdmin
      .from("goodies_stock_movements")
      .insert({
        variant_id: it.variant_id,
        order_id,
        type: "reserve",
        qty_delta: -it.qty,
        reason: "Réservation commande",
      });
  }

  // TODO email confirmation + QR (Resend)
  return NextResponse.json({ ok: true, order_number, public_token: order.public_token });
}
