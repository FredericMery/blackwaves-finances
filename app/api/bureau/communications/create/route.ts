import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { type, saison, title, subject, content, questions } = body

    const stripTags = (s: any) => {
      if (s == null) return ""
      return String(s)
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
        .replace(/on\w+=\"[^\"]*\"/gi, "")
        .replace(/on\w+=\'[^\']*\'/gi, "")
        .replace(/<[^>]+>/g, "")
        .trim()
    }

    const sanitizeHtml = (s: any) => {
      if (s == null) return ""
      return String(s)
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
        .replace(/on\w+=\"[^\"]*\"/gi, "")
        .replace(/on\w+=\'[^\']*\'/gi, "")
        .trim()
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let dbType = type
    if (type === "email") dbType = "autre"
    if (type === "survey") dbType = "sondage"
    if (type === "information") dbType = "information"

    // 1️⃣ Création communication (sanitize content_html)
    const { data: communication, error } = await supabase
      .from("com_communications")
      .insert({
        type: dbType,
        title,
        subject: subject || title || "Communication BlackWaves",
        content_html: sanitizeHtml(content),
        season: saison,
        status: "draft"
      })
      .select()
      .single()

    if (error) throw error

    // NOTE: sondage : la logique de sondage est désormais séparée dans module `bureau/surveys`.
    // Cette route crée uniquement la communication (mails). Les sondages ne sont plus créés
    // automatiquement ici afin de découpler complètement les deux concepts.

    return NextResponse.json({ ok: true, data: communication })

  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    )
  }
}