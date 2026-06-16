import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

async function requireBureau(req: Request) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "").trim();

  if (!token) {
    return { ok: false as const, status: 401, error: "Non authentifié" };
  }

  const admin = supabaseAdmin();
  const {
    data: { user },
    error: authError,
  } = await admin.auth.getUser(token);

  if (authError || !user) {
    return { ok: false as const, status: 401, error: "Non authentifié" };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "bureau") {
    return { ok: false as const, status: 403, error: "Accès refusé" };
  }

  return { ok: true as const, userId: user.id, admin };
}

export async function GET(req: Request) {
  try {
    const auth = await requireBureau(req);
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }

    const { data: athletes, error: athletesError } = await auth.admin
      .from("athletes")
      .select("id, prenom, nom, saison, equipe")
      .order("nom", { ascending: true });

    if (athletesError) throw athletesError;

    const { data: links, error: linksError } = await auth.admin
      .from("athlete_access_links")
      .select("athlete_id, user_id, login_email, created_at");

    if (linksError) throw linksError;

    return NextResponse.json({ ok: true, athletes: athletes ?? [], links: links ?? [] });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireBureau(req);
    if (!auth.ok) {
      return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const athleteId = String(body?.athleteId || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");

    if (!athleteId || !email || !password) {
      return NextResponse.json(
        { ok: false, error: "athleteId, email et password sont requis" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Le mot de passe doit contenir au moins 8 caractères." },
        { status: 400 }
      );
    }

    const { data: athlete, error: athleteError } = await auth.admin
      .from("athletes")
      .select("id, prenom, nom, saison, equipe")
      .eq("id", athleteId)
      .maybeSingle();

    if (athleteError) throw athleteError;
    if (!athlete) {
      return NextResponse.json({ ok: false, error: "Athlète introuvable" }, { status: 404 });
    }

    const { data: existingLink } = await auth.admin
      .from("athlete_access_links")
      .select("id")
      .eq("athlete_id", athleteId)
      .maybeSingle();

    if (existingLink) {
      return NextResponse.json(
        { ok: false, error: "Un compte est déjà lié à cet athlète." },
        { status: 409 }
      );
    }

    const fullName = `${athlete.prenom ?? ""} ${athlete.nom ?? ""}`.trim();

    const { data: userData, error: createError } = await auth.admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: "athlete",
        full_name: fullName,
      },
    });

    if (createError || !userData?.user) {
      return NextResponse.json(
        { ok: false, error: createError?.message ?? "Impossible de créer l'utilisateur" },
        { status: 400 }
      );
    }

    const userId = userData.user.id;

    const { error: profileError } = await auth.admin.from("profiles").upsert({
      id: userId,
      role: "athlete",
      full_name: fullName,
    });

    if (profileError) {
      return NextResponse.json(
        { ok: false, error: `Compte créé mais profil incomplet: ${profileError.message}` },
        { status: 500 }
      );
    }

    const { error: linkError } = await auth.admin.from("athlete_access_links").insert({
      athlete_id: athleteId,
      user_id: userId,
      login_email: email,
      created_by: auth.userId,
    });

    if (linkError) {
      return NextResponse.json(
        { ok: false, error: `Compte créé mais liaison impossible: ${linkError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      user: { id: userId, email, role: "athlete" },
      athlete,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Erreur serveur" },
      { status: 500 }
    );
  }
}
