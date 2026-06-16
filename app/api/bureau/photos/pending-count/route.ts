import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { count, error } = await supabaseAdmin
    .from("photo_submissions")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) {
    return NextResponse.json(
      { ok: false, error: `Erreur count pending: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, count: count ?? 0 }, { status: 200 });
}
