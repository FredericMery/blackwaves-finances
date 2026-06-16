"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getAthleteAuthHeaders } from "@/lib/athleteAuthHeaders";

type EventItem = {
  id: number;
  title: string;
  date: string;
  team?: string;
  type?: string;
  location?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
};

type ViewMode = "day" | "3days" | "5days" | "month";

const MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const WEEKDAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function typeColor(type?: string) {
  const t = (type ?? "").toLowerCase();
  if (t.includes("compét")) return "border-yellow-500/40 bg-yellow-500/10 text-yellow-200";
  if (t.includes("stage")) return "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-200";
  if (t.includes("séance") || t.includes("entrainement") || t.includes("entraînement")) {
    return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  }
  return "border-white/10 bg-white/5 text-slate-200";
}

function typeDot(type?: string) {
  const t = (type ?? "").toLowerCase();
  if (t.includes("compét")) return "bg-yellow-400";
  if (t.includes("stage")) return "bg-fuchsia-400";
  if (t.includes("séance") || t.includes("entrainement") || t.includes("entraînement")) return "bg-emerald-400";
  return "bg-sky-400";
}

function typeIcon(type?: string) {
  const t = (type ?? "").toLowerCase();
  if (t.includes("compét")) return "🏆";
  if (t.includes("stage")) return "🎯";
  if (t.includes("séance") || t.includes("entrainement") || t.includes("entraînement")) return "💪";
  return "📍";
}

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return formatIsoDate(date);
}

function addMonths(value: string, months: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  return formatIsoDate(date);
}

function startOfMonth(value: string) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(1);
  return formatIsoDate(date);
}

