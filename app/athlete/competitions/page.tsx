"use client";

import { useEffect, useState } from "react";
import { getAthleteAuthHeaders } from "@/lib/athleteAuthHeaders";

type Competition = {
  id: number;
  title: string;
  date: string;
  location?: string;
  description?: string;
  start_time?: string;
};

export default function AthleteCompetitions() {
  const [past, setPast] = useState<Competition[]>([]);
  const [upcoming, setUpcoming] = useState<Competition[]>([]);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const headers = await getAthleteAuthHeaders();
        // Fetch 6 months back + 6 months ahead to capture competitions
        const today = new Date();
        const allEvents: Competition[] = [];

        // Fetch 12 months window: 6 past + 6 future
        const fetches = [];
        for (let delta = -5; delta <= 6; delta++) {
          const d = new Date(today.getFullYear(), today.getMonth() + delta, 1);
          fetches.push(
            fetch(`/api/athlete/planning?year=${d.getFullYear()}&month=${d.getMonth() + 1}`, { headers })
          );
        }

        const responses = await Promise.all(fetches);
        for (const res of responses) {
          if (!res.ok) continue;
          const data = await res.json();
          if (!teamName && data.team) setTeamName(data.team);
          const compets = (data.events ?? []).filter((e: any) =>
            (e.type ?? "").toLowerCase().includes("compét")
          );
          allEvents.push(...compets);
        }

        // Deduplicate by id
        const seen = new Set<number>();
        const unique = allEvents.filter((e) => {
          if (seen.has(e.id)) return false;
          seen.add(e.id);
          return true;
        });

        unique.sort((a, b) => a.date.localeCompare(b.date));
        const todayStr = today.toISOString().slice(0, 10);
        setPast(unique.filter((e) => e.date < todayStr));
        setUpcoming(unique.filter((e) => e.date >= todayStr));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function CompetCard({ evt, isPast }: { evt: Competition; isPast?: boolean }) {
    return (
      <div
        className={`flex items-start justify-between gap-4 rounded-2xl border px-4 py-4 transition ${
          isPast
            ? "border-white/10 bg-white/5 opacity-70"
            : "border-yellow-500/30 bg-yellow-500/10"
        }`}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-2xl">{isPast ? "🏅" : "🏆"}</span>
          <div>
            <div className="text-sm font-semibold text-white">{evt.title}</div>
            {evt.location && (
              <div className="mt-0.5 flex items-center gap-1 text-[12px] text-slate-400">
                <span>📍</span>
                {evt.location}
              </div>
            )}
            {evt.description && (
              <div className="mt-1 text-[12px] leading-relaxed text-slate-400">{evt.description}</div>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <time className={`block text-xs font-semibold ${isPast ? "text-slate-400" : "text-yellow-300"}`}>
            {new Date(evt.date).toLocaleDateString("fr-FR", {
              weekday: "short",
              day: "numeric",
              month: "long",
            })}
          </time>
          {evt.start_time && (
            <div className="mt-0.5 text-[11px] text-slate-400">{evt.start_time}</div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Compétitions</h1>
        {teamName && (
          <p className="mt-0.5 text-sm text-slate-400">
            Équipe : <span className="text-sky-400">{teamName}</span>
          </p>
        )}
      </div>

      {/* Upcoming competitions */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
          À venir
        </h2>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
            Aucune compétition à venir pour le moment.
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map((evt) => (
              <CompetCard key={evt.id} evt={evt} />
            ))}
          </div>
        )}
      </section>

      {/* Past competitions / Palmarès */}
      {past.length > 0 && (
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Palmarès & historique
          </h2>
          <div className="space-y-2">
            {[...past].reverse().map((evt) => (
              <CompetCard key={evt.id} evt={evt} isPast />
            ))}
          </div>
        </section>
      )}

      {past.length === 0 && upcoming.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="text-4xl">🏆</div>
          <p className="mt-3 text-sm text-slate-400">
            Aucune compétition enregistrée sur les 12 derniers mois.
          </p>
        </div>
      )}
    </div>
  );
}
