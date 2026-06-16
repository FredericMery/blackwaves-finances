// app/api/get-all-trial-requests/route.ts
// 🔓 Hack SSL DEV uniquement — autorise les certificats locaux
if (process.env.NODE_ENV === "development") {
  // @ts-ignore
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
      console.error("❌ SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquants");
      return NextResponse.json(
        { error: "Configuration Supabase manquante" },
        { status: 500 }
      );
    }

    const supabase = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from("trial_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Supabase error get-all-trial-requests:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // (UX optionnel) : on peut enrichir la liste avec une info "fiche parent reçue"
    // Sans lien fort, on fait une corrélation légère: demandes_inscription par email_parent.
    // Si tu ne veux pas, tu peux supprimer ce bloc.
    const parentEmails = Array.from(
      new Set((data ?? []).map((r: any) => r?.parent_email).filter(Boolean))
    );

    let formsByEmail = new Map<string, number>();
    if (parentEmails.length) {
      const { data: forms, error: formsErr } = await supabase
        .from("demandes_inscription")
        .select("email_parent, statut")
        .in("email_parent", parentEmails);

      if (formsErr) {
        console.warn("⚠️ enrichissement demandes_inscription impossible:", formsErr.message);
      } else {
        for (const f of forms ?? []) {
          const k = (f as any).email_parent;
          formsByEmail.set(k, (formsByEmail.get(k) ?? 0) + 1);
        }
      }
    }

    const registrationTokens = Array.from(
      new Set(
        (data ?? [])
          .map((r: any) => (r?.registration_token || "").toString().trim())
          .filter(Boolean)
      )
    );

    let seasonByToken = new Map<string, string>();
    if (registrationTokens.length) {
      const { data: registrations, error: regErr } = await supabase
        .from("demandes_inscription")
        .select("token,saison")
        .in("token", registrationTokens);

      if (regErr) {
        console.warn(
          "⚠️ enrichissement saison depuis demandes_inscription impossible:",
          regErr.message
        );
      } else {
        for (const reg of registrations ?? []) {
          const token = (reg as any)?.token;
          const saison = (reg as any)?.saison;
          if (token && typeof saison === "string" && saison.trim().length > 0) {
            seasonByToken.set(token, saison);
          }
        }
      }
    }

    const enriched = (data ?? []).map((r: any) => {
      const token = (r?.registration_token || "").toString().trim();
      const fallbackSeason = token ? seasonByToken.get(token) : undefined;

      return {
        ...r,
        saison:
          typeof r?.saison === "string" && r.saison.trim().length > 0
            ? r.saison
            : fallbackSeason || null,
        parentFormsCount: r?.parent_email ? (formsByEmail.get(r.parent_email) ?? 0) : 0,
      };
    });

    return NextResponse.json({ requests: enriched }, { status: 200 });
  } catch (e: any) {
    console.error("❌ Exception get-all-trial-requests:", e);
    return NextResponse.json(
      { error: e.message || "Erreur interne API" },
      { status: 500 }
    );
  }
}
