// app/api/get-trial-request/route.ts

// 🔓 DEV uniquement : éviter les erreurs de certificat local avec Supabase
if (process.env.NODE_ENV === "development") {
  // @ts-ignore
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "[get-trial-request] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquants"
  );
}

const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false },
      })
    : null;

export async function GET(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "Configuration Supabase manquante." },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Identifiant de demande d’essai manquant." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("trial_requests")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      console.error("[get-trial-request] Supabase error :", error);
      return NextResponse.json(
        { error: "Impossible de charger la demande d’essai." },
        { status: 500 }
      );
    }

    console.log("[get-trial-request] OK pour id :", id);

    return NextResponse.json({ request: data }, { status: 200 });
  } catch (e: any) {
    console.error("[get-trial-request] Exception :", e);
    return NextResponse.json(
      { error: e?.message || "Erreur interne API." },
      { status: 500 }
    );
  }
}