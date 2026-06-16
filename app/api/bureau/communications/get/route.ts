import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 })
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1️⃣ Récupération communication
    const { data: communication, error: commError } = await supabase
      .from("com_communications")
      .select("*")
      .eq("id", id)
      .single()

    if (commError) throw commError

    // 2️⃣ Récupération recipients (sans colonnes douteuses)
    const { data: recipients, error: recError } = await supabase
      .from("com_recipients")
      .select("*")
      .eq("communication_id", id)

    if (recError) throw recError

    return NextResponse.json({
      ok: true,
      data: {
        ...communication,
        com_recipients: recipients || []
      }
    })

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}