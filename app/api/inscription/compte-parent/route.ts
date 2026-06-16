import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceKey);

// GET /api/inscription/compte-parent?token=...
// → Récupère les infos pour afficher sur la page (nom enfant, email parent)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Token manquant." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("demandes_inscription")
    .select("*")
    .eq("token", token)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Lien d'inscription invalide ou expiré." },
      { status: 404 }
    );
  }

  if (data.statut !== "validated") {
    return NextResponse.json(
      { error: "Le dossier n'est pas encore validé." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    email_parent: data.email_parent,
    nom_enfant: data.nom_enfant,
    prenom_enfant: data.prenom_enfant,
  });
}

// POST /api/inscription/compte-parent
// body: { token, password }
export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as {
    token?: string;
    password?: string;
  } | null;

  if (!body?.token || !body?.password) {
    return NextResponse.json(
      { error: "Token ou mot de passe manquant." },
      { status: 400 }
    );
  }

  const { token, password } = body;

  // 1) Récupérer la demande d'inscription
  const { data: demande, error: demandeError } = await supabaseAdmin
    .from("demandes_inscription")
    .select("*")
    .eq("token", token)
    .single();

  if (demandeError || !demande) {
    return NextResponse.json(
      { error: "Dossier introuvable pour ce lien." },
      { status: 404 }
    );
  }

  if (demande.statut !== "validated") {
    return NextResponse.json(
      { error: "Le dossier n'est pas encore validé." },
      { status: 400 }
    );
  }

  const email = demande.email_parent as string;
  const fullName = `${demande.prenom_enfant} ${demande.nom_enfant}`;

  // 2) Créer l'utilisateur auth Supabase
  const { data: userData, error: userError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: "parent",
      },
    });

  if (userError || !userData?.user) {
    console.error("Erreur création user parent:", userError);
    return NextResponse.json(
      { error: "Impossible de créer le compte parent (utilisateur déjà existant ?)." },
      { status: 400 }
    );
  }

  const userId = userData.user.id;

  // 3) Créer / mettre à jour le profil dans public.profiles
  // On suppose une table profiles(id uuid PK, email text, full_name text, role text, created_at)
  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert({
      id: userId,
      email,
      full_name: fullName,
      role: "parent",
    });

  if (profileError) {
    console.error("Erreur upsert profile parent:", profileError);
    return NextResponse.json(
      { error: "Compte créé, mais impossible d'enregistrer le profil." },
      { status: 500 }
    );
  }

  // 4) Mettre à jour la demande d'inscription comme "completed"
  const { error: updateError } = await supabaseAdmin
    .from("demandes_inscription")
    .update({ statut: "completed" })
    .eq("token", token);

  if (updateError) {
    console.error("Erreur update demandes_inscription:", updateError);
    // On ne bloque pas pour autant le login du parent
  }

  return NextResponse.json({
    success: true,
    message: "Compte parent créé avec succès.",
  });
}
