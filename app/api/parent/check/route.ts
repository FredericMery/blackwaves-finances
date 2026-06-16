import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const emailRaw = String(body?.email || "");
    const email = normalizeEmail(emailRaw);

    if (!email || !email.includes("@")) {
      return NextResponse.json({ ok: false, allowed: false }, { status: 200 });
    }

    if (!SUPABASE_URL || !SERVICE_ROLE) {
      console.error("[parent/check] Missing SUPABASE_URL or SERVICE_ROLE");
      return NextResponse.json({ ok: false, allowed: false }, { status: 500 });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    const { data, error } = await admin
      .from("parents_autorises")
      .select("email, actif")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error("[parent/check] supabase error:", error);
      return NextResponse.json({ ok: false, allowed: false }, { status: 500 });
    }

    const allowed = !!data && data.actif === true;
    return NextResponse.json({ ok: true, allowed }, { status: 200 });
  } catch (e) {
    console.error("[parent/check] unexpected error:", e);
    return NextResponse.json({ ok: false, allowed: false }, { status: 500 });
  }
}
