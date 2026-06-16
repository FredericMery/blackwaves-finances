import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import EventRegistrationPanels from "@/components/event-club/EventRegistrationPanels";
import {
  normalizeEventClubDetails,
} from "@/lib/eventClub";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function formatLongDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "À confirmer";
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = supabaseAdmin();

  const { data: event, error } = await admin
    .from("events_club")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !event) {
    notFound();
  }

  if (!event.is_active) {
    notFound();
  }

  const details = normalizeEventClubDetails(
    {
      ...(event.details_json || {}),
      description: event.description || event.details_json?.description,
      locationName: event.location || event.details_json?.locationName,
      address: event.address || event.details_json?.address,
      priceText: event.price || event.details_json?.priceText,
      heroTitle: event.details_json?.heroTitle || event.title,
    },
    event.event_date
  );

  const heroTitle = details.heroTitle || event.title;
  const dateLabel = formatLongDate(event.event_date);
  const timeLabel = details.scheduleText || formatTime(event.event_date);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f7f2ea_0%,#fffaf5_30%,#ffffff_100%)] text-slate-950">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(200,126,62,0.18),transparent_38%),radial-gradient(circle_at_top_right,rgba(15,23,42,0.24),transparent_32%)]" />
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[1.2fr_0.8fr] lg:px-10 lg:py-16">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-black/5 bg-slate-900 shadow-[0_40px_120px_rgba(15,23,42,0.22)]">
            {event.image_url ? (
              <Image
                src={event.image_url}
                alt={event.title}
                width={1600}
                height={1120}
                sizes="(max-width: 1024px) 100vw, 800px"
                className="h-[360px] w-full object-cover object-center md:h-[560px]"
              />
            ) : (
              <div className="flex h-[360px] items-center justify-center bg-slate-800 text-slate-300 md:h-[560px]">
                Visuel de l&apos;événement à venir
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/35 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 md:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-200/90">
                Événement Black Waves
              </p>
              <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight text-white md:text-6xl">
                {heroTitle}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-200 md:text-base">
                {details.heroSubtitle}
              </p>
            </div>
          </div>

          <aside className="flex flex-col gap-6 rounded-[2.5rem] border border-slate-200 bg-white/90 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.10)] backdrop-blur md:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Résumé</p>
              <p className="mt-3 text-lg font-semibold leading-8 text-slate-900">{details.summary}</p>
            </div>

            <div className="grid gap-3 text-sm text-slate-700">
              <InfoRow label="Date" value={dateLabel} />
              <InfoRow label="Horaires" value={timeLabel || "À confirmer"} />
              <InfoRow label="Lieu" value={details.locationName || "À confirmer"} />
              <InfoRow label="Adresse" value={details.address || "À confirmer"} />
              <InfoRow label="Tarif" value={details.priceText || "À confirmer"} />
            </div>

            <div className="rounded-[1.75rem] bg-slate-950 px-5 py-5 text-sm text-slate-200">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">Infos pratiques</p>
              <p className="mt-3 whitespace-pre-line leading-6">{details.practicalInfo}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              {details.practicalLinks.map((link) => (
                <Link
                  key={`${link.label}-${link.href}`}
                  href={link.href}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-12">
        <article className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">Présentation</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            Une fiche événement claire pour s&apos;inscrire sans friction
          </h2>
          <p className="mt-6 whitespace-pre-line text-base leading-8 text-slate-700">
            {details.description}
          </p>
        </article>

        <article className="rounded-[2.5rem] border border-slate-200 bg-[linear-gradient(145deg,#fff7ed,#fff)] p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-pink-700">Découvrir le club</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
            Avant de venir, retrouve l&apos;essentiel sur Black Waves
          </h2>
          <p className="mt-6 text-base leading-8 text-slate-700">
            Les boutons ci-dessous permettent aux familles et aux participants externes d&apos;accéder rapidement aux informations utiles sur le club, les équipes et la vie du groupe.
          </p>
          <div className="mt-8 space-y-3">
            {details.practicalLinks.map((link) => (
              <Link
                key={`discover-${link.label}-${link.href}`}
                href={link.href}
                className="flex items-center justify-between rounded-[1.5rem] border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-900 transition hover:border-pink-500 hover:text-pink-700"
              >
                <span>{link.label}</span>
                <span>→</span>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16 pt-2 lg:px-10 lg:pb-24">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">{details.registrationsTitle}</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
            Deux parcours d&apos;inscription, une expérience simple
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-700">
            {details.registrationsText}
          </p>
        </div>

        <EventRegistrationPanels
          eventId={event.id}
          eventTitle={event.title}
          registrationsOpen={Boolean(event.registrations_open)}
          clubTitle={details.clubAthleteFormTitle}
          clubText={details.clubAthleteFormText}
          externalTitle={details.externalFormTitle}
          externalText={details.externalFormText}
        />
      </section>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.3rem] border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}