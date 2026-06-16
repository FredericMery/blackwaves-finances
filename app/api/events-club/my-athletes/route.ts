import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseAnonServer } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function bearer(req: Request) {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

export async function GET(req: Request) {
  try {
    const token = bearer(req);
    if (!token) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const anon = supabaseAnonServer();
    const { data: userData, error: userError } = await anon.auth.getUser(token);
    const email = userData?.user?.email?.toLowerCase().trim();

    if (userError || !email) {
      return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
    }

    const admin = supabaseAdmin();
    const { data, error } = await admin
      .from("athletes")
      .select("id, prenom, nom, equipe")
      .ilike("email_parent", email)
      .order("equipe", { ascending: true })
      .order("prenom", { ascending: true })
      .order("nom", { ascending: true });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, athletes: data || [] });
  } catch (error: unknown) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Erreur serveur inattendue." },
      { status: 500 }
    );
  }
}
