import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function checkBureauAuth(req: Request) {
  const token = process.env.BUREAU_ADMIN_TOKEN;
  if (!token) return true; // si pas de token -> mode dev
  const got = req.headers.get("x-bw-admin-token");
  return got === token;
}

export async function GET(req: Request) {
  if (!checkBureauAuth(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("photo_submissions")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { ok: false, error: `Erreur fetch pending: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, items: data || [] }, { status: 200 });
}
