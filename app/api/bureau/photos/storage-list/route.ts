import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ✅ Buckets autorisés (sécurité)
const ALLOWED_BUCKETS = ["photos", "photo-submissions"] as const;
type AllowedBucket = (typeof ALLOWED_BUCKETS)[number];

const DEFAULT_PREFIX = "";

function getToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  const x = req.headers.get("x-bureau-token");
  return (x || "").trim();
}

function assertAuth(req: Request) {
  const needed = process.env.BUREAU_ADMIN_TOKEN;
  if (!needed) return true; // si pas configuré, on ne bloque pas
  const got = getToken(req);
  return !!got && got === needed;
}

type Listed = {
  path: string;
  name: string;
  folder: string;
  url: string;
  created_at?: string | null;
  updated_at?: string | null;
  size?: number | null;
};

// ✅ Cursor solide : stack + reprise dans un dossier (offset)
type CursorState = {
  stack: string[]; // prefixes à explorer (DFS)
  resume?: {
    prefix: string;
    offset: number; // offset dans le listing Supabase de ce prefix
  } | null;
};

function b64Encode(obj: any) {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64");
}

function b64Decode<T>(s: string): T | null {
  try {
    const raw = Buffer.from(s, "base64").toString("utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function cleanPrefix(p: string) {
  return (p || "").replace(/^\/+|\/+$/g, "").trim();
}

export async function GET(req: Request) {
  try {
    if (!supabaseUrl || !serviceRole) {
      return new NextResponse(
        "Missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY",
        { status: 500 }
      );
    }

    if (!assertAuth(req)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const bucketRaw = (searchParams.get("bucket") || "photos").trim();
    const bucket = bucketRaw as AllowedBucket;
    if (!ALLOWED_BUCKETS.includes(bucket)) {
      return new NextResponse("Bucket not allowed", { status: 400 });
    }

    const startPrefix = cleanPrefix(
      searchParams.get("prefix") ?? DEFAULT_PREFIX
    );

    // ✅ limite renvoyée au navigateur (évite payload gigantesque)
    const limit = clampInt(Number(searchParams.get("limit") || "120"), 20, 400);

    // ✅ cursor
    const cursorRaw = (searchParams.get("cursor") || "").trim();
    const cursor = cursorRaw ? b64Decode<CursorState>(cursorRaw) : null;

    const supabase = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false },
    });

    // ✅ init stack + resume
    const stack: string[] = Array.isArray(cursor && cursor.stack)
      ? cursor!.stack.map((x) => cleanPrefix(x))
      : [cleanPrefix(startPrefix)];

    let resume =
      cursor && cursor.resume
        ? { prefix: cleanPrefix(cursor.resume.prefix), offset: Number(cursor.resume.offset) || 0 }
        : null;

    const items: Listed[] = [];

    // ⚠️ garde-fou anti boucle / anti scan infini
    let safetyIterations = 0;
    const SAFETY_MAX_CALLS = 5000;

    // pour éviter des offsets négatifs
    if (resume && resume.offset < 0) resume.offset = 0;

    // on page “dans” un dossier avec offset, et on garde stack pour les dossiers
    const LIST_PAGE = 1000;

    while (items.length < limit && (resume || stack.length)) {
      if (++safetyIterations > SAFETY_MAX_CALLS) break;

      // si pas de resume, on pop un nouveau dossier
      if (!resume) {
        const next = stack.pop();
        if (!next && next !== "") break;
        resume = { prefix: cleanPrefix(next || ""), offset: 0 };
      }

      const prefix = cleanPrefix(resume.prefix);
      const offset = clampInt(Number(resume.offset || 0), 0, 1_000_000_000);

      const { data, error } = await supabase.storage.from(bucket).list(prefix, {
        limit: LIST_PAGE,
        offset, // ✅ la clé du fix
        sortBy: { column: "name", order: "asc" },
      });

      if (error) return new NextResponse(error.message, { status: 500 });

      const list = Array.isArray(data) ? data : [];
      let processed = 0;

      for (let i = 0; i < list.length; i++) {
        const it: any = list[i];
        const name = it && it.name;
        if (!name) {
          processed++;
          continue;
        }

        const isFile = !!it.id;

        if (isFile) {
          const fullPath = prefix ? `${prefix}/${name}` : name;
          const { data: pub } = supabase.storage.from(bucket).getPublicUrl(fullPath);

          const parts = fullPath.split("/").filter(Boolean);
          const folder =
            parts.length >= 2 ? parts[parts.length - 2] : startPrefix || "";

          items.push({
            path: fullPath,
            name: parts[parts.length - 1] || fullPath,
            folder,
            url: pub.publicUrl,
            created_at: it.created_at ?? null,
            updated_at: it.updated_at ?? null,
            size: it.metadata?.size ?? null,
          });
        } else {
          // dossier
          const childPrefix = prefix ? `${prefix}/${name}` : name;
          stack.push(cleanPrefix(childPrefix));
        }

        processed++;

        // ✅ si on atteint la limite, on sauvegarde où on en est EXACTEMENT
        if (items.length >= limit) {
          resume = { prefix, offset: offset + processed };
          break;
        }
      }

      // si on n'a pas break sur limit :
      if (items.length < limit) {
        // dossier terminé si list < LIST_PAGE
        if (list.length < LIST_PAGE) {
          resume = null; // on passe au dossier suivant
        } else {
          // il reste potentiellement des items dans le même dossier
          resume = { prefix, offset: offset + processed };
        }
      }
    }

    // tri “like before”
    items.sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""));

    const next_cursor =
      (resume && (resume.prefix || resume.prefix === "")) || stack.length
        ? b64Encode({ stack, resume })
        : null;

    return NextResponse.json({
      bucket,
      prefix: startPrefix,
      limit,
      count: items.length,
      next_cursor,
      items,
    });
  } catch (e: any) {
    return new NextResponse(e?.message || "Server error", { status: 500 });
  }
}
