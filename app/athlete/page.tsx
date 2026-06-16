"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAthleteAuthHeaders } from "@/lib/athleteAuthHeaders";

type Athlete = { prenom: string; nom: string; saison: string; equipe: string };
type Team = { label: string; niveau?: string };
type Event = { id: number; title: string; date: string; type?: string; location?: string };

export default function AthleteDashboard() {
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const headers = await getAthleteAuthHeaders();
        const [meRes, now] = await Promise.all([
          fetch("/api/athlete/me", { headers }),
          new Date(),
        ]);
        if (!meRes.ok) return;
        const me = await meRes.json();
        setAthlete(me.athlete ?? null);
        setTeam(me.team ?? null);

        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const planRes = await fetch(`/api/athlete/planning?year=${year}&month=${month}`, { headers });
        if (planRes.ok) {
          const plan = await planRes.json();
          const today = new Date().toISOString().slice(0, 10);
          const upcoming = (plan.events ?? [])
            .filter((e: Event) => e.date >= today)
            .slice(0, 3);
          setUpcomingEvents(upcoming);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
      </div>
    );
  }

  const shortcuts = [
    { href: "/athlete/planning", label: "Planning", icon: "📅", desc: "Voir les séances et événements" },
    { href: "/athlete/competitions", label: "Compétitions", icon: "🏆", desc: "Calendrier et palmarès" },
    { href: "/athlete/equipe", label: "Mon équipe", icon: "👥", desc: "Coéquipiers et coachs" },
    { href: "/athlete/profil", label: "Mon profil", icon: "🎽", desc: "Mes informations personnelles" },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-sky-800/30 via-blue-900/20 to-slate-900/40 p-6 sm:p-8">
        <div className="relative z-10">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-sky-400">
            Espace Athlète
          </div>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            Bonjour{athlete ? `, ${athlete.prenom} ` : " "}👋
          </h1>
          <div className="mt-3 flex flex-wrap gap-3">
            {team && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/15 px-3 py-1 text-sm font-medium text-sky-200">
                👥 {team.label}
                {team.niveau && ` · ${team.niveau}`}
              </span>
            )}
            {athlete?.saison && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-slate-300">
                📆 Saison {athlete.saison}
              </span>
            )}
          </div>
        </div>
        {/* Decorative glow */}
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      {/* Quick nav */}
      <div>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Accès rapide
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {shortcuts.map(({ href, label, icon, desc }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-sky-500/30 hover:bg-sky-500/10"
            >
              <span className="text-2xl">{icon}</span>
              <div>
                <div className="text-sm font-semibold group-hover:text-sky-300">{label}</div>
                <div className="mt-0.5 text-[11px] leading-tight text-slate-400">{desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Upcoming events */}
      <div>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Prochains événements
        </h2>
        {upcomingEvents.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
            Aucun événement à venir ce mois-ci.{" "}
            <Link href="/athlete/planning" className="text-sky-400 underline underline-offset-2 hover:text-sky-300">
              Voir le planning complet →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map((evt) => (
              <div
                key={evt.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {evt.type?.toLowerCase().includes("compét") ? "🏆" : "📍"}
                  </span>
                  <div>
                    <div className="text-sm font-semibold">{evt.title}</div>
                    {evt.location && (
                      <div className="text-[11px] text-slate-400">{evt.location}</div>
                    )}
                  </div>
                </div>
                <time className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-sky-300">
                  {new Date(evt.date).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                  })}
                </time>
              </div>
            ))}
            <div className="pt-1 text-right">
              <Link
                href="/athlete/planning"
                className="text-xs text-sky-400 hover:text-sky-300 hover:underline"
              >
                Voir tout le planning →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
