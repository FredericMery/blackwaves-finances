import { redirect } from "next/navigation";

export default function ParentRedirectPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = (searchParams?.token || "").trim();

  if (!token) {
    redirect("/"); // ou une page d'erreur dédiée
  }

  redirect(`/inscription/${encodeURIComponent(token)}`);
}
