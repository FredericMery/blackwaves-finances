import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const admin = supabaseAdmin();
  const body = await req.json().catch(() => null);

  const document_id = body?.document_id as string | undefined;
  const status = body?.status as "validated" | "rejected" | "uploaded" | undefined;
  const review_comment = (body?.review_comment as string | undefined) || null;

  if (!document_id || !status) {
    return NextResponse.json({ error: "document_id/status manquant" }, { status: 400 });
  }

  if (!["validated", "rejected", "uploaded"].includes(status)) {
    return NextResponse.json({ error: "status invalide" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("parent_documents")
    .update({ status, review_comment })
    .eq("id", document_id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, document: data });
}
