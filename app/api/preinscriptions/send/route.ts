import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

function json(ok: boolean, extra: any = {}, status = 200) {
  return NextResponse.json({ ok, ...extra }, { status });
}

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  "https://blackwaves-cheer.com";

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
    const body = await req.json().catch(() => null);
    const athlete_id = body?.athlete_id as string | undefined;
    const targetSeason = body?.targetSeason as string | undefined;
    const equipe_future = (body?.equipe_future as string | null | undefined) ?? null;

    if (!athlete_id || !targetSeason) return json(false, { error: "Paramètres manquants." }, 400);

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return json(false, { error: "Variables Supabase manquantes (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)." }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Charge l’athlète
    const { data: athlete, error: aErr } = await supabase
      .from("athletes")
      .select("id, prenom, nom, email_parent, equipe, saison")
      .eq("id", athlete_id)
      .single();

    if (aErr || !athlete) return json(false, { error: aErr?.message || "Athlète introuvable." }, 404);
    if (!athlete.email_parent) return json(false, { error: "Email parent manquant sur la fiche athlète." }, 400);

    // Upsert proposition + récup token
    const { data: prop, error: pErr } = await supabase
      .from("reinscription_propositions")
      .upsert(
        {
          athlete_id,
          saison_cible: targetSeason,
          equipe_future,
          // on conserve status_parent si déjà répondu
          updated_at: new Date().toISOString(),
        },
        { onConflict: "athlete_id,saison_cible" }
      )
      .select("token, status_parent")
      .single();

    if (pErr || !prop) return json(false, { error: pErr?.message || "Impossible d’enregistrer la proposition." }, 500);

    // Mets mail_sent_at
    await supabase
      .from("reinscription_propositions")
      .update({ mail_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("athlete_id", athlete_id)
      .eq("saison_cible", targetSeason);

    const token = prop.token as string;

    const yesUrl = `${SITE}/api/preinscriptions/respond?token=${token}&choice=yes`;
    const noUrl = `${SITE}/api/preinscriptions/respond?token=${token}&choice=no`;
    const maybeUrl = `${SITE}/api/preinscriptions/respond?token=${token}&choice=maybe`;

    const child = `${athlete.prenom} ${athlete.nom}`;
    const currentTeam = athlete.equipe || "—";

    const subject = `Réinscription ${child} — Saison ${targetSeason}`;

    const html = `
      <div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial; line-height:1.5; color:#0f172a;">
        <h2 style="margin:0 0 12px 0;">Black Waves Cheerleading — Réinscription ${escapeHtml(child)}</h2>
        <p style="margin:0 0 10px 0;">
          Bonjour,<br/>
          Merci pour cette belle saison passée avec <b>${escapeHtml(child)}</b> (équipe actuelle : <b>${escapeHtml(currentTeam)}</b>).
        </p>
        <p style="margin:0 0 14px 0;">
          Nous préparons la saison <b>${escapeHtml(targetSeason)}</b> et nous souhaitons savoir si vous envisagez la réinscription.
          Cela nous aide à organiser les équipes et les créneaux.
        </p>

        <div style="margin:18px 0; display:flex; gap:10px; flex-wrap:wrap;">
          <a href="${yesUrl}" style="background:#10b981; color:white; padding:10px 14px; border-radius:999px; text-decoration:none; font-weight:700;">Oui</a>
          <a href="${noUrl}" style="background:#ef4444; color:white; padding:10px 14px; border-radius:999px; text-decoration:none; font-weight:700;">Non</a>
          <a href="${maybeUrl}" style="background:#f59e0b; color:white; padding:10px 14px; border-radius:999px; text-decoration:none; font-weight:700;">Peut-être</a>
        </div>

        <p style="margin:0; color:#334155; font-size:13px;">
          Si vous choisissez “Oui”, nous réintégrons automatiquement votre enfant dans le workflow d’inscription (comme une demande enregistrée),
          afin de finaliser la saison dans les meilleures conditions.
        </p>

        <hr style="border:none; border-top:1px solid #e2e8f0; margin:18px 0;" />
        <p style="margin:0; color:#64748b; font-size:12px;">
          Vous pouvez également copier-coller ce lien dans votre navigateur :<br/>
          ${escapeHtml(yesUrl)}<br/>
          ${escapeHtml(noUrl)}<br/>
          ${escapeHtml(maybeUrl)}
        </p>
      </div>
    `;

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return json(false, { error: "RESEND_API_KEY manquante." }, 500);

    const resend = new Resend(resendKey);
    const from = process.env.RESEND_FROM || "no-reply@blackwaves-cheer.com";

    await resend.emails.send({
      from,
      to: [athlete.email_parent],
      subject,
      html,
    });

    return json(true);
  } catch (e: any) {
    return json(false, { error: e?.message || "Erreur inconnue." }, 500);
  }
}
