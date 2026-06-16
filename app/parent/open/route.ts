import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")

  if (!token) {
    return new NextResponse(null, { status: 400 })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  await supabase
    .from("com_recipients")
    .update({ opened_at: new Date().toISOString() })
    .eq("token", token)
    .is("opened_at", null)

  // pixel invisible 1x1
  return new NextResponse(
    Buffer.from(
      "R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
      "base64"
    ),
    {
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-store"
      }
    }
  )
}