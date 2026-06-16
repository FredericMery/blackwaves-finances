import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getNextSeasonLabel, isReinscriptionOpen } from "@/lib/season";

function normalizeEmail(v: any) {
  const s = String(v || "").trim().toLowerCase();
  return s || null;
}

export async function POST(req: Request) {
  const admin = supabaseAdmin();

  // 1) Auth Bearer
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // 2) Vérifie user
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user?.email) {
    return NextResponse.json({ error: "Session invalide" }, { status: 401 });
  }
  const email = normalizeEmail(userData.user.email);
  if (!email) return NextResponse.json({ error: "Email introuvable" }, { status: 400 });

  // 3) Fenêtre réinscription
  if (!isReinscriptionOpen(new Date())) {
    return NextResponse.json(
      { error: "Ré-inscription fermée (ouverte de juin à octobre)." },
      { status: 403 }
    );
  }


  const nextSeason = getNextSeasonLabel(new Date());

  // 4) Enfants rattachés à ce parent (source : demandes_inscription)
  const { data: children, error: childErr } = await admin
    .from("demandes_inscription")
    .select(
      "id, token, email_parent, telephone, adresse, nom_enfant, prenom_enfant, date_naissance, autorisation_photo, autorisation_video, athlete_id, saison, statut, created_at"
    )
    .eq("email_parent", email)
    .order("created_at", { ascending: false });

  if (childErr) return NextResponse.json({ error: childErr.message }, { status: 500 });

  if (!children || children.length === 0) {
    return NextResponse.json({ error: "Aucun enfant rattaché à ce compte." }, { status: 404 });
  }

  // 5) Pour chaque enfant, check si déjà une demande pour nextSeason
  // clé = (email_parent + athlete_id + saison + prenom/nom) pour couvrir les cas athlete_id null
  const created: any[] = [];
  const skipped: any[] = [];

  for (const c of children) {
    // on réinscrit l’athlète (si athlete_id dispo), sinon on reprend identité
    const athleteId = c.athlete_id || null;

    let existsQuery = admin
      .from("demandes_inscription")
      .select("id")
      .eq("email_parent", email)
      .eq("saison", nextSeason)
      .eq("prenom_enfant", c.prenom_enfant)
      .eq("nom_enfant", c.nom_enfant);

    if (athleteId) existsQuery = existsQuery.eq("athlete_id", athleteId);

    const { data: existing, error: exErr } = await existsQuery.maybeSingle();
    if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });

    if (existing?.id) {
      skipped.push({ prenom: c.prenom_enfant, nom: c.nom_enfant });
      continue;
    }

    const tokenNew = crypto.randomUUID();

    const payload = {
      token: tokenNew,
      email_parent: email,
      telephone: c.telephone || null,
      adresse: c.adresse || null,
      nom_enfant: c.nom_enfant,
      prenom_enfant: c.prenom_enfant,
      date_naissance: c.date_naissance || null,
      autorisation_photo: Boolean(c.autorisation_photo),
      autorisation_video: Boolean(c.autorisation_video),
      statut: "reinscription_draft",
      saison: nextSeason,
      athlete_id: athleteId,
    };

    const { data: ins, error: insErr } = await admin
      .from("demandes_inscription")
      .insert(payload)
      .select("id, token, prenom_enfant, nom_enfant, saison, statut")
      .single();

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    created.push(ins);
  }

  return NextResponse.json({
    ok: true,
    nextSeason,
    created_count: created.length,
    skipped_count: skipped.length,
    created,
    skipped,
  });
}