function formatDayLabel(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatMonthTitle(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function buildVisibleDays(start: string, count: number) {
  return Array.from({ length: count }, (_, index) => addDays(start, index));
}

function isSameIsoDay(a: string, b: string) {
  return a === b;
}

function EventCard({ event }: { event: EventItem }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${typeColor(event.type)}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-xl">{typeIcon(event.type)}</span>
          <div>
            <div className="text-sm font-semibold">{event.title}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] opacity-80">
              {event.type && <span>{event.type}</span>}
              {event.team && event.team !== "Toutes les équipes" && <span>• {event.team}</span>}
              {event.location && <span>• {event.location}</span>}
            </div>
            {event.description && (
              <div className="mt-2 text-[12px] leading-relaxed opacity-80">{event.description}</div>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right text-[11px] font-medium opacity-80">
          <div>
            {new Date(`${event.date}T12:00:00`).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
            })}
          </div>
          {event.start_time && (
            <div className="mt-1">
              {event.start_time}
              {event.end_time ? ` – ${event.end_time}` : ""}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AthletePlanning() {
  const todayIso = formatIsoDate(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("3days");
  const [anchorDate, setAnchorDate] = useState(todayIso);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const rangeDays = viewMode === "day" ? 1 : viewMode === "3days" ? 3 : viewMode === "5days" ? 5 : 0;
  const rangeEnd = viewMode === "month" ? null : addDays(anchorDate, rangeDays - 1);

  const load = useCallback(async (mode: ViewMode, currentAnchor: string) => {
    setLoading(true);
    try {
      const headers = await getAthleteAuthHeaders();
      const url = new URL("/api/athlete/planning", window.location.origin);

      if (mode === "month") {
        const date = new Date(`${currentAnchor}T12:00:00`);
        url.searchParams.set("year", String(date.getFullYear()));
        url.searchParams.set("month", String(date.getMonth() + 1));
      } else {
        const dayCount = mode === "day" ? 1 : mode === "3days" ? 3 : 5;
        url.searchParams.set("from", currentAnchor);
        url.searchParams.set("to", addDays(currentAnchor, dayCount - 1));
      }

      const res = await fetch(url.pathname + url.search, { headers });
      if (!res.ok) return;

      const data = await res.json();
      const nextEvents = (data.events ?? []) as EventItem[];
      nextEvents.sort((a, b) => {
        const aKey = `${a.date} ${a.start_time ?? "99:99"}`;
        const bKey = `${b.date} ${b.start_time ?? "99:99"}`;
        return aKey.localeCompare(bKey);
      });
      setEvents(nextEvents);
      setTeamName(data.team ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(viewMode, anchorDate);
  }, [anchorDate, load, viewMode]);

  const monthDate = new Date(`${startOfMonth(anchorDate)}T12:00:00`);
  const monthYear = monthDate.getFullYear();
  const monthNumber = monthDate.getMonth() + 1;
  const firstDay = new Date(monthYear, monthNumber - 1, 1).getDay();
  const daysInMonth = new Date(monthYear, monthNumber, 0).getDate();
  const blanks = (firstDay + 6) % 7;

  const eventsByDay = useMemo(() => {
    const grouped: Record<string, EventItem[]> = {};
    for (const event of events) {
      if (!grouped[event.date]) grouped[event.date] = [];
      grouped[event.date].push(event);
    }
    return grouped;
  }, [events]);

  const visibleDays = useMemo(() => {
    if (viewMode === "month") return [] as string[];
    return buildVisibleDays(anchorDate, rangeDays);
  }, [anchorDate, rangeDays, viewMode]);

  const rangeTitle = viewMode === "month"
    ? formatMonthTitle(anchorDate)
    : viewMode === "day"
      ? formatDayLabel(anchorDate)
      : `${formatDayLabel(anchorDate)} → ${formatDayLabel(rangeEnd!)}`;

  function moveBackward() {
    if (viewMode === "month") {
      setAnchorDate((current) => addMonths(current, -1));
      return;
    }
    const step = viewMode === "day" ? 1 : viewMode === "3days" ? 3 : 5;
    setAnchorDate((current) => addDays(current, -step));
  }

  function moveForward() {
    if (viewMode === "month") {
      setAnchorDate((current) => addMonths(current, 1));
      return;
    }
    const step = viewMode === "day" ? 1 : viewMode === "3days" ? 3 : 5;
    setAnchorDate((current) => addDays(current, step));
  }

  function resetToday() {
    setAnchorDate(todayIso);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-sky-900/30 via-slate-900/70 to-slate-950/90 p-5 shadow-xl shadow-sky-950/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-sky-400">Planning athlète</div>
            <h1 className="mt-2 text-2xl font-bold">Planning de ton équipe</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Tu vois ici les créneaux de <span className="font-semibold text-white">{teamName ?? "ton équipe"}</span> ainsi que les événements club partagés avec toutes les équipes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {([
              ["day", "1 jour"],
              ["3days", "3 jours"],
              ["5days", "5 jours"],
              ["month", "Mois"],
            ] as Array<[ViewMode, string]>).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  viewMode === mode
                    ? "bg-sky-500 text-slate-950"
                    : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={moveBackward}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
            >
              ‹
            </button>
            <div className="min-w-[180px] rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-2 text-center text-sm font-semibold text-white">
              {rangeTitle}
            </div>
            <button
              type="button"
              onClick={moveForward}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
            >
              ›
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
            <button
              type="button"
              onClick={resetToday}
              className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
            >
              Aujourd’hui
            </button>
            {teamName && (
              <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1.5 font-medium text-sky-200">
                Équipe : {teamName}
              </span>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
        </div>
      ) : viewMode === "month" ? (
        <>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              {WEEKDAY_NAMES.map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: blanks }).map((_, index) => (
                <div key={`blank-${index}`} className="min-h-[90px] rounded-2xl" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;
                const iso = `${monthYear}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayEvents = eventsByDay[iso] ?? [];
                const isToday = isSameIsoDay(iso, todayIso);

                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => {
                      setAnchorDate(iso);
                      setViewMode("day");
                    }}
                    className={`min-h-[96px] rounded-2xl border p-2 text-left transition ${
                      isToday
                        ? "border-sky-500/50 bg-sky-500/10"
                        : dayEvents.length > 0
                          ? "border-white/10 bg-slate-950/35 hover:bg-slate-950/60"
                          : "border-white/5 bg-transparent hover:bg-white/5"
                    }`}
                  >
                    <div className={`text-xs font-semibold ${isToday ? "text-sky-300" : "text-slate-400"}`}>{day}</div>
                    <div className="mt-2 space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div key={`${event.id}-${event.date}`} className="flex items-center gap-1.5 truncate rounded-lg bg-white/5 px-2 py-1 text-[10px] text-slate-200">
                          <span className={`h-2 w-2 rounded-full ${typeDot(event.type)}`} />
                          <span className="truncate">{event.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-slate-500">+{dayEvents.length - 3} autre(s)</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Événements du mois</h2>
            {events.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
                Aucun événement pour {formatMonthTitle(anchorDate)}.
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((event) => (
                  <EventCard key={`${event.id}-${event.date}`} event={event} />
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className={`grid gap-4 ${visibleDays.length >= 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
          {visibleDays.map((day) => {
            const dayEvents = eventsByDay[day] ?? [];
            const isToday = isSameIsoDay(day, todayIso);

            return (
              <section
                key={day}
                className={`rounded-3xl border p-4 ${
                  isToday ? "border-sky-500/40 bg-sky-500/10" : "border-white/10 bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      {isToday ? "Aujourd’hui" : "Jour"}
                    </div>
                    <div className="mt-1 text-lg font-bold text-white">{formatDayLabel(day)}</div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-slate-950/40 px-3 py-1 text-[11px] font-semibold text-slate-300">
                    {dayEvents.length} événement{dayEvents.length > 1 ? "s" : ""}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {dayEvents.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/25 p-4 text-sm text-slate-400">
                      Rien de prévu ce jour pour ton équipe.
                    </div>
                  ) : (
                    dayEvents.map((event) => <EventCard key={`${event.id}-${event.date}`} event={event} />)
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
