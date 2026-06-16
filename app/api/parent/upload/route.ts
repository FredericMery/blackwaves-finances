import { NextResponse } from "next/server";
import { supabaseAdmin, supabaseAnonServer } from "@/lib/supabase/admin";

function bearer(req: Request) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1] || null;
}

export async function POST(req: Request) {
  const token = bearer(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const anon = supabaseAnonServer();
  const { data: userData, error: userErr } = await anon.auth.getUser(token);
  if (userErr || !userData?.user?.email) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
  const email = userData.user.email.toLowerCase();

  const admin = supabaseAdmin();

  // parent autorisé
  const { data: allowed } = await admin
    .from("parents_autorises")
    .select("email, actif")
    .eq("email", email)
    .maybeSingle();
  if (!allowed?.actif) return NextResponse.json({ error: "Parent non autorisé" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const doc_type = String(form.get("doc_type") || "");
  const saison = String(form.get("saison") || "");
  const athlete_id = String(form.get("athlete_id") || "");

  if (!file || !doc_type) {
    return NextResponse.json({ error: "file/doc_type manquant" }, { status: 400 });
  }

  // garde-fous
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "PDF uniquement" }, { status: 400 });
  }
  const maxMb = 10;
  if (file.size > maxMb * 1024 * 1024) {
    return NextResponse.json({ error: `Fichier > ${maxMb}MB` }, { status: 400 });
  }

  const ts = Date.now();
  const safeEmail = email.replace(/[^a-z0-9@._-]/gi, "_");
  const safeType = doc_type.replace(/[^a-z0-9._-]/gi, "_");
  const safeSaison = (saison || "saison_inconnue").replace(/[^a-z0-9._-]/gi, "_");
  const safeAthlete = athlete_id || "unknown_athlete";

  const path = `${safeEmail}/${safeSaison}/${safeAthlete}/${safeType}_${ts}.pdf`;

  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: upErr } = await admin.storage
    .from("parent-documents")
    .upload(path, bytes, { contentType: "application/pdf", upsert: false });

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // (option) URL signée courte durée
  const { data: signed } = await admin.storage
    .from("parent-documents")
    .createSignedUrl(path, 60 * 60 * 24 * 7); // 7 jours

  const file_url = signed?.signedUrl || null;

  const { error: insErr, data: row } = await admin
    .from("parent_documents")
    .insert({
      parent_email: email,
      athlete_id: athlete_id || null,
      saison: saison || null,
      doc_type,
      file_path: path,
      file_url,
      status: "uploaded",
    })
    .select("*")
    .single();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, document: row });
}
