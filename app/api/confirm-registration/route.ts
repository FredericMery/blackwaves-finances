// app/api/confirm-registration/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

// Même helper que pour demandes_inscription
function getCurrentSeason(now = new Date()): string {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 8) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const trialId = body?.trial_id as string | undefined;

    if (!trialId) {
      return NextResponse.json(
        { error: "Identifiant de demande d’essai manquant." },
        { status: 400 }
      );
    }

    // 1) Récupérer la demande d’essai
    const { data: trial, error: trialError } = await supabase
      .from("trial_requests")
      .select("*")
      .eq("id", trialId)
      .maybeSingle();

    if (trialError) {
      console.error("Erreur Supabase trial_requests :", trialError);
      return NextResponse.json(
        { error: "Erreur lors de la récupération de la demande d’essai." },
        { status: 500 }
      );
    }

    if (!trial) {
      return NextResponse.json(
        { error: "Aucune demande d’essai trouvée pour cet identifiant." },
        { status: 404 }
      );
    }

    // 2) Récupérer la fiche parent associée (si token présent)
    let registration: any = null;

    if (trial.registration_token) {
      const { data, error: regError } = await supabase
        .from("demandes_inscription")
        .select("*")
        .eq("token", trial.registration_token)
        .maybeSingle();

      if (regError) {
        console.error("Erreur Supabase demandes_inscription :", regError);
        return NextResponse.json(
          {
            error:
              "Erreur lors de la récupération de la fiche d’inscription parent.",
          },
          { status: 500 }
        );
      }

      registration = data ?? null;
    }

    // 3) Mettre à jour les statuts
    const { error: updateTrialError } = await supabase
      .from("trial_requests")
      .update({ status: "converted" })
      .eq("id", trialId);

    if (updateTrialError) {
      console.error("Erreur update trial_requests :", updateTrialError);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour du statut de la demande." },
        { status: 500 }
      );
    }

    if (registration?.id) {
      const { error: updateRegError } = await supabase
        .from("demandes_inscription")
        .update({ statut: "valide" })
        .eq("id", registration.id);

      if (updateRegError) {
        console.error(
          "Erreur update demandes_inscription statut :",
          updateRegError
        );
        // On logue mais on continue (l’inscription athlète reste possible)
      }
    }

    // 4) Créer l’athlète si on a une fiche parent
    let athlete = null;

    if (registration) {
      const saison =
        registration.saison && typeof registration.saison === "string"
          ? registration.saison
          : getCurrentSeason();

      const { data: athleteInserted, error: athleteError } = await supabase
        .from("athletes")
        .insert({
          prenom: registration.prenom_enfant,
          nom: registration.nom_enfant,
          date_naissance: registration.date_naissance,
          saison,
          equipe: trial.wanted_team,
          email_parent: registration.email_parent,
          telephone_parent: registration.telephone,
          autorisation_photo: registration.autorisation_photo ?? false,
          autorisation_video: registration.autorisation_video ?? false,
          trial_id: trial.id,
          inscription_id: registration.id,
        })
        .select("*")
        .maybeSingle();

      if (athleteError) {
        console.error("Erreur création athlète :", athleteError);
        // On ne bloque pas complètement la réponse, on informe juste
      } else {
        athlete = athleteInserted;
      }
    }

    return NextResponse.json(
      {
        message: "Inscription finalisée. La demande est désormais convertie.",
        trial: { id: trial.id, status: "converted" },
        registration: registration
          ? { id: registration.id, statut: "valide" }
          : null,
        athlete,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Erreur inattendue confirm-registration :", err);
    return NextResponse.json(
      { error: err?.message || "Erreur serveur inattendue." },
      { status: 500 }
    );
  }
}