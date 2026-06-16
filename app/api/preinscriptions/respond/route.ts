import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  "https://blackwaves-cheer.com";

function htmlPage(title: string, message: string) {
  const body = `
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${title}</title>
    </head>
    <body style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial; background:#0b1220; color:#e2e8f0; padding:24px;">
      <div style="max-width:720px; margin:0 auto; background:#0f172a; border:1px solid rgba(255,255,255,.08); border-radius:16px; padding:18px;">
        <h2 style="margin:0 0 10px 0;">${title}</h2>
        <p style="margin:0 0 14px 0; color:#cbd5e1;">${message}</p>
        <a href="${SITE}" style="display:inline-block; background:#22c55e; color:white; padding:10px 14px; border-radius:999px; text-decoration:none; font-weight:700;">
          Retour au site
        </a>
      </div>
    </body>
  </html>`;
  return new NextResponse(body, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const choice = url.searchParams.get("choice"); // yes | no | maybe

    if (!token || !choice) return htmlPage("Réponse invalide", "Le lien est incomplet.");

    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return htmlPage("Erreur", "Configuration serveur manquante.");
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: prop, error: pErr } = await supabase
      .from("reinscription_propositions")
      .select("athlete_id, saison_cible, equipe_future")
      .eq("token", token)
      .single();

    if (pErr || !prop) return htmlPage("Lien expiré", "Ce lien n’est plus valide.");

    const status_parent =
      choice === "yes" ? "yes" : choice === "no" ? "no" : choice === "maybe" ? "maybe" : null;

    if (!status_parent) return htmlPage("Réponse invalide", "Choix non reconnu.");

    // Update statut
    await supabase
      .from("reinscription_propositions")
      .update({
        status_parent,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("token", token);

    // Si OUI → créer trial_requests (workflow inscriptions)
    if (status_parent === "yes") {
      // Charge l’athlète + parent
      const { data: a, error: aErr } = await supabase
        .from("athletes")
        .select("id, prenom, nom, date_naissance, email_parent, telephone_parent")
        .eq("id", prop.athlete_id)
        .single();

      if (!aErr && a?.email_parent) {
        // ⚠️ On crée une "demande" dans trial_requests, comme si le parent avait rempli le formulaire.
        // wanted_team = equipe_future (si choisi), sinon vide
        const wantedTeam = prop.equipe_future || null;

        // Parent noms : on n’a pas forcément prenom/nom parent dans athletes.
        // On met des placeholders simples (à enrichir plus tard si tu ajoutes ces champs).
        const parentFirstName = "Parent";
        const parentLastName = a.nom || "";

        await supabase.from("trial_requests").insert({
          child_first_name: a.prenom,
          child_last_name: a.nom,
          child_birthdate: a.date_naissance,
          wanted_team: wantedTeam,
          parent_first_name: parentFirstName,
          parent_last_name: parentLastName,
          parent_email: a.email_parent,
          parent_phone: a.telephone_parent,
          status: "pending",
          // la suite du workflow bureau créera registration_token etc.
        });
      }
    }

    if (status_parent === "yes")
      return htmlPage("Merci !", "Réponse enregistrée : OUI. Votre enfant est réintégré dans le workflow d’inscription.");
    if (status_parent === "no")
      return htmlPage("Merci !", "Réponse enregistrée : NON. Merci pour votre retour.");
    return htmlPage("Merci !", "Réponse enregistrée : PAS CERTAIN. Nous reviendrons vers vous au bon moment.");
  } catch {
    return htmlPage("Erreur", "Une erreur est survenue. Merci de réessayer plus tard.");
  }
}
