import { cookies } from "next/headers";

export type UserRole = "public" | "parent" | "coach" | "bureau";

export async function getUserRole(): Promise<UserRole> {
  // cookies() est ASYNCHRONE → il faut AWAIT
  const cookieStore = await cookies();

  const roleCookie = cookieStore.get("bw_role")?.value;

  if (roleCookie === "parent") return "parent";
  if (roleCookie === "coach") return "coach";
  if (roleCookie === "bureau") return "bureau";

  return "public";
}
