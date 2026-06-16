import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Sécurité : on n'autorise que ce bucket
const BUCKET = "photos";

// Garde-fous perf
const MAX_DIRS = 2500;           // maximum de dossiers explorés
const LIST_LIMIT = 1000;         // limit supabase list() par dossier
const MAX_FILES_SEEN = 20000;    // stop si trop de fichiers (protection)
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif"]);

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function isImageFile(name: string) {
  const lower = name.toLowerCase();
  const parts = lower.split(".");
  if (parts.length < 2) return false;
  const ext = parts[parts.length - 1];
  return ALLOWED_EXT.has(ext);
}

/**
 * Reservoir sampling : permet de tirer N éléments aléatoires
 * sans stocker toute la liste en mémoire.
 */
function reservoirPush<T>(reservoir: T[], item: T, seen: number, k: number) {
  if (k <= 0) return;
  if (reservoir.length < k) {
    reservoir.push(item);
    return;
  }
  const j = Math.floor(Math.random() * seen);
  if (j < k) reservoir[j] = item;
}

export async function GET(req: Request) {
  try {
    if (!supabaseUrl || !serviceRole) {
      return new NextResponse("Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY", { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const n = clampInt(Number(searchParams.get("n") || "8"), 1, 24);

    // Optionnel : tu peux passer ?prefix=site pour limiter à un sous-dossier
    const startPrefix = (searchParams.get("prefix") || "")
      .replace(/^\/+|\/+$/g, "")
      .trim();

    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false },
    });

    // DFS stack
    const stack: string[] = [startPrefix]; // "" = racine
    const visited = new Set<string>();

    const chosen: Array<{ path: string; url: string }> = [];
    let dirs = 0;
    let filesSeen = 0;

    while (stack.length) {
      const prefix = (stack.pop() || "").replace(/^\/+|\/+$/g, "");
      if (visited.has(prefix)) continue;
      visited.add(prefix);

      if (++dirs > MAX_DIRS) break;

      const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
        limit: LIST_LIMIT,
        sortBy: { column: "name", order: "asc" },
      });

      if (error) {
        return new NextResponse(error.message, { status: 500 });
      }

      for (const it of data || []) {
        const name = it?.name;
        if (!name) continue;

        const isFile = !!it?.id;

        if (isFile) {
          if (!isImageFile(name)) continue;

          const fullPath = prefix ? `${prefix}/${name}` : name;

          const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(fullPath);
          const url = pub?.publicUrl;

          filesSeen++;
          if (url) {
            reservoirPush(chosen, { path: fullPath, url }, filesSeen, n);
          }

          if (filesSeen > MAX_FILES_SEEN) break;
        } else {
          // dossier
          const childPrefix = prefix ? `${prefix}/${name}` : name;
          stack.push(childPrefix);
        }
      }

      if (filesSeen > MAX_FILES_SEEN) break;
    }

    return NextResponse.json({
      ok: true,
      bucket: BUCKET,
      prefix: startPrefix,
      n,
      scanned_dirs: dirs,
      scanned_files: filesSeen,
      items: chosen,
    });
  } catch (e: any) {
    return new NextResponse(e?.message || "Server error", { status: 500 });
  }
}
