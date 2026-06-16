import { redirect } from "next/navigation";

export default async function EventSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/bureau/evenements?slug=${encodeURIComponent(slug)}`);
}