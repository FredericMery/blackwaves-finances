import { NextResponse } from "next/server";

export const runtime = "nodejs";

function isPresent(value: string | undefined) {
  return Boolean(value && value.trim().length > 0);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    resendApiKeyPresent: isPresent(
      process.env.RESEND_API_KEY || process.env.RESSEND_API_KEY
    ),
    resendFromPresent: isPresent(process.env.RESEND_FROM),
    siteUrlPresent: isPresent(process.env.NEXT_PUBLIC_SITE_URL),
  });
}