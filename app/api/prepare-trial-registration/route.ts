// app/api/prepare-trial-registration/route.ts

// 🔓 DEV uniquement : éviter les erreurs de certificat local avec Supabase
if (process.env.NODE_ENV === "development") {
  // @ts-ignore
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { randomUUID } from "crypto";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const usingTypoResendKey =
  !process.env.RESEND_API_KEY && !!process.env.RESSEND_API_KEY;
const resendApiKey = (
  process.env.RESEND_API_KEY || process.env.RESSEND_API_KEY || ""
).trim();

if (usingTypoResendKey) {
  console.warn(
    "[prepare-trial-registration] Using RESSEND_API_KEY fallback. Rename env var to RESEND_API_KEY."
  );
}

if (!process.env.RESEND_FROM) {
  console.warn("RESEND_FROM not set in environment variables");
}
const emailFrom = process.env.RESEND_FROM as string;

// ✅ Redirect de test (optionnel) : si défini, tous les emails partent ici
const resendRedirectTo = (process.env.RESEND_REDIRECT_TO || "").trim();

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

if (!siteUrl) {
  console.error("[prepare-trial-registration] NEXT_PUBLIC_SITE_URL manquant");
}

function computeSeasonLabel(d = new Date()) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const start = m >= 8 ? y : y - 1;
  return `${start}-${start + 1}`;
}

function normalizeSeason(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const s = input.trim();
  const m = s.match(/^(\d{4})-(\d{4})$/);
  if (!m) return null;

  const a = Number(m[1]);
  const b = Number(m[2]);

  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (b !== a + 1) return null;
  if (a < 2000 || a > 2100) return null;

  return `${a}-${b}`;
}

function getStatusAfterPrepare(currentStatus: unknown): string {
  const status = String(currentStatus || "").trim();

  if (status === "converted") return "converted";
  if (status === "parent-created") return "parent-created";
  if (status === "scheduled") return "scheduled";

  return "parent-pending";
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "[prepare-trial-registration] SUPABASE_URL ou SERVICE_ROLE_KEY manquants"
  );
}

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      })
    : null;

const resend = resendApiKey ? new Resend(resendApiKey) : null;

async function supportsSaisonColumn() {
  if (!supabase) return false;

  const { error } = await supabase
    .from("trial_requests")
    .select("saison")
    .limit(1);

  if (!error) return true;

  const msg = (error.message || "").toLowerCase();
  if (msg.includes("saison") && msg.includes("column")) {
    return false;
  }

  return true;
}

export async function POST(req: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: "Configuration Supabase manquante" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);

    const trialId = body?.trial_id as string | undefined;
    if (!trialId) {
      return NextResponse.json(
        { ok: false, error: "Identifiant de demande d’essai manquant." },
        { status: 400 }
      );
    }

    // ✅ Saison (optionnelle) venant du bureau
    const seasonRequested = normalizeSeason(body?.season);
    const seasonFinal = seasonRequested || computeSeasonLabel();

    // 1️⃣ Récupérer la demande d’essai
    const { data: trial, error: trialError } = await supabase
      .from("trial_requests")
      .select("*")
      .eq("id", trialId)
      .single();

    if (trialError || !trial) {
      console.error(
        "[prepare-trial-registration] Erreur Supabase trial_requests :",
        trialError
      );
      return NextResponse.json(
        { ok: false, error: "Impossible de retrouver la demande d’essai." },
        { status: 404 }
      );
    }

    const parentEmail = (trial.parent_email || "").toString().trim();
    if (!parentEmail) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Email parent manquant sur la demande d’essai (trial_requests.parent_email).",
        },
        { status: 400 }
      );
    }

    // 2️⃣ Réutiliser la fiche existante si elle existe déjà, sinon créer un nouveau token
    let token = (trial.registration_token || "").toString().trim();
    let inscription: any = null;

    if (token) {
      const { data: existingReg, error: existingRegError } = await supabase
        .from("demandes_inscription")
        .select("*")
        .eq("token", token)
        .maybeSingle();

      if (existingRegError) {
        console.error(
          "[prepare-trial-registration] Erreur lecture demandes_inscription existante :",
          existingRegError
        );
      }

      inscription = existingReg || null;
    }

    if (!inscription) {
      token = randomUUID();

      const { data: createdReg, error: inscriptionError } = await supabase
        .from("demandes_inscription")
        .insert({
          token,
          email_parent: parentEmail,
          telephone: trial.parent_phone || "",
          adresse: "",
          nom_enfant: trial.child_last_name || "",
          prenom_enfant: trial.child_first_name || "",
          date_naissance: trial.child_birthdate ?? null,
          autorisation_photo: false,
          autorisation_video: false,
          statut: "draft",
          saison: seasonFinal,
        })
        .select("*")
        .single();

      if (inscriptionError) {
        console.error(
          "[prepare-trial-registration] Erreur insertion demandes_inscription :",
          inscriptionError
        );
        return NextResponse.json(
          {
            ok: false,
            error:
              inscriptionError.message ||
              "Impossible de créer la fiche d’inscription (Supabase).",
          },
          { status: 500 }
        );
      }

      inscription = createdReg;
    }

    // 4️⃣ Mettre à jour le statut de la demande d’essai + stocker registration_token
    const hasSaisonColumn = await supportsSaisonColumn();
    const nextStatus = getStatusAfterPrepare(trial.status);

    const { error: statusUpdateError } = await supabase
      .from("trial_requests")
      .update({
        status: nextStatus,
        registration_token: token,
        ...(hasSaisonColumn ? { saison: seasonFinal } : {}),
      })
      .eq("id", trial.id);

    if (statusUpdateError) {
      console.error(
        "[prepare-trial-registration] Erreur MAJ status trial_requests :",
        statusUpdateError
      );
      return NextResponse.json(
        {
          ok: false,
          error:
            "La fiche parent a ete creee mais la demande d'essai n'a pas pu etre liee correctement. Merci de reessayer.",
        },
        { status: 500 }
      );
    }

    // 5️⃣ URL d’inscription parent
    const registrationUrl = `${siteUrl}/inscription/${token}`;
    console.log("[prepare-trial-registration] URL inscription parent :", {
      registrationUrl,
      seasonFinal,
      seasonRequested,
    });

    // 6️⃣ Envoi e-mail parent
    if (!resend) {
      console.error(
        "[prepare-trial-registration] RESEND_API_KEY manquante, e-mail non envoyé."
      );
      return NextResponse.json(
        { ok: false, error: "Fiche créée mais configuration d’envoi e-mail manquante." },
        { status: 500 }
      );
    }

    const to = resendRedirectTo || parentEmail;

    const html = `
      <p>Bonjour ${trial.parent_first_name || ""},</p>
      <p>Suite à votre demande d’essai pour ${trial.child_first_name || ""} ${trial.child_last_name || ""} aux BlackWaves Cheerleading, nous vous invitons à compléter la fiche d’inscription.</p>
      <p><strong>Saison :</strong> ${seasonFinal}</p>
      <p>
        👉 Cliquez sur le lien suivant pour finaliser votre inscription :<br />
        <a href="${registrationUrl}" target="_blank">${registrationUrl}</a>
      </p>
      <p>Merci de compléter ce formulaire dans les meilleurs délais afin de finaliser l’inscription de votre enfant.</p>
      <p>Sportivement,<br />Le bureau BlackWaves Cheerleading</p>
    `;

    const emailResult = await resend.emails.send({
      from: emailFrom,
      to,
      subject: "BlackWaves Cheer – Fiche d’inscription à compléter",
      html,
    });

    console.log("[prepare-trial-registration] Résultat Resend :", emailResult);

    // ✅ IMPORTANT : Resend peut répondre avec error sans throw
    // @ts-ignore
    if (emailResult?.error) {
      // @ts-ignore
      const errMsg =
        emailResult.error?.message || "Erreur Resend (sans message)";
      console.error(
        "[prepare-trial-registration] Resend returned an error:",
        errMsg
      );
      return NextResponse.json(
        {
          ok: false,
          error:
            "Fiche créée mais e-mail non envoyé. Vérifie la configuration Resend côté serveur.",
          to,
          registrationUrl,
          seasonUsed: seasonFinal,
        },
        { status: 500 }
      );
    }

    // 7️⃣ Réponse OK
    return NextResponse.json(
      {
        ok: true,
        message:
          "La fiche d’inscription parent a été générée et l’e-mail a été envoyé.",
        token,
        to,
        registrationUrl,
        seasonUsed: seasonFinal,
        // @ts-ignore
        resendId: emailResult?.data?.id || null,
        inscription,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("[prepare-trial-registration] Erreur inattendue :", e);
    return NextResponse.json(
      {
        ok: false,
        error:
          e?.message ||
          "Erreur inattendue lors de la préparation de la fiche d’inscription.",
      },
      { status: 500 }
    );
  }
}
