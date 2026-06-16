import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ✅ IMPORTANT (Next.js 16): params est une Promise
async function getId(context: { params: Promise<{ id: string }> }) {
  const p = await context.params;
  const id = p?.id;
  if (!id) throw new Error("Paramètre id manquant.");
  return id;
}

function safeFilename(name: string) {
  const n = (name || "image")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
  return n || "image";
}

function extFromMime(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "";
}

// Bucket unifié (évite mismatch front/back)
const BUCKET =
  process.env.SUPABASE_GOODIES_BUCKET ||
  process.env.NEXT_PUBLIC_GOODIES_BUCKET ||
  "goodies";

function json(ok: boolean, payload: any, status = 200) {
  return NextResponse.json({ ok, ...payload }, { status });
}

/**
 * GET:
 * - /api/bureau/goodies/products/[id]/hero            -> prend hero_image_path en DB
 * - /api/bureau/goodies/products/[id]/hero?path=...  -> prend le path fourni
 * Renvoie publicUrl + signedUrl
 */
export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getAdmin();
    const productId = await getId(context);

    const url = new URL(req.url);
    let path = (url.searchParams.get("path") || "").trim();

    if (!path) {
      const { data, error } = await supabase
        .from("goodies_products")
        .select("hero_image_path")
        .eq("id", productId)
        .single();

      if (error) return json(false, { error: `Supabase goodies_products.get(hero): ${error.message}` }, 400);
      path = String(data?.hero_image_path || "").trim();
    }

    if (!path) return json(false, { error: "Aucune image hero définie." }, 404);

    const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

    // Signed URL marche même si bucket privé (et aussi si bucket public)
    const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60); // 1h
    if (signed.error) return json(false, { error: `Supabase storage.createSignedUrl: ${signed.error.message}` }, 400);

    return json(true, { path, bucket: BUCKET, publicUrl, signedUrl: signed.data.signedUrl });
  } catch (e: any) {
    return json(false, { error: e?.message || "Erreur" }, 500);
  }
}

/**
 * POST:
 * - multipart/form-data avec field "file"
 * - optionnels: alt, sort_order, is_hero ("true"/"false")
 * Upload + insert row image + set hero_image_path si is_hero
 * Renvoie path + publicUrl + signedUrl
 */
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const supabase = getAdmin();
    const productId = await getId(context);

    const ct = (req.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("multipart/form-data")) {
      return json(false, { error: `Hero upload: content-type invalide (${ct || "inconnu"})` }, 400);
    }

    const fd = await req.formData();
    const file = fd.get("file");

    if (!(file instanceof File)) {
      return json(false, { error: "Hero upload: fichier manquant (field 'file')." }, 400);
    }
    if (!file.type?.startsWith("image/")) {
      return json(false, { error: `Hero upload: type non supporté (${file.type}).` }, 400);
    }

    const maxBytes = 8 * 1024 * 1024; // 8 Mo
    if (file.size > maxBytes) {
      return json(false, { error: "Hero upload: fichier trop volumineux (max 8 Mo)." }, 400);
    }

    const alt = String(fd.get("alt") || "").trim() || null;
    const sort_order = Number(fd.get("sort_order") || 100);
    const is_hero = String(fd.get("is_hero") || "false") === "true";

    const orig = safeFilename(file.name);
    const mimeExt = extFromMime(file.type);
    const origExt = orig.includes(".") ? orig.split(".").pop() : "";
    const ext = (mimeExt || origExt || "jpg").toLowerCase();

    const base = `${Date.now()}-${orig}`.replace(/\.+/g, ".");
    const finalName = base.endsWith(`.${ext}`) ? base : `${base}.${ext}`;
    const path = `products/${productId}/${finalName}`;

    const bytes = new Uint8Array(await file.arrayBuffer());

    const up = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: file.type,
      upsert: true,
      cacheControl: "3600",
    });
    if (up.error) {
      return json(false, { error: `Supabase storage.upload: ${up.error.message}` }, 400);
    }

    // Table images (tu as déjà ce nom visiblement)
    const { error: imgErr } = await supabase.from("goodies_product_images").insert({
      product_id: productId,
      path,
      alt,
      sort_order: Number.isFinite(sort_order) ? sort_order : 100,
      is_hero,
    });

    if (imgErr) {
      return json(false, { error: `Supabase goodies_product_images.insert: ${imgErr.message}` }, 400);
    }

    if (is_hero) {
      const { error: pErr } = await supabase
        .from("goodies_products")
        .update({ hero_image_path: path })
        .eq("id", productId);

      if (pErr) {
        return json(false, { error: `Supabase goodies_products.update(hero_image_path): ${pErr.message}` }, 400);
      }
    }

    const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
    if (signed.error) {
      return json(false, { error: `Supabase storage.createSignedUrl: ${signed.error.message}` }, 400);
    }

    return json(true, {
      path,
      bucket: BUCKET,
      is_hero,
      publicUrl,
      signedUrl: signed.data.signedUrl,
    });
  } catch (e: any) {
    return json(false, { error: e?.message || "Erreur" }, 500);
  }
}
