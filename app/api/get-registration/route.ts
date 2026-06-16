import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = (searchParams.get("token") || "").trim();

  if (!token) {
    return NextResponse.json({ error: "Token manquant" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("demandes_inscription")
    .select("*")
    .eq("token", token)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || "Demande introuvable" },
      { status: 404 }
    );
  }

  return NextResponse.json({ registration: data }, { status: 200 });
}
