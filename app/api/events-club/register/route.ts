import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const form = await req.formData();

  const event_id = form.get("event_id");
  const full_name = form.get("full_name");
  const email = form.get("email");

  const { error } = await supabase
    .from("event_registrations_club")
    .insert({ event_id, full_name, email });

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.redirect(new URL("/evenements", req.url));
}