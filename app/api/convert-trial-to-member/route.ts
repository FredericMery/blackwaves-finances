// app/api/convert-trial-to-member/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

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


if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("[convert-trial-to-member] Missing SUPABASE_URL or SERVICE_ROLE");
}

const supabase = createClient(SUPABASE_URL as string, SERVICE_ROLE as string, {
  auth: { persistSession: false },
});

function moneyEUR(n: number | string | null | undefined) {
  if (n === null || n === undefined) return "";
  const v = typeof n === "string" ? Number(n) : n;
  if (Number.isNaN(v)) return "";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(v);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const trial_id = body?.trial_id as string | undefined;

    if (!trial_id) {
      return NextResponse.json(
        { ok: false, error: "trial_id manquant." },
        { status: 400 }
      );
    }

    if (!resend) {
      return NextResponse.json(
        { ok: false, error: "RESEND_API_KEY manquante (envoi email impossible)." },
        { status: 500 }
      );
    }

    // 1) Charger la demande d’essai
    const { data: trial, error: trialErr } = await supabase
      .from("trial_requests")
      .select("*")
      .eq("id", trial_id)
      .maybeSingle();

    if (trialErr || !trial) {
      console.error(
        "[convert-trial-to-member] trial_requests load error:",
        trialErr
      );
      return NextResponse.json(
        { ok: false, error: "Demande d’essai introuvable." },
        { status: 404 }
      );
    }

    const parentEmail = (trial.parent_email || "")
      .toString()
      .trim()
      .toLowerCase();

    if (!parentEmail) {
      return NextResponse.json(
        { ok: false, error: "parent_email manquant sur la demande d’essai." },
        { status: 400 }
      );
    }

    const token = (trial.registration_token || "").toString().trim();
    if (!token) {
      return NextResponse.json(
        {
          ok: false,
          error: "registration_token manquant : prépare la fiche parent d’abord.",
        },
        { status: 400 }
      );
    }

    // 2) Charger demandes_inscription (pour saison + infos enfant/parent)
    const { data: reg, error: regErr } = await supabase
      .from("demandes_inscription")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (regErr || !reg) {
      console.error(
        "[convert-trial-to-member] demandes_inscription load error:",
        regErr
      );
      return NextResponse.json(
        {
          ok: false,
          error:
            "Fiche d’inscription (demandes_inscription) introuvable pour ce token.",
        },
        { status: 404 }
      );
    }

    // 3) Marquer la demande d’essai "converted" (idempotent)
    const { error: convErr } = await supabase
      .from("trial_requests")
      .update({ status: "converted" } as any)
      .eq("id", trial.id);

    if (convErr) {
      console.error(
        "[convert-trial-to-member] trial_requests convert error:",
        convErr
      );
      return NextResponse.json(
        { ok: false, error: "Impossible de convertir la demande d’essai." },
        { status: 500 }
      );
    }

    // ✅ 3bis) Autoriser le parent (upsert) — pour sécuriser /parent/login et /parent
    // Fail-soft: on ne bloque pas la conversion si l’upsert échoue,
    // mais on loggue (sinon tu peux te retrouver bloqué sur une erreur DB ponctuelle).
    try {
      const { error: paErr } = await supabase
        .from("parents_autorises")
        .upsert(
          { email: parentEmail, actif: true } as any,
          { onConflict: "email" } as any
        );

      if (paErr) {
        console.warn(
          "[convert-trial-to-member] parents_autorises upsert warning:",
          paErr
        );
      }
    } catch (e) {
      console.warn(
        "[convert-trial-to-member] parents_autorises upsert skipped:",
        e
      );
    }

    // 4) Récupérer le tarif de la saison (si présent)
    const saison = (reg.saison || "").toString().trim();
    let prixAnnuel: number | null = null;
    let modalites: string | null = null;

    if (saison) {
      const { data: tarif, error: tarifErr } = await supabase
        .from("tarifs_saison")
        .select("prix_annuel, modalites")
        .eq("saison", saison)
        .maybeSingle();

      if (tarifErr) {
        console.warn(
          "[convert-trial-to-member] tarifs_saison load warning:",
          tarifErr
        );
      } else if (tarif) {
        prixAnnuel = tarif.prix_annuel ?? null;
        modalites = tarif.modalites ?? null;
      }
    }

    // 5) Générer le magic link Supabase (Admin)
    const redirectTo = `${siteUrl}/parent`;
    let actionLink: string | null = null;
    let authUserId: string | null = null;

    const readActionLink = (x: any) =>
      x?.properties?.action_link || x?.action_link || null;

    // 5.A generateLink (1er essai)
    const gl = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: parentEmail,
      options: { redirectTo },
    });

    if (!gl.error) {
      actionLink = readActionLink((gl.data as any) || null);
      authUserId = (gl.data as any)?.user?.id || null;
    } else {
      console.warn("[convert-trial-to-member] generateLink error:", gl.error);

      // 5.B fallback : créer l’utilisateur si besoin
      const randomPwd = cryptoRandomPassword();
      const cu = await supabase.auth.admin.createUser({
        email: parentEmail,
        password: randomPwd,
        email_confirm: true,
      });

      if (cu.error) {
        const msg = String((cu.error as any)?.message || "");
        const already =
          msg.toLowerCase().includes("already") ||
          msg.toLowerCase().includes("exists") ||
          msg.toLowerCase().includes("registered");

        if (!already) {
          console.error("[convert-trial-to-member] createUser error:", cu.error);
          return NextResponse.json(
            {
              ok: false,
              error: "Impossible de créer le compte parent (Supabase Auth).",
            },
            { status: 500 }
          );
        }

        console.warn(
          "[convert-trial-to-member] createUser: user already exists, continue."
        );
      }

      const gl2 = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: parentEmail,
        options: { redirectTo },
      });

      if (gl2.error) {
        console.error(
          "[convert-trial-to-member] generateLink retry error:",
          gl2.error
        );
        return NextResponse.json(
          { ok: false, error: "Impossible de générer le lien de connexion parent." },
          { status: 500 }
        );
      }

      actionLink = readActionLink((gl2.data as any) || null);
      authUserId = (gl2.data as any)?.user?.id || null;
    }

    if (!actionLink) {
      console.error(
        "[convert-trial-to-member] No action_link in generateLink response"
      );
      return NextResponse.json(
        {
          ok: false,
          error: "Lien de connexion non récupéré (action_link manquant).",
        },
        { status: 500 }
      );
    }

    // 6) Upsert profil parent (optionnel)
    try {
      if (authUserId) {
        await supabase.from("parent_profiles").upsert(
          {
            user_id: authUserId,
            email: parentEmail,
            prenom: trial.parent_first_name || null,
            nom: trial.parent_last_name || null,
            telephone: trial.parent_phone || null,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: "user_id" } as any
        );
      }
    } catch (e) {
      console.warn("[convert-trial-to-member] parent_profiles upsert skipped:", e);
    }

    // 7) Email Resend au parent
    const childFullName = `${reg.prenom_enfant || ""} ${reg.nom_enfant || ""}`.trim();
    const priceText = prixAnnuel !== null ? moneyEUR(prixAnnuel) : "—";
    const modalitesText = modalites
      ? `<p><strong>Modalités :</strong> ${escapeHtml(modalites)}</p>`
      : "";

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;line-height:1.5">
        <h2 style="margin:0 0 12px 0">Bienvenue chez BlackWaves Cheer</h2>
        <p>Bonjour,</p>
        <p>
          L’inscription de <strong>${escapeHtml(
            childFullName || "votre enfant"
          )}</strong> pour la saison
          <strong>${escapeHtml(saison || "—")}</strong> a été validée.
        </p>

        <h3 style="margin:18px 0 8px 0">Accès à votre espace parent</h3>
        <ol style="margin:0 0 14px 18px;padding:0">
          <li>Cliquez sur le bouton ci-dessous</li>
          <li>Vous serez connecté automatiquement à votre espace</li>
          <li>Vous pourrez déposer les documents demandés</li>
        </ol>

        <p style="margin:14px 0">
          <a href="${actionLink}"
             style="display:inline-block;background:#ec4899;color:white;text-decoration:none;padding:10px 16px;border-radius:999px;font-weight:600">
            Accéder à mon espace parent
          </a>
        </p>

        <p style="font-size:13px;color:#475569;margin-top:0">
          Si le bouton ne fonctionne pas, copiez/collez ce lien dans votre navigateur :<br/>
          <span style="word-break:break-all">${actionLink}</span>
        </p>

        <h3 style="margin:18px 0 8px 0">Tarif annuel</h3>
        <p><strong>${priceText}</strong> ${
      saison ? `pour la saison ${escapeHtml(saison)}` : ""
    }</p>
        ${modalitesText}

        <h3 style="margin:18px 0 8px 0">Document à déposer (obligatoire)</h3>
        <p>Merci de déposer dans votre espace parent :</p>
        <ul style="margin:0 0 14px 18px;padding:0">
          <li><strong>Certificat médical</strong> de votre enfant</li>
        </ul>

        <p style="margin-top:18px">Sportivement,<br/>Le bureau BlackWaves Cheerleading</p>
      </div>
    `;

    const emailRes = await resend.emails.send({
      from: emailFrom,
      to: parentEmail,
      subject: "BlackWaves Cheer – Accès à votre espace parent",
      html,
    });

    // @ts-ignore
    if (emailRes?.error) {
      // @ts-ignore
      console.error("[convert-trial-to-member] Resend error:", emailRes.error);
      return NextResponse.json(
        {
          ok: false,
          error: "Converti, mais email non envoyé (Resend).",
          converted: true,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        converted: true,
        trial_id: trial.id,
        parentEmail,
        saison,
        price: prixAnnuel,
        // @ts-ignore
        resendId: emailRes?.data?.id || null,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("[convert-trial-to-member] unexpected error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Erreur serveur." },
      { status: 500 }
    );
  }
}

/** Helpers */
function escapeHtml(s: string) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cryptoRandomPassword() {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*";
  let out = "";
  for (let i = 0; i < 20; i++)
    out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
