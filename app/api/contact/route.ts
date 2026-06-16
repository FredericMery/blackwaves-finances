import { NextResponse } from "next/server";
import { Resend } from "resend";

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    // Honeypot
    const website = String(formData.get("website") ?? "");
    if (website.trim().length > 0) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Anti-bot "trop rapide"
    const ts = Number(formData.get("ts") ?? 0);
    const elapsed = Date.now() - ts;
    if (!Number.isFinite(elapsed) || elapsed < 1200) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const nom = String(formData.get("nom") ?? "").trim();
    const prenom = String(formData.get("prenom") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const sujet = String(formData.get("sujet") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();

    if (!nom || !prenom || !email || !sujet || !message) {
      return NextResponse.json(
        { ok: false, error: "Champs manquants" },
        { status: 400 }
      );
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const CONTACT_TO_EMAIL = process.env.CONTACT_TO_EMAIL; // ex: bureau@blackwaves-cheer.com
    const CONTACT_FROM_EMAIL = process.env.CONTACT_FROM_EMAIL; // ex: no-reply@blackwaves-cheer.com (domaine vérifié)

    if (!RESEND_API_KEY || !CONTACT_TO_EMAIL || !CONTACT_FROM_EMAIL) {
      return NextResponse.json(
        { ok: false, error: "Configuration email manquante" },
        { status: 500 }
      );
    }

    const resend = new Resend(RESEND_API_KEY);

    const safeMessage = escapeHtml(message).replaceAll("\n", "<br/>");

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5">
        <h2>Message via le formulaire Contact (BlackWaves)</h2>
        <p><strong>Nom :</strong> ${escapeHtml(nom)} ${escapeHtml(prenom)}</p>
        <p><strong>Email :</strong> ${escapeHtml(email)}</p>
        <p><strong>Sujet :</strong> ${escapeHtml(sujet)}</p>
        <hr/>
        <p>${safeMessage}</p>
      </div>
    `;

    await resend.emails.send({
      from: CONTACT_FROM_EMAIL,
      to: [CONTACT_TO_EMAIL],
      subject: `[Contact BlackWaves] ${sujet}`,
      replyTo: email, // ✅ typage OK (string)
      html,
    });

    // ✅ IMPORTANT : pas de redirect côté API (sinon risque de revenir sur localhost)
    // Le front fera lui-même: window.location.assign("/contact?sent=1")
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
