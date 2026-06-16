import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const trialId = (body?.trial_id || "").toString().trim();

    if (!trialId) {
      return NextResponse.json(
        { ok: false, error: "Identifiant de demande d'essai manquant." },
        { status: 400 }
      );
    }

    let supabase;
    try {
      supabase = supabaseAdmin();
    } catch (err) {
      console.error("[delete-trial-request] Supabase config error:", err);
      return NextResponse.json(
        { ok: false, error: "Configuration serveur invalide." },
        { status: 500 }
      );
    }

    const { data: trial, error: trialLoadError } = await supabase
      .from("trial_requests")
      .select("id,status,registration_token")
      .eq("id", trialId)
      .maybeSingle();

    if (trialLoadError) {
      console.error("[delete-trial-request] trial load error:", trialLoadError);
      return NextResponse.json(
        { ok: false, error: "Impossible de charger la demande d'essai." },
        { status: 500 }
      );
    }

    if (!trial) {
      return NextResponse.json(
        { ok: false, error: "Demande d'essai introuvable." },
        { status: 404 }
      );
    }

    if (trial.status === "converted") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Suppression refusée: cette demande est déjà convertie en inscription.",
        },
        { status: 409 }
      );
    }

    let deletedRegistrationCount = 0;
    const token = (trial.registration_token || "").toString().trim();

    if (token) {
      const { error: regDeleteError, count } = await supabase
        .from("demandes_inscription")
        .delete({ count: "exact" })
        .eq("token", token);

      if (regDeleteError) {
        console.error(
          "[delete-trial-request] demandes_inscription delete error:",
          regDeleteError
        );
        return NextResponse.json(
          {
            ok: false,
            error:
              "Impossible de supprimer la fiche parent associée à la demande.",
          },
          { status: 500 }
        );
      }

      deletedRegistrationCount = count || 0;
    }

    const { error: trialDeleteError } = await supabase
      .from("trial_requests")
      .delete()
      .eq("id", trialId);

    if (trialDeleteError) {
      console.error(
        "[delete-trial-request] trial_requests delete error:",
        trialDeleteError
      );
      return NextResponse.json(
        { ok: false, error: "Impossible de supprimer la demande d'essai." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Demande d'essai supprimée.",
      deletedTrialId: trialId,
      deletedRegistrationCount,
    });
  } catch (err: any) {
    console.error("[delete-trial-request] unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Erreur serveur inattendue." },
      { status: 500 }
    );
  }
}
