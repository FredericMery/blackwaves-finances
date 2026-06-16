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
  return (s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function previousSeason(season: string) {
  const m = season.match(/^(\d{4})-(\d{4})$/);
  if (!m) return season;
  const a = parseInt(m[1], 10);
  return `${a - 1}-${a}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const targetSeason = (body?.targetSeason as string | undefined) || "";
    const athlete_ids = (body?.athlete_ids as string[] | undefined) || [];
    const equipe_future_by_athlete =
      (body?.equipe_future_by_athlete as Record<string, string | null> | undefined) || {};

    if (!targetSeason) return json(false, { error: "targetSeason manquant." }, 400);
    if (!Array.isArray(athlete_ids) || athlete_ids.length === 0) {
      return json(false, { error: "athlete_ids manquant ou vide." }, 400);
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return json(
        false,
        { error: "Variables Supabase manquantes (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)." },
        500
      );
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return json(false, { error: "RESEND_API_KEY manquante." }, 500);

    const resend = new Resend(resendKey);
    const from = process.env.RESEND_FROM || "no-reply@blackwaves-cheer.com";

    const supabase = createClient(supabaseUrl, serviceKey);

    // Charge les athlètes en une requête
    const { data: athletes, error: aErr } = await supabase
      .from("athletes")
      .select("id, prenom, nom, email_parent, equipe, saison")
      .in("id", athlete_ids);

    if (aErr) return json(false, { error: aErr.message }, 500);

    const byId: Record<string, any> = {};
    for (const a of athletes || []) byId[a.id] = a;

    const results: Array<{ athlete_id: string; ok: boolean; error?: string }> = [];
    let okCount = 0;
    let koCount = 0;

    const sourceSeason = previousSeason(targetSeason);

    // Envoi SEQUENTIEL serveur (solide, évite rafale)
    for (const athlete_id of athlete_ids) {
      const athlete = byId[athlete_id];

      // Sécurité : athlète introuvable
      if (!athlete) {
        results.push({ athlete_id, ok: false, error: "Athlète introuvable." });
        koCount++;
        continue;
      }

      // Option : on s'assure qu'il vient bien de la saison source (sinon on laisse passer mais on le note)
      if (athlete.saison !== sourceSeason) {
        // on ne bloque pas, mais tu peux choisir de bloquer si tu veux
      }

      // Email parent obligatoire
      if (!athlete.email_parent) {
        results.push({ athlete_id, ok: false, error: "Email parent manquant." });
        koCount++;
        continue;
      }

      try {
        const equipe_future = equipe_future_by_athlete[athlete_id] ?? null;

        // Upsert proposition + récup token
        const { data: prop, error: pErr } = await supabase
          .from("reinscription_propositions")
          .upsert(
            {
              athlete_id,
              saison_cible: targetSeason,
              equipe_future,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "athlete_id,saison_cible" }
          )
          .select("token")
          .single();

        if (pErr || !prop?.token) throw new Error(pErr?.message || "Upsert proposition impossible.");

        // Marque mail envoyé
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
              Merci pour cette belle saison passée avec <b>${escapeHtml(child)}</b> (équipe actuelle : <b>${escapeHtml(
          currentTeam
        )}</b>).
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
              Si vous choisissez “Oui”, nous réintégrons automatiquement votre enfant dans le workflow d’inscription.
            </p>

            <hr style="border:none; border-top:1px solid #e2e8f0; margin:18px 0;" />
            <p style="margin:0; color:#64748b; font-size:12px;">
              Liens (si besoin de copier-coller) :<br/>
              ${escapeHtml(yesUrl)}<br/>
              ${escapeHtml(noUrl)}<br/>
              ${escapeHtml(maybeUrl)}
            </p>
          </div>
        `;

        await resend.emails.send({
          from,
          to: [athlete.email_parent],
          subject,
          html,
        });

        results.push({ athlete_id, ok: true });
        okCount++;

        // petite pause pour éviter rafale provider
        await new Promise((r) => setTimeout(r, 120));
      } catch (e: any) {
        results.push({ athlete_id, ok: false, error: e?.message || "Erreur envoi." });
        koCount++;
      }
    }

    return json(true, {
      summary: {
        total: athlete_ids.length,
        ok: okCount,
        ko: koCount,
      },
      results,
    });
  } catch (e: any) {
    return json(false, { error: e?.message || "Erreur inconnue." }, 500);
  }
}
