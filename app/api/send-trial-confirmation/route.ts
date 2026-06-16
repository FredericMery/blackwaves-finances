// app/api/send-trial-confirmation/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// 🔒 Client Supabase (service_role)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 📩 Client Resend
const resend = new Resend(process.env.RESEND_API_KEY!);

type TrialSession = {
  date: string | null;
  start: string | null;
  end: string | null;
  gymnase: string | null;
};

// ---------------------------
// FONCTION : Saison courante
// ---------------------------
function getCurrentSeason(now = new Date()): string {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

function clean(value: unknown) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function normalizeSessions(slot: any): TrialSession[] {
  const fromJson = Array.isArray(slot?.trial_sessions)
    ? slot.trial_sessions
        .map((s: any) => ({
          date: clean(s?.date),
          start: clean(s?.start),
          end: clean(s?.end),
          gymnase: clean(s?.gymnase),
        }))
        .filter((s: TrialSession) => s.date || s.start || s.end || s.gymnase)
    : [];

  if (fromJson.length) {
    return fromJson;
  }

  const legacy = [
    {
      date: clean(slot?.essai1_date),
      start: clean(slot?.essai1_start),
      end: clean(slot?.essai1_end),
      gymnase: clean(slot?.essai1_gymnase),
    },
    {
      date: clean(slot?.essai2_date),
      start: clean(slot?.essai2_start),
      end: clean(slot?.essai2_end),
      gymnase: clean(slot?.essai2_gymnase),
    },
  ].filter((s) => s.date || s.start || s.end || s.gymnase);

  return legacy;
}

function parseDateOnly(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isTodayOrFuture(value: string | null): boolean {
  const d = parseDateOnly(value);
  if (!d) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() >= today.getTime();
}

// ---------------------------
// ROUTE : Envoi confirmation essai
// ---------------------------
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { trial_id } = body as { trial_id?: string };

    if (!trial_id) {
      return NextResponse.json(
        { error: "Paramètre 'trial_id' manquant." },
        { status: 400 }
      );
    }

    // ---------------------------
    // 1) Charger la demande d'essai
    // ---------------------------
    const { data: trial, error: trialError } = await supabase
      .from("trial_requests")
      .select("*")
      .eq("id", trial_id)
      .single();

    if (trialError || !trial) {
      return NextResponse.json(
        {
          error:
            trialError?.message ||
            "Demande d’essai introuvable pour cet identifiant.",
        },
        { status: 404 }
      );
    }

    const parentEmailRaw = (trial.parent_email || "").toString().trim();
    if (!parentEmailRaw) {
      return NextResponse.json(
        { error: "Email parent manquant sur la demande d’essai (parent_email)." },
        { status: 400 }
      );
    }

    let saison: string = trial.saison || "";

    if (!saison && trial.registration_token) {
      const { data: reg } = await supabase
        .from("demandes_inscription")
        .select("saison")
        .eq("token", trial.registration_token)
        .maybeSingle();

      if (typeof reg?.saison === "string" && reg.saison.trim().length > 0) {
        saison = reg.saison;
      }
    }

    if (!saison) {
      saison = getCurrentSeason();
    }

    const team_key: string | null = trial.team_selected;

    if (!team_key) {
      return NextResponse.json(
        {
          error:
            "Aucune équipe sélectionnée pour cette demande. Impossible d’envoyer la convocation.",
        },
        { status: 400 }
      );
    }

    // ---------------------------
    // 2) Récupérer les créneaux d’essai
    // ---------------------------
    const { data: slots, error: slotError } = await supabase
      .from("essais_equipes")
      .select("*")
      .eq("saison", saison)
      .eq("team_key", team_key)
      .order("team_order", { ascending: true });

    if (slotError) {
      return NextResponse.json(
        {
          error:
            slotError.message ||
            "Erreur lors de la récupération des créneaux d’essai.",
        },
        { status: 500 }
      );
    }

    const slot = (slots || [])[0];

    const formatDate = (d?: string | null) => {
      if (!d) return "a confirmer";
      const parsed = new Date(d);
      if (Number.isNaN(parsed.getTime())) return d;
      return parsed.toLocaleDateString("fr-FR");
    };

    const sessions = normalizeSessions(slot);
    const upcomingSessions = sessions
      .filter((s) => isTodayOrFuture(s.date))
      .sort((a, b) => {
        const da = parseDateOnly(a.date);
        const db = parseDateOnly(b.date);
        const ta = da ? da.getTime() : Number.MAX_SAFE_INTEGER;
        const tb = db ? db.getTime() : Number.MAX_SAFE_INTEGER;
        return ta - tb;
      });

    const childFirst = trial.child_first_name || "";
    const childTeam = team_key;

    const sessionsHtml = upcomingSessions.length
      ? upcomingSessions
          .map((s, idx) => {
            const title = `Seance d'essai ndeg${idx + 1}`;
            const dateText = s.date ? formatDate(s.date) : null;
            const timeText =
              s.start && s.end ? `${s.start} – ${s.end}` : s.start || s.end || null;
            const gymText = s.gymnase || null;

            return `
              <p><strong>${title}</strong><br/>
                ${dateText ? `Date : <strong>${dateText}</strong><br/>` : ""}
                ${timeText ? `Horaire : <strong>${timeText}</strong><br/>` : ""}
                ${gymText ? `Lieu : <strong>${gymText}</strong><br/>` : ""}
              </p>
            `;
          })
          .join("")
          : `<p><strong>Seance d'essai</strong><br/>Aucune seance a venir n'est actuellement disponible. Le bureau vous recontactera avec de nouvelles dates.</p>`;

    // ---------------------------
    // 3) Construire le mail HTML
    // ---------------------------
    const html = `
      <p>Bonjour ${trial.parent_first_name || ""},</p>
      <p>
        Nous vous remercions pour votre demande d’essai au sein du club
        <strong>Black Waves Cheerleading</strong> pour
        <strong>${childFirst}</strong>.
      </p>
      <p>
        Nous avons le plaisir de vous confirmer que ${childFirst} participera à une
        <strong>séance d’essai</strong> avec l’équipe
        <strong>${childTeam}</strong>.
      </p>

      ${sessionsHtml}

      <p><strong>Tenue recommandée :</strong><br/>
      - tenue de sport confortable (legging / short, t-shirt)<br/>
      - baskets propres réservées à l’intérieur<br/>
      - cheveux attachés, sans bijoux<br/>
      - bouteille d’eau.</p>

      <p>
        Merci de vous présenter environ <strong>10 minutes avant le début de la séance</strong>.
      </p>

      <p>
        Au plaisir d’accueillir ${childFirst} sur le tapis,<br/>
        <strong>Black Waves Cheerleading</strong>
      </p>
    `;

    const subject =
      "Confirmation de la séance d’essai – Black Waves Cheerleading";

    // ---------------------------
    // 4) Destinataires (DEV redirect optionnel)
    // ---------------------------
    // Si tu veux redirect en dev/test, tu définis RESEND_REDIRECT_TO="tonmail@..."
    const redirectTo = (process.env.RESEND_REDIRECT_TO || "").trim();
    const to = redirectTo || parentEmailRaw;

    console.log("📧 Envoi email essai →", to, {
      redirected: !!redirectTo,
      nodeEnv: process.env.NODE_ENV,
    });

    await resend.emails.send({
      from: "Black Waves Cheer <no-reply@blackwaves-cheer.com>",
      to,
      subject,
      html,
      // Optionnel: copie bureau (sans polluer le parent)
      // bcc: ["bureau@blackwaves-cheer.com"],
    });

    return NextResponse.json({
      message: `Email envoyé à ${to}.`,
      redirected: !!redirectTo,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error:
          err?.message ||
          "Erreur serveur lors de l’envoi de l’email de convocation.",
      },
      { status: 500 }
    );
  }
}
