import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ⚠️ Service role uniquement côté serveur
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = "photo-submissions";
const MAX_FILES = 4;

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const parent_email = String(form.get("parent_email") || "").trim().toLowerCase();
    const parent_name = String(form.get("parent_name") || "").trim();

    const season = String(form.get("season") || "").trim();
    const team = String(form.get("team") || "").trim();
    const photo_type = String(form.get("photo_type") || "").trim();
    const title = String(form.get("title") || "").trim();
    const description = String(form.get("description") || "").trim();

    if (!parent_email) return json(400, { ok: false, error: "Email parent manquant." });

    // ✅ Vérif parent autorisé
    const auth = await supabaseAdmin
      .from("parents_autorises")
      .select("email, actif")
      .eq("email", parent_email)
      .maybeSingle();

    if (auth.error) return json(500, { ok: false, error: "Erreur vérification parent." });
    if (!auth.data || auth.data.actif !== true) {
      return json(403, { ok: false, error: "Accès refusé : parent non autorisé." });
    }

    // Récupère les fichiers
    const files: File[] = [];
    for (let i = 0; i < MAX_FILES; i++) {
      const f = form.get(`file_${i}`) as File | null;
      if (f) files.push(f);
    }

    if (files.length === 0) return json(400, { ok: false, error: "Aucune photo fournie." });
    if (files.length > MAX_FILES) return json(400, { ok: false, error: "Max 4 photos." });

    const insertedIds: string[] = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        return json(400, { ok: false, error: "Fichier invalide (image uniquement)." });
      }
      if (file.size > 8 * 1024 * 1024) {
        return json(400, { ok: false, error: "Une photo dépasse 8 Mo." });
      }

      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const filename = `${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
      const path = `pending/${season || "unknown"}/${filename}`;

      const arrayBuffer = await file.arrayBuffer();
      const upload = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(path, new Uint8Array(arrayBuffer), {
          contentType: file.type,
          upsert: false,
          cacheControl: "3600",
        });

      if (upload.error) {
        return json(500, { ok: false, error: `Upload KO: ${upload.error.message}` });
      }

      const pub = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
      const url = pub.data.publicUrl;

      const ins = await supabaseAdmin.from("photo_submissions").insert([
        {
          parent_email,
          parent_name: parent_name || null,
          season: season || null,
          team: team || null,
          photo_type: photo_type || null,
          title: title || null,
          description: description || null,
          url,
          storage_bucket: BUCKET,
          storage_path: path,
          status: "pending",
        },
      ]).select("id").single();

      if (ins.error) {
        return json(500, { ok: false, error: `Insert KO: ${ins.error.message}` });
      }

      insertedIds.push(ins.data.id);
    }

    return json(200, { ok: true, ids: insertedIds });
  } catch (e: any) {
    return json(500, { ok: false, error: "Erreur serveur submit." });
  }
}
