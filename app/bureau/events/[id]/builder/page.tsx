"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Builder from "@/components/event-builder/Builder";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Page({ params }: { params: { id: string } }) {
  const [event, setEvent] = useState<any>(null);

  useEffect(() => {
    fetchEvent();
  }, []);

  async function fetchEvent() {
    const { data } = await supabase
      .from("events_club")
      .select("*")
      .eq("id", params.id)
      .single();

    setEvent(data);
  }

  async function saveLayout(layout: any) {
    await supabase
      .from("events_club")
      .update({ layout_blocks: layout })
      .eq("id", params.id);
  }

  if (!event) return <div className="p-8">Chargement...</div>;

  return (
    <Builder event={event} onSave={saveLayout} />
  );
}