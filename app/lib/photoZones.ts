import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "[photoZones] NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY manquant."
  );
}

const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export type PhotoRecord = {
  id: string;
  url: string;
  title: string | null;
  section: string | null;
  description: string | null;
};

export async function getPhotoForZone(
  zoneId: string
): Promise<PhotoRecord | null> {
  if (!supabase) return null;

  try {
    // 1) On va chercher le slot pour cette zone
    const { data: slots, error: slotError } = await supabase
      .from("photo_slots")
      .select("photo_id")
      .eq("zone", zoneId)
      .limit(1);

    if (slotError) {
      console.error("[photoZones] Erreur sur photo_slots :", slotError);
      return null;
    }

    const slot = slots?.[0];
    if (!slot?.photo_id) {
      return null; // pas de photo définie pour cette zone
    }

    // 2) On va chercher la photo associée
    const { data: photos, error: photoError } = await supabase
      .from("photos")
      .select("id, url, title, section, description")
      .eq("id", slot.photo_id)
      .limit(1);

    if (photoError) {
      console.error("[photoZones] Erreur sur photos :", photoError);
      return null;
    }

    const photo = photos?.[0];
    if (!photo) return null;

    return photo as PhotoRecord;
  } catch (err) {
    console.error("[photoZones] Erreur inattendue :", err);
    return null;
  }
}
