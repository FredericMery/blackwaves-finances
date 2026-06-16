// app/api/get-full-registration/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const trialId = searchParams.get("trial_id");

    if (!trialId) {
      return NextResponse.json(
        { error: "Identifiant de demande d’essai manquant (trial_id)." },
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

    // 2) Récupérer la demande d’inscription parent si un token existe
    let registration = null;

    if (trial.registration_token) {
      const { data: reg, error: regError } = await supabase
        .from("demandes_inscription")
        .select("*")
        .eq("token", trial.registration_token)
        .maybeSingle();

      if (regError) {
        console.error("Erreur Supabase demandes_inscription :", regError);
        return NextResponse.json(
          { error: "Erreur lors de la récupération de la fiche d’inscription." },
          { status: 500 }
        );
      }

      registration = reg;
    }

    return NextResponse.json(
      {
        trial,
        registration,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Erreur inattendue get-full-registration :", err);
    return NextResponse.json(
      { error: err?.message || "Erreur serveur inattendue." },
      { status: 500 }
    );
  }
}