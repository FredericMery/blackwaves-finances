import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { event_id, layout_blocks } = body;

    if (!event_id || !layout_blocks) {
      return NextResponse.json(
        { error: "Missing event_id or layout_blocks" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("events_club")
      .update({ layout_blocks })
      .eq("id", event_id);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err }, { status: 500 });
  }
}