import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;


if (!process.env.RESEND_FROM) {
  console.warn("RESEND_FROM not set in environment variables");
}
const emailFrom = process.env.RESEND_FROM as string;


if (!process.env.NEXT_PUBLIC_SITE_URL) {
  throw new Error("NEXT_PUBLIC_SITE_URL not defined in environment");
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;



export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const emailRaw = String(body?.email || "");
    const e = normalizeEmail(emailRaw);

    // Réponse générique par défaut (anti-énumération)
    const genericOk = NextResponse.json({ ok: true }, { status: 200 });

    if (!e || !e.includes("@")) {
      // Ici tu peux répondre 200 pour éviter de "signaler" les emails invalides,
      // mais garder 400 est ok (ce n'est pas une vraie donnée sensible).
      return NextResponse.json(
        { ok: false, error: "Email invalide" },
        { status: 400 }
      );
    }

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      console.error("[parent/request-magic-link] Missing SUPABASE_URL or SERVICE_ROLE");
      // On évite de donner trop d'info
      return genericOk;
    }

    if (!resend) {
      console.error("[parent/request-magic-link] Missing RESEND_API_KEY");
      return genericOk;
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // ✅ Vérifie si parent autorisé (table NON exposée car service role)
    const { data: parent, error: pErr } = await admin
      .from("parents_autorises")
      .select("email, actif")
      .eq("email", e)
      .maybeSingle();

    if (pErr) {
      console.error("[parent/request-magic-link] check parent error:", pErr);
      return genericOk;
    }

    if (!parent || parent.actif !== true) {
      // anti-énumération: on répond ok même si non autorisé
      return genericOk;
    }

    // Génère le magic link Supabase (Admin)
    const redirectTo = `${siteUrl}/parent`;

    const gl = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: e,
      options: { redirectTo },
    });

    if (gl.error) {
      console.error("[parent/request-magic-link] generateLink error:", gl.error);
      return genericOk;
    }

    const actionLink =
      (gl.data as any)?.properties?.action_link ||
      (gl.data as any)?.action_link ||
      null;

    if (!actionLink) {
      console.error("[parent/request-magic-link] action_link missing in response");
      return genericOk;
    }

    // Envoi email via Resend
    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;line-height:1.5">
        <h2 style="margin:0 0 12px 0">Connexion à votre espace parent</h2>
        <p>Bonjour,</p>
        <p>Pour accéder à votre espace parent BlackWaves, cliquez sur le bouton ci-dessous :</p>

        <p style="margin:14px 0">
          <a href="${actionLink}"
             style="display:inline-block;background:#0ea5e9;color:white;text-decoration:none;padding:10px 16px;border-radius:999px;font-weight:600">
            Se connecter à mon espace parent
          </a>
        </p>

        <p style="font-size:13px;color:#475569;margin-top:0">
          Si le bouton ne fonctionne pas, copiez/collez ce lien dans votre navigateur :<br/>
          <span style="word-break:break-all">${actionLink}</span>
        </p>

        <p style="margin-top:18px;color:#475569;font-size:13px">
          Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer ce message.
        </p>

        <p style="margin-top:18px">Sportivement,<br/>BlackWaves Cheerleading</p>
      </div>
    `;

    const emailRes = await resend.emails.send({
      from: emailFrom,
      to: e,
      subject: "BlackWaves Cheer – Votre lien de connexion (espace parent)",
      html,
    });

    // @ts-ignore
    if (emailRes?.error) {
      // @ts-ignore
      console.error("[parent/request-magic-link] Resend error:", emailRes.error);
      return genericOk;
    }

    return genericOk;
  } catch (err) {
    console.error("[parent/request-magic-link] unexpected error:", err);
    // anti-énumération: réponse générique
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
