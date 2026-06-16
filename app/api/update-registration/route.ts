// app/api/update-registration/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("[update-registration] Missing SUPABASE_URL or SERVICE_ROLE");
}

const supabase =
  SUPABASE_URL && SERVICE_ROLE
    ? createClient(SUPABASE_URL as string, SERVICE_ROLE as string, {
        auth: { persistSession: false },
      })
    : null;

export async function POST(req: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "Configuration Supabase manquante (serveur)." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Corps de requête invalide." },
        { status: 400 }
      );
    }

    const {
      token,
      email_parent,
      telephone,
      adresse,
      nom_enfant,
      prenom_enfant,
      date_naissance,
      autorisation_photo,
      autorisation_video,
    } = body;

    if (!token) {
      return NextResponse.json({ error: "Token manquant." }, { status: 400 });
    }

    const parentEmailNorm = (email_parent || "").toString().trim().toLowerCase();

    // 1) Mettre à jour demandes_inscription
    const { data: updated, error: updateError } = await supabase
      .from("demandes_inscription")
      .update({
        email_parent: parentEmailNorm || null,
        telephone: (telephone || "").toString().trim() || null,
        adresse: (adresse || "").toString().trim() || null,
        nom_enfant: (nom_enfant || "").toString().trim() || null,
        prenom_enfant: (prenom_enfant || "").toString().trim() || null,
        date_naissance: date_naissance || null,
        autorisation_photo: !!autorisation_photo,
        autorisation_video: !!autorisation_video,
        statut: "parent-complete", // ✅ cohérent avec le reste
      })
      .eq("token", token)
      .select("*")
      .maybeSingle();

    if (updateError) {
      console.error(
        "[update-registration] demandes_inscription update error:",
        updateError
      );
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour de la demande d’inscription." },
        { status: 500 }
      );
    }

    if (!updated) {
      return NextResponse.json(
        { error: "Aucune demande d’inscription trouvée pour ce token." },
        { status: 404 }
      );
    }

    // ✅ Saison à propager à l’athlète
    const saison = (updated as any)?.saison || null;

    // 2) Mettre à jour trial_requests.status
    const NEW_STATUS = "parent-created";
    let trialUpdate: {
      ok: boolean;
      method?: string;
      trial_id?: string;
      note?: string;
    } = { ok: false };

    // 2.A by registration_token
    const { data: updByToken, error: updByTokenErr } = await supabase
      .from("trial_requests")
      .update({ status: NEW_STATUS } as any)
      .eq("registration_token", token)
      .select("id")
      .maybeSingle();

    if (updByTokenErr) {
      console.error(
        "[update-registration] trial_requests update by token error:",
        updByTokenErr
      );
    }

    if (updByToken?.id) {
      trialUpdate = {
        ok: true,
        method: "registration_token",
        trial_id: updByToken.id,
      };
    } else {
      // 2.B fallback : parent_email + statut en cours
      if (!parentEmailNorm) {
        trialUpdate = {
          ok: false,
          note: "Missing email_parent for fallback matching.",
        };
      } else {
        const { data: candidate, error: candErr } = await supabase
          .from("trial_requests")
          .select("id,status,created_at")
          .eq("parent_email", parentEmailNorm)
          .in("status", ["parent-pending", "draft"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (candErr) {
          console.error(
            "[update-registration] candidate trial_requests select error:",
            candErr
          );
        }

        if (candidate?.id) {
          const { error: updErr2 } = await supabase
            .from("trial_requests")
            .update({ status: NEW_STATUS } as any)
            .eq("id", candidate.id);

          if (updErr2) {
            console.error(
              "[update-registration] trial_requests update by id error:",
              updErr2
            );
          } else {
            trialUpdate = {
              ok: true,
              method: "parent_email_pending_latest",
              trial_id: candidate.id,
            };
          }
        } else {
          trialUpdate = {
            ok: false,
            note: "No trial_requests matched for token or parent_email.",
          };
          console.warn("[update-registration] No trial_requests match:", {
            token,
            email_parent: parentEmailNorm,
          });
        }
      }
    }

    // 3) Athlete (best effort) — avec saison si colonne présente
    let athleteResult: any = null;
    let athleteError: string | null = null;

    try {
      const { data: athlete, error: athleteInsertError } = await supabase
        .from("athletes")
        .insert({
          nom: (nom_enfant || "").toString().trim() || null,
          prenom: (prenom_enfant || "").toString().trim() || null,
          date_naissance: date_naissance || null,
          email_parent: parentEmailNorm || null,
          telephone: (telephone || "").toString().trim() || null,
          adresse: (adresse || "").toString().trim() || null,
          saison, // ✅ injectée depuis demandes_inscription.saison
        } as any)
        .select("*")
        .maybeSingle();

      if (athleteInsertError) {
        console.error(
          "[update-registration] athlete insert error:",
          athleteInsertError
        );
        athleteError =
          athleteInsertError?.message ||
          "Erreur lors de la création de l’athlète.";
      } else {
        athleteResult = athlete;
      }
    } catch (e: any) {
      console.error("[update-registration] athlete insert exception:", e);
      athleteError = "Erreur technique lors de la création de l’athlète.";
    }

    return NextResponse.json(
      {
        message:
          "Merci, votre fiche d’inscription a bien été complétée et enregistrée.",
        registration: updated,
        trialUpdate,
        athlete: athleteResult,
        athleteError,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[update-registration] unexpected error:", err);
    return NextResponse.json(
      { error: err?.message || "Erreur serveur inattendue." },
      { status: 500 }
    );
  }
}
