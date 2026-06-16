import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BUCKET = "photos";

function getToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  const x = req.headers.get("x-bureau-token");
  return x?.trim() || "";
}

function assertAuth(req: Request) {
  const needed = process.env.BUREAU_ADMIN_TOKEN;
  if (!needed) return true;
  const got = getToken(req);
  return got && got === needed;
}

function baseName(path: string) {
  const p = path.replace(/^\/+|\/+$/g, "");
  const parts = p.split("/").filter(Boolean);
  return parts[parts.length - 1] || p;
}

function safeHeroName(filename: string) {
  // évite des caractères bizarres
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function listAllInPrefix(supabase: any, prefix: string) {
  // liste simple (1 niveau) pour hero/ (on n'a pas besoin de récursif ici)
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) throw new Error(error.message);
  return (data || []).filter((x: any) => !!x?.id).map((x: any) => `${prefix}/${x.name}`);
}

export async function POST(req: Request) {
  try {
    if (!supabaseUrl || !serviceRole) {
      return new NextResponse("Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY", { status: 500 });
    }
    if (!assertAuth(req)) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json().catch(() => null);
    const paths: string[] = Array.isArray(body?.paths) ? body.paths : [];
    const mode: "append" | "replace" = body?.mode === "replace" ? "replace" : "append";

    if (paths.length === 0) return new NextResponse("Missing paths", { status: 400 });

    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false },
    });

    // 1) replace => on vide hero/
    if (mode === "replace") {
      const heroFiles = await listAllInPrefix(supabase, "hero");
      if (heroFiles.length) {
        const { error } = await supabase.storage.from(BUCKET).remove(heroFiles);
        if (error) return new NextResponse(error.message, { status: 500 });
      }
    }

    // 2) on copie vers hero/
    const results: Array<{ from: string; to: string; ok: boolean; error?: string }> = [];

    for (const fromRaw of paths) {
      const from = String(fromRaw || "").replace(/^\/+|\/+$/g, "");
      if (!from) continue;

      // sécurité : on refuse tout ce qui n’est pas dans ce bucket (on est déjà dans BUCKET=photos)
      // et on évite de recopier hero -> hero
      if (from.startsWith("hero/")) {
        results.push({ from, to: from, ok: true });
        continue;
      }

      const filename = safeHeroName(baseName(from));
      const to = `hero/${filename}`;

      // si collision, on suffixe
      // (sinon supabase copy renvoie erreur)
      let finalTo = to;
      for (let i = 0; i < 5; i++) {
        const { data: exists } = await supabase.storage.from(BUCKET).list("hero", {
          limit: 1000,
        });
        const existsNames = new Set((exists || []).map((x: any) => x?.name).filter(Boolean));
        if (!existsNames.has(filename)) break;
        finalTo = `hero/${Date.now()}_${filename}`;
        break;
      }

      const { error } = await supabase.storage.from(BUCKET).copy(from, finalTo);
      if (error) {
        results.push({ from, to: finalTo, ok: false, error: error.message });
      } else {
        results.push({ from, to: finalTo, ok: true });
      }
    }

    return NextResponse.json({ ok: true, mode, results });
  } catch (e: any) {
    return new NextResponse(e?.message || "Server error", { status: 500 });
  }
}
