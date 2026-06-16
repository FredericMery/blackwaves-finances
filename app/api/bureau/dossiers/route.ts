import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const REQUIRED_DOC_TYPES = ["certificat_medical", "autorisation_parentale"] as const;

function calcCompleteness(validDocTypes: Set<string>) {
  const total = REQUIRED_DOC_TYPES.length;
  const ok = REQUIRED_DOC_TYPES.filter((t) => validDocTypes.has(t)).length;
  return { ok, total, pct: total ? Math.round((ok / total) * 100) : 0 };
}

export async function GET() {
  const admin = supabaseAdmin();

  // 1) Enfants (source V1 : demandes_inscription)
  const { data: regs, error: regErr } = await admin
    .from("demandes_inscription")
    .select("id, saison, statut, athlete_id, prenom_enfant, nom_enfant, date_naissance, email_parent, created_at")
    .order("created_at", { ascending: false });

  if (regErr) return NextResponse.json({ error: regErr.message }, { status: 500 });

  const parentEmails = Array.from(
    new Set((regs || []).map((r) => (r.email_parent || "").toLowerCase()).filter(Boolean))
  );

  // 2) Documents parent (inclure file_url pour “ouvrir”)
  const { data: docs, error: docErr } = await admin
    .from("parent_documents")
    .select("id, parent_email, athlete_id, saison, doc_type, status, review_comment, file_url, created_at")
    .in("parent_email", parentEmails.length ? parentEmails : ["__none__"]);

  if (docErr) return NextResponse.json({ error: docErr.message }, { status: 500 });

  // 3) Suivi dossier (cotisation)
  const { data: suivis, error: suErr } = await admin
    .from("dossier_suivi")
    .select("id, parent_email, athlete_id, saison, cotisation_payee, updated_at")
    .in("parent_email", parentEmails.length ? parentEmails : ["__none__"]);

  if (suErr) return NextResponse.json({ error: suErr.message }, { status: 500 });

  // Index docs par (parent_email + athlete_id + saison)
  const docsMap = new Map<string, any[]>();
  for (const d of docs || []) {
    const key = `${(d.parent_email || "").toLowerCase()}|${d.athlete_id || "unknown"}|${d.saison || ""}`;
    docsMap.set(key, [...(docsMap.get(key) || []), d]);
  }

  // Index suivi
  const suiviMap = new Map<string, any>();
  for (const s of suivis || []) {
    const key = `${(s.parent_email || "").toLowerCase()}|${s.athlete_id || "unknown"}|${s.saison || ""}`;
    suiviMap.set(key, s);
  }

  const dossiers = (regs || []).map((r) => {
    const email = (r.email_parent || "").toLowerCase();
    const key = `${email}|${r.athlete_id || "unknown"}|${r.saison || ""}`;
    const rowDocs = docsMap.get(key) || [];

    // Validés uniquement pour la complétude
    const validSet = new Set(rowDocs.filter((x) => x.status === "validated").map((x) => x.doc_type));
    const comp = calcCompleteness(validSet);

    const suivi = suiviMap.get(key) || null;

    return {
      registration_id: r.id,
      saison: r.saison,
      statut: r.statut,
      athlete_id: r.athlete_id,
      enfant: { prenom: r.prenom_enfant, nom: r.nom_enfant, naissance: r.date_naissance },
      parent_email: email,
      documents: rowDocs,
      completeness: comp,
      cotisation_payee: suivi?.cotisation_payee || false,
    };
  });

  return NextResponse.json({ dossiers });
}
