import { supabase } from "@/lib/supabaseClient";

export async function getAthleteAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
