import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { getNextSeasonLabel, isReinscriptionOpen } from "@/lib/season";

function uniqEmails(rows: any[]) {
  const set = new Set<string>();
  for (const r of rows || []) {
    const e = String(r.email_parent || "").trim().toLowerCase();
    if (e) set.add(e);
  }
  return Array.from(set);
}

export async function POST(req: Request) {
  const secret = process.env.REINSCRIPTION_INVITE_SECRET;
  const got = req.headers.get("x-invite-secret") || "";

  if (!secret || got !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isReinscriptionOpen(new Date())) {
    return NextResponse.json(
      { error: "Fenêtre réinscription fermée (juin à octobre)." },
      { status: 403 }
    );
  }

  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "no-reply@blackwaves-cheer.com";
  if (!resendKey) return NextResponse.json({ error: "RESEND_API_KEY manquant" }, { status: 500 });

  const admin = supabaseAdmin();
  const nextSeason = getNextSeasonLabel(new Date());

  // Tous les parents ayant au moins une demande/inscription (source: demandes_inscription)
  const { data, error } = await admin
    .from("demandes_inscription")
    .select("email_parent")
    .not("email_parent", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const emails = uniqEmails(data || []);
  if (emails.length === 0) {
    return NextResponse.json({ ok: true, nextSeason, recipients: 0, sent: 0 });
  }

  const resend = new Resend(resendKey);

  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://blackwaves-cheer.com";

  // V2 : lien avec flag reinscription=1 (utile pour afficher un bandeau côté parent)
  const url = `${site}/parent?reinscription=1`;

  let sent = 0;
  const failed: string[] = [];

  for (const to of emails) {
    try {
      await resend.emails.send({
        from,
        to: [to],
        subject: `Ouverture des ré-inscriptions ${nextSeason} – BlackWaves Cheer`,
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.5">
            <p>Bonjour,</p>
            <p>Les ré-inscriptions pour la saison <b>${nextSeason}</b> sont ouvertes.</p>
            <p>Vous pouvez ré-inscrire votre/vos enfant(s) directement depuis votre espace parent :</p>

            <p style="margin:18px 0">
              <a href="${url}"
                 style="display:inline-block;background:#000;color:#fff;padding:10px 14px;border-radius:10px;text-decoration:none">
                 Accéder à l’espace parent
              </a>
            </p>

            <p style="color:#666;font-size:12px;margin-top:20px">
              Si le bouton est grisé, la ré-inscription n’est pas encore ouverte.
            </p>
            <p style="color:#666;font-size:12px">BlackWaves Cheer</p>
          </div>
        `,
      });
      sent++;
    } catch (e) {
      failed.push(to);
    }
  }

  return NextResponse.json({
    ok: true,
    nextSeason,
    recipients: emails.length,
    sent,
    failed_count: failed.length,
  });
}
