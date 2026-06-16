import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseAnonServer } from "@/lib/supabase/admin";

function bearer(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

export async function GET(req: Request) {
  const token = bearer(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1) Vérifie l'utilisateur via l'API Auth Supabase (anon + access_token)
  const anon = supabaseAnonServer();
  const { data: userData, error: userErr } = await anon.auth.getUser(token);
  if (userErr || !userData?.user?.email) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
  const email = userData.user.email.toLowerCase();

  const admin = supabaseAdmin();

  // 2) Sécurité: vérifie que le parent est autorisé
  const { data: allowed, error: allowErr } = await admin
    .from("parents_autorises")
    .select("email, actif")
    .eq("email", email)
    .maybeSingle();

  if (allowErr || !allowed?.actif) {
    return NextResponse.json({ error: "Parent non autorisé" }, { status: 403 });
  }

  // 3) Enfants: source de vérité = demandes_inscription
  const { data: regs, error: regErr } = await admin
    .from("demandes_inscription")
    .select("id, saison, statut, athlete_id, prenom_enfant, nom_enfant, date_naissance")
    .eq("email_parent", email)
    .order("created_at", { ascending: false });

  if (regErr) return NextResponse.json({ error: regErr.message }, { status: 500 });

  // 4) Documents
  const { data: docs, error: docErr } = await admin
    .from("parent_documents")
    .select("id, athlete_id, saison, doc_type, file_path, file_url, status, created_at")
    .eq("parent_email", email)
    .order("created_at", { ascending: false });

  if (docErr) return NextResponse.json({ error: docErr.message }, { status: 500 });

  return NextResponse.json({
    parent: { email },
    children: regs || [],
    documents: docs || [],
  });
}
