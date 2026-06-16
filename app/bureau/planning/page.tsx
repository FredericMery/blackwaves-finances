"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type RawEvent = {
  id: string;
  title: string;
  team: string | null;
  type: string | null;
  date: string; // YYYY-MM-DD
  start_time: string | null; // HH:MM
  end_time: string | null; // HH:MM
  location: string | null;
};

type ViewMode = "liste" | "mois" | "annee";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// ──────────────────────────────────────────────
// Helpers (anti “+1 jour”)
// ──────────────────────────────────────────────
function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Clé locale YYYY-MM-DD (PAS d’UTC) */
function dateKeyLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Parse YYYY-MM-DD en Date locale (sans décalage UTC) */
function parseDateLocal(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function getSeasonFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0=janv, 8=sept
  return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

function formatTime(t?: string | null): string {
  if (!t) return "";
  const [h, m] = t.split(":");
  return `${h}h${m || "00"}`;
}

function formatFrenchDate(dateStr: string): string {
  const d = parseDateLocal(dateStr);
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

type TypeNorm = "training" | "competition" | "club";

function normalizeType(type?: string | null): TypeNorm {
  const v = (type || "").toLowerCase();
  if (v.includes("compétition") || v.includes("competition")) return "competition";
  if (v.includes("événement") || v.includes("evenement")) return "club";
  return "training";
}

function getTypeBadge(type?: string | null): { label: string; className: string; dot: string } {
  const t = normalizeType(type);
  if (t === "competition") {
    return {
      label: "Compétition",
      className: "bg-rose-500/10 text-rose-200 border border-rose-500/35",
      dot: "bg-rose-400",
    };
  }
  if (t === "club") {
    return {
      label: "Événement du club",
      className: "bg-amber-500/10 text-amber-200 border border-amber-500/35",
      dot: "bg-amber-400",
    };
  }
  return {
    label: "Entraînement",
    className: "bg-emerald-500/10 text-emerald-200 border border-emerald-500/35",
    dot: "bg-emerald-400",
  };
}

/** Matrice du mois (lundi→dimanche), cellules = Date ou null */
function getMonthMatrix(monthDate: Date): (Date | null)[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const daysInMonth = last.getDate();

  // JS: 0=dimanche..6=samedi -> on veut 0=lundi..6=dimanche
  let startIndex = first.getDay(); // 0..6
  startIndex = (startIndex + 6) % 7;

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startIndex; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function monthLabelFR(d: Date) {
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

function shortMonthFR(d: Date) {
  return d.toLocaleDateString("fr-FR", { month: "short" });
}

function cn(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isWeekend(d: Date) {
  const day = d.getDay(); // 0=dim,6=sam
  return day === 0 || day === 6;
}

// ──────────────────────────────────────────────
// UI mini-components
// ──────────────────────────────────────────────

function StatPill(props: { label: string; value: number; tone?: "pink" | "emerald" | "amber" | "slate" }) {
  const tone = props.tone || "slate";
  const toneCls =
    tone === "pink"
      ? "border-pink-500/40 bg-pink-500/10 text-pink-200"
      : tone === "emerald"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
      : tone === "amber"
      ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
      : "border-slate-700 bg-slate-900 text-slate-200";

  return (
    <div className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs", toneCls)}>
      <span className="opacity-90">{props.label}</span>
      <span className="font-semibold">{props.value}</span>
    </div>
  );
}

function Modal(props: {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  useEffect(() => {
    if (!props.open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") props.onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props.open, props.onClose]);

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={props.onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/60">
          <div className="flex items-start justify-between gap-4 border-b border-slate-800 bg-slate-950/80 px-5 py-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-400">
                Planning · Détail
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-100">{props.title || "Détail"}</div>
            </div>
            <button
              onClick={props.onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-800 bg-slate-900/40 text-slate-200 transition hover:border-pink-500/50 hover:text-white"
              aria-label="Fermer"
              title="Fermer (Échap)"
            >
              ✕
            </button>
          </div>

          <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{props.children}</div>

          {props.footer && (
            <div className="flex flex-col gap-2 border-t border-slate-800 bg-slate-950/80 px-5 py-4 md:flex-row md:items-center md:justify-between">
              {props.footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MonthGrid(props: {
  month: Date;
  selectedKey: string | null;
  eventsByDay: Map<string, RawEvent[]>;
  onPick: (d: Date) => void;
  compact?: boolean;
}) {
  const matrix = useMemo(() => getMonthMatrix(props.month), [props.month]);
  const compact = !!props.compact;

  return (
    <div className={cn("rounded-2xl border border-slate-800 bg-slate-950/40", compact ? "p-3" : "p-4")}>
      <div className={cn("mb-3 flex items-center justify-between", compact ? "mb-2" : "mb-3")}>
        <div className={cn("font-semibold text-slate-100", "text-sm")}>
          {compact ? shortMonthFR(props.month) : monthLabelFR(props.month)}
        </div>
        {!compact && <div className="text-[11px] text-slate-400">Clique un jour pour ouvrir le détail</div>}
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        <div>Lun</div>
        <div>Mar</div>
        <div>Mer</div>
        <div>Jeu</div>
        <div>Ven</div>
        <div>Sam</div>
        <div>Dim</div>
      </div>

      <div className={cn("grid grid-cols-7", compact ? "gap-[2px]" : "gap-[3px]")}>
        {matrix.map((d, idx) => {
          if (!d) {
            return <div key={`e-${idx}`} className={cn(compact ? "h-8" : "h-20", "rounded-xl")} />;
          }

          const key = dateKeyLocal(d);
          const dayEvents = props.eventsByDay.get(key) || [];
          const isToday = dateKeyLocal(new Date()) === key;
          const isSelected = props.selectedKey === key;

          const borderCls = isSelected
            ? "border-pink-500"
            : isToday
            ? "border-slate-500"
            : "border-slate-800";

          return (
            <button
              key={key}
              type="button"
              onClick={() => props.onPick(d)}
              className={cn(
                "group flex flex-col rounded-xl border bg-slate-950/60 text-left text-slate-100 transition hover:border-pink-500/60 hover:bg-slate-900",
                borderCls,
                compact ? "h-8 px-1 py-0.5" : "h-20 px-1.5 py-1"
              )}
              title={dayEvents.length ? `${dayEvents.length} événement(s)` : "Aucun événement"}
            >
              <div className="flex items-center justify-between">
                <span className={cn("font-semibold", compact ? "text-[10px]" : "text-[11px]")}>{d.getDate()}</span>
                {!!dayEvents.length && !compact && (
                  <span className="text-[10px] text-slate-400">{dayEvents.length}</span>
                )}
              </div>

              {compact ? (
                <div className="mt-0.5 flex items-center gap-1">
                  {dayEvents.slice(0, 3).map((e) => {
                    const badge = getTypeBadge(e.type);
                    return <span key={e.id} className={cn("h-1.5 w-1.5 rounded-full", badge.dot)} />;
                  })}
                  {dayEvents.length > 3 && <span className="text-[9px] text-slate-400">+{dayEvents.length - 3}</span>}
                </div>
              ) : (
                <div className="mt-1 flex flex-1 flex-col gap-0.5 overflow-hidden">
                  {dayEvents.slice(0, 3).map((e) => {
                    const badge = getTypeBadge(e.type);
                    return (
                      <div key={e.id} className={cn("line-clamp-1 rounded-full px-1.5 py-0.5 text-[10px]", badge.className)}>
                        {e.title}
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-slate-400">+{dayEvents.length - 3} autre(s)</div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────

export default function PlanningBureauPage() {
  const router = useRouter();

  const [events, setEvents] = useState<RawEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>("mois");

  const [selectedSeason, setSelectedSeason] = useState<string | "all">("all");
  const [selectedTeam, setSelectedTeam] = useState<string | "all">("all");
  const [selectedType, setSelectedType] = useState<string | "all">("all");

  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // Modals
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Sélections
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Form : entrainements récurrents
  const [recTeam, setRecTeam] = useState<string>("all");
  const [recWeekday, setRecWeekday] = useState<number>(1); // 1=lundi .. 7=dimanche
  const [recStart, setRecStart] = useState<string>("18:00");
  const [recEnd, setRecEnd] = useState<string>("20:00");
  const [recLocation, setRecLocation] = useState<string>("Gymnase Cluny");
  const [recTitle, setRecTitle] = useState<string>("Entraînement");

  // ──────────────────────────────────────────────
  // Chargement des événements
  // ──────────────────────────────────────────────
  async function fetchEvents() {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw error;
    return (data || []) as RawEvent[];
  }

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchEvents();
        if (!mounted) return;
        setEvents(data);
      } catch (e: any) {
        console.error("Erreur chargement planning", e);
        if (mounted) {
          setError("Impossible de charger le planning. Merci de réessayer ou de contacter l’administrateur.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  // ──────────────────────────────────────────────
  // Listes pour filtres
  // ──────────────────────────────────────────────
  const seasons = useMemo(() => {
    const values = new Set<string>();
    for (const e of events) values.add(getSeasonFromDate(parseDateLocal(e.date)));
    return Array.from(values).sort();
  }, [events]);

  const teams = useMemo(() => {
    const values = new Set<string>();
    for (const e of events) if (e.team) values.add(e.team);
    return Array.from(values).sort();
  }, [events]);

  const types = ["Entraînement", "Compétition", "Événement du club"] as const;

  // ──────────────────────────────────────────────
  // Filtres
  // ──────────────────────────────────────────────
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const eventSeason = getSeasonFromDate(parseDateLocal(e.date));

      if (selectedSeason !== "all" && eventSeason !== selectedSeason) return false;
      if (selectedTeam !== "all" && (e.team || "") !== selectedTeam) return false;

      if (selectedType !== "all") {
        const t = normalizeType(e.type);
        if (selectedType === "Entraînement" && t !== "training") return false;
        if (selectedType === "Compétition" && t !== "competition") return false;
        if (selectedType === "Événement du club" && t !== "club") return false;
      }

      return true;
    });
  }, [events, selectedSeason, selectedTeam, selectedType]);

  // Regroupement vue liste
  const groupedByDate = useMemo(() => {
    const map = new Map<string, RawEvent[]>();
    for (const e of filteredEvents) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    for (const [, arr] of map) arr.sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
    return Array.from(map.entries()).sort(([d1], [d2]) => d1.localeCompare(d2));
  }, [filteredEvents]);

  // Map date -> events (clé = e.date)
  const eventsByDay = useMemo(() => {
    const map = new Map<string, RawEvent[]>();
    for (const e of filteredEvents) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    for (const [, arr] of map) arr.sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
    return map;
  }, [filteredEvents]);

  const selectedDateKey = selectedDate ? dateKeyLocal(selectedDate) : null;

  const eventsForSelectedDay = useMemo(() => {
    if (!selectedDateKey) return [];
    return eventsByDay.get(selectedDateKey) || [];
  }, [eventsByDay, selectedDateKey]);

  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return events.find((e) => e.id === selectedEventId) || null;
  }, [events, selectedEventId]);

  // ──────────────────────────────────────────────
  // Stats / recap
  // ──────────────────────────────────────────────
  const summary = useMemo(() => {
    let training = 0;
    let competition = 0;
    let club = 0;

    const byTeam = new Map<string, { team: string; training: number; competition: number; club: number; total: number }>();

    for (const e of filteredEvents) {
      const t = normalizeType(e.type);
      if (t === "training") training++;
      if (t === "competition") competition++;
      if (t === "club") club++;

      const team = e.team || "Club (sans équipe)";
      if (!byTeam.has(team)) byTeam.set(team, { team, training: 0, competition: 0, club: 0, total: 0 });

      const row = byTeam.get(team)!;
      row.total++;
      if (t === "training") row.training++;
      if (t === "competition") row.competition++;
      if (t === "club") row.club++;
    }

    const rows = Array.from(byTeam.values()).sort((a, b) => b.total - a.total || a.team.localeCompare(b.team));

    return { total: filteredEvents.length, training, competition, club, rows };
  }, [filteredEvents]);

  // ──────────────────────────────────────────────
  // Navigation mois / année
  // ──────────────────────────────────────────────
  function goToPrevMonth() {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }

  function goToNextMonth() {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }

  function jumpToMonth(monthIndex: number, year: number) {
    setCurrentMonth(new Date(year, monthIndex, 1));
  }

  const annualYear = useMemo(() => currentMonth.getFullYear(), [currentMonth]);

  const annualMonths = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => new Date(annualYear, i, 1));
  }, [annualYear]);

  // ──────────────────────────────────────────────
  // Actions : ouvrir le détail jour (popup)
  // ──────────────────────────────────────────────
  function openDay(d: Date) {
    setSelectedDate(d);
    setSelectedEventId(null);
    setDayModalOpen(true);
  }

  // ──────────────────────────────────────────────
  // Actions : suppression simple
  // ──────────────────────────────────────────────
  async function deleteSelectedEvent() {
    if (!selectedEventId) return;

    try {
      setMutating(true);
      setError(null);

      const { error } = await supabase.from("events").delete().eq("id", selectedEventId);
      if (error) throw error;

      // Refresh local
      setEvents((prev) => prev.filter((e) => e.id !== selectedEventId));
      setSelectedEventId(null);
      setConfirmDeleteOpen(false);
    } catch (e: any) {
      console.error("Erreur suppression event", e);
      setError("Suppression impossible. Vérifie tes droits (RLS) ou réessaye.");
    } finally {
      setMutating(false);
    }
  }

  // ──────────────────────────────────────────────
  // Actions : planifier entrainements récurrents
  // - Septembre -> fin Juin (année scolaire)
  // - Exclut week-ends
  // - Exclut vacances scolaires : ici on propose un champ "exceptions" simple (dates à exclure),
  //   ET on ajoute un "mode simple" par défaut sans exclusions (tu peux compléter après).
  //
  // IMPORTANT : pour exclure les vacances proprement, il faudrait une table/endpoint
  // qui fournit les périodes de vacances (académie) -> on le branchera ensuite.
  // ──────────────────────────────────────────────

  const [recExclusions, setRecExclusions] = useState<string>(""); // CSV YYYY-MM-DD

  function parseExclusionsCSV(csv: string): Set<string> {
    const s = new Set<string>();
    csv
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .forEach((k) => s.add(k));
    return s;
  }

  function getSchoolYearRange(base: Date) {
    // année scolaire = Sept (baseYear) -> Juin (baseYear+1) si on est en sept..dec
    // sinon Sept (baseYear-1) -> Juin (baseYear)
    const y = base.getFullYear();
    const m = base.getMonth(); // 0..11
    const startYear = m >= 8 ? y : y - 1;
    const start = new Date(startYear, 8, 1); // 1 sept
    const end = new Date(startYear + 1, 5, 30); // 30 juin
    return { start, end };
  }

  function weekdayToJsDay(weekday: number) {
    // 1=lundi..7=dimanche -> JS: 1=lundi..6=samedi, 0=dimanche
    if (weekday === 7) return 0;
    return weekday; // 1..6
  }

  function nextWeekday(from: Date, jsDay: number) {
    // retourne le prochain "jsDay" à partir de from (inclus si match)
    const d = startOfDay(from);
    const delta = (jsDay - d.getDay() + 7) % 7;
    return addDays(d, delta);
  }

  async function createRecurringTrainings() {
    if (recTeam === "all") {
      setError("Choisis une équipe (pas 'all') pour planifier un entraînement récurrent.");
      return;
    }

    try {
      setMutating(true);
      setError(null);

      const { start, end } = getSchoolYearRange(new Date(currentMonth));
      const jsDay = weekdayToJsDay(recWeekday);
      const exclusions = parseExclusionsCSV(recExclusions);

      // Génère toutes les dates (hors WE + exclusions)
      const rows: Array<Partial<RawEvent>> = [];
      let d = nextWeekday(start, jsDay);

      while (d <= end) {
        const key = dateKeyLocal(d);
        const weekend = isWeekend(d);

        // On exclut automatiquement samedi/dimanche (souvent vacances/fermés)
        // et on applique exclusions CSV.
        if (!weekend && !exclusions.has(key)) {
          rows.push({
            title: recTitle || "Entraînement",
            team: recTeam,
            type: "Entraînement",
            date: key,
            start_time: recStart,
            end_time: recEnd,
            location: recLocation || null,
          });
        }
        d = addDays(d, 7);
      }

      if (rows.length === 0) {
        setError("Aucune date générée (vérifie le jour / la période / exclusions).");
        return;
      }

      // Insert en batch (Supabase accepte un tableau)
      const { error } = await supabase.from("events").insert(rows as any);
      if (error) throw error;

      // Reload (simple et sûr)
      const data = await fetchEvents();
      setEvents(data);

      setRecurringOpen(false);
    } catch (e: any) {
      console.error("Erreur création récurrence", e);
      setError(
        "Planification récurrente impossible. Vérifie les droits RLS sur la table events, puis réessaye."
      );
    } finally {
      setMutating(false);
    }
  }

  // ──────────────────────────────────────────────
  // UX: lorsqu’un filtre change, on ne ferme pas la modal,
  // mais on recalculera eventsForSelectedDay automatiquement.
  // ──────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-10">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-400">
              Espace bureau · Planning
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-50 md:text-4xl">
              Planning du club
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Cliquez sur une date pour ouvrir un détail visuel (popup). Ajoutez un événement ponctuel ou planifiez les entraînements récurrents.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              onClick={() => setRecurringOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-100 shadow-lg shadow-black/40 transition hover:border-pink-500/50 hover:bg-slate-900"
            >
              <span className="text-base">↻</span>
              Planifier récurrence
            </button>

            <button
              onClick={() => router.push("/bureau/planning/nouveau")}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-pink-500/30 transition hover:bg-pink-400 hover:shadow-pink-400/40"
            >
              <span className="text-lg">＋</span>
              Nouvel événement
            </button>
          </div>
        </div>

        {/* Récap / KPIs */}
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/40">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <StatPill label="Total" value={summary.total} tone="slate" />
              <StatPill label="Entraînements" value={summary.training} tone="emerald" />
              <StatPill label="Compétitions" value={summary.competition} tone="pink" />
              <StatPill label="Événements club" value={summary.club} tone="amber" />
            </div>

            <div className="text-xs text-slate-400">
              Filtrage actif :{" "}
              <span className="text-slate-200">Saison {selectedSeason === "all" ? "toutes" : selectedSeason}</span>
              {" · "}
              <span className="text-slate-200">Équipe {selectedTeam === "all" ? "toutes" : selectedTeam}</span>
              {" · "}
              <span className="text-slate-200">Type {selectedType === "all" ? "tous" : selectedType}</span>
            </div>
          </div>

          {/* Tableau recap par équipe (scroll si besoin) */}
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40">
            <div className="grid grid-cols-12 gap-2 border-b border-slate-800 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              <div className="col-span-6 md:col-span-5">Équipe</div>
              <div className="col-span-2 text-right">Total</div>
              <div className="col-span-4 md:col-span-5 flex justify-end gap-2">
                <span className="hidden md:inline">Entraînements</span>
                <span className="hidden md:inline">Compétitions</span>
                <span className="hidden md:inline">Club</span>
              </div>
            </div>

            {summary.rows.length === 0 ? (
              <div className="px-3 py-3 text-sm text-slate-400">Aucune donnée pour ces filtres.</div>
            ) : (
              <ul className="divide-y divide-slate-800">
                {summary.rows.map((r) => (
                  <li key={r.team} className="grid grid-cols-12 items-center gap-2 px-3 py-2 text-sm">
                    <div className="col-span-6 md:col-span-5 text-slate-100">{r.team}</div>
                    <div className="col-span-2 text-right font-semibold text-slate-100">{r.total}</div>
                    <div className="col-span-4 md:col-span-5 flex justify-end gap-2">
                      <span className="inline-flex min-w-[38px] justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200">
                        {r.training}
                      </span>
                      <span className="inline-flex min-w-[38px] justify-center rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[11px] text-rose-200">
                        {r.competition}
                      </span>
                      <span className="inline-flex min-w-[38px] justify-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-200">
                        {r.club}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Filtres */}
        <div className="mb-6 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/40 md:grid-cols-3">
          {/* Saison */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Saison</label>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value === "all" ? "all" : e.target.value)}
              className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-pink-500 focus:ring-1 focus:ring-pink-500/60"
            >
              <option value="all">Toutes les saisons</option>
              {seasons.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Équipe */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Équipe</label>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value === "all" ? "all" : e.target.value)}
              className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-pink-500 focus:ring-1 focus:ring-pink-500/60"
            >
              <option value="all">Toutes les équipes</option>
              {teams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Type d’événement</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value === "all" ? "all" : e.target.value)}
              className="h-9 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-pink-500 focus:ring-1 focus:ring-pink-500/60"
            >
              <option value="all">Tous les types</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Choix de vue */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="inline-flex rounded-full border border-slate-800 bg-slate-900/70 p-1 text-xs font-medium text-slate-300 shadow-lg shadow-black/40">
            <button
              onClick={() => setViewMode("liste")}
              className={cn(
                "rounded-full px-4 py-1.5 transition",
                viewMode === "liste" ? "bg-slate-100 text-slate-900" : "hover:bg-slate-800"
              )}
            >
              Vue liste
            </button>
            <button
              onClick={() => setViewMode("mois")}
              className={cn(
                "rounded-full px-4 py-1.5 transition",
                viewMode === "mois" ? "bg-slate-100 text-slate-900" : "hover:bg-slate-800"
              )}
            >
              Vue mois
            </button>
            <button
              onClick={() => setViewMode("annee")}
              className={cn(
                "rounded-full px-4 py-1.5 transition",
                viewMode === "annee" ? "bg-slate-100 text-slate-900" : "hover:bg-slate-800"
              )}
            >
              Vue année
            </button>
          </div>

          <p className="text-xs text-slate-400">
            {filteredEvents.length} événement{filteredEvents.length > 1 ? "s" : ""} après filtres
          </p>
        </div>

        {/* Erreurs / Loading */}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-12 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-6 py-10 text-center text-sm text-slate-300">
            Aucun événement ne correspond aux filtres sélectionnés.
          </div>
        ) : viewMode === "liste" ? (
          // ───────────── Vue LISTE ─────────────
          <div className="space-y-4">
            {groupedByDate.map(([date, items]) => (
              <section
                key={date}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/40"
              >
                <header className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">{formatFrenchDate(date)}</p>
                    <p className="text-xs text-slate-500">
                      {items.length} événement{items.length > 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Ouvrir le jour (popup) */}
                  <button
                    type="button"
                    onClick={() => openDay(parseDateLocal(date))}
                    className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:border-pink-500/50 hover:bg-slate-900"
                  >
                    Voir le détail
                  </button>
                </header>

                <ul className="space-y-2">
                  {items.map((e) => {
                    const badge = getTypeBadge(e.type);
                    const selected = selectedEventId === e.id;

                    return (
                      <li
                        key={e.id}
                        className={cn(
                          "flex flex-col gap-2 rounded-xl border bg-slate-950/40 px-3 py-2 text-sm transition md:flex-row md:items-center md:justify-between",
                          selected ? "border-pink-500/70 bg-slate-950/70" : "border-slate-800 hover:border-pink-500/40 hover:bg-slate-900/60"
                        )}
                      >
                        <label className="flex flex-1 cursor-pointer flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="radio"
                              name="selectedEvent"
                              checked={selected}
                              onChange={() => setSelectedEventId(e.id)}
                              className="mr-1 accent-pink-500"
                            />
                            <span className="font-semibold text-slate-50">{e.title}</span>
                            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px]", badge.className)}>
                              {badge.label}
                            </span>
                            {e.team && (
                              <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300">
                                {e.team}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                            {(e.start_time || e.end_time) && (
                              <span>
                                {formatTime(e.start_time)} {e.end_time ? `– ${formatTime(e.end_time)}` : ""}
                              </span>
                            )}
                            {e.location && (
                              <span className="inline-flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-pink-500" />
                                {e.location}
                              </span>
                            )}
                          </div>
                        </label>

                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEventId(e.id);
                              setConfirmDeleteOpen(true);
                            }}
                            className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-100 transition hover:border-red-500/60 hover:bg-red-500/15"
                          >
                            Supprimer
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        ) : viewMode === "mois" ? (
          // ───────────── Vue MOIS ─────────────
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/40">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPrevMonth}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-950 text-xs text-slate-200 hover:border-pink-500 hover:text-pink-300"
                >
                  ‹
                </button>
                <button
                  onClick={goToNextMonth}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-950 text-xs text-slate-200 hover:border-pink-500 hover:text-pink-300"
                >
                  ›
                </button>
              </div>

              <div className="text-sm font-semibold text-slate-100">{monthLabelFR(currentMonth)}</div>

              <button
                type="button"
                onClick={() => openDay(new Date())}
                className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:border-pink-500/50 hover:bg-slate-900"
              >
                Aujourd’hui
              </button>
            </div>

            <MonthGrid
              month={currentMonth}
              selectedKey={selectedDateKey}
              eventsByDay={eventsByDay}
              onPick={(d) => openDay(d)}
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> Entraînement
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-400" /> Compétition
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400" /> Club
                </span>
              </div>
              <div>Astuce : clic sur une date = popup détail.</div>
            </div>
          </div>
        ) : (
          // ───────────── Vue ANNÉE ─────────────
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-black/40">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentMonth(new Date(annualYear - 1, currentMonth.getMonth(), 1))}
                  className="inline-flex h-8 items-center justify-center rounded-full border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200 hover:border-pink-500 hover:text-pink-300"
                >
                  ← {annualYear - 1}
                </button>
                <button
                  onClick={() => setCurrentMonth(new Date(annualYear + 1, currentMonth.getMonth(), 1))}
                  className="inline-flex h-8 items-center justify-center rounded-full border border-slate-700 bg-slate-950 px-3 text-xs text-slate-200 hover:border-pink-500 hover:text-pink-300"
                >
                  {annualYear + 1} →
                </button>
              </div>

              <div className="text-sm font-semibold text-slate-100">Vue annuelle · {annualYear}</div>

              <button
                type="button"
                onClick={() => {
                  setViewMode("mois");
                }}
                className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:border-pink-500/50 hover:bg-slate-900"
              >
                Revenir mois
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {annualMonths.map((m) => (
                <div key={`${m.getFullYear()}-${m.getMonth()}`} className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-100">
                      {m.toLocaleDateString("fr-FR", { month: "long" })}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        jumpToMonth(m.getMonth(), m.getFullYear());
                        setViewMode("mois");
                      }}
                      className="text-[11px] font-semibold text-slate-300 hover:text-pink-300"
                    >
                      Ouvrir
                    </button>
                  </div>

                  <MonthGrid
                    month={m}
                    compact
                    selectedKey={selectedDateKey}
                    eventsByDay={eventsByDay}
                    onPick={(d) => {
                      setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                      openDay(d);
                    }}
                  />
                </div>
              ))}
            </div>

            <p className="mt-3 text-center text-[11px] text-slate-400">
              Clic sur un jour = popup détail (avec suppression simple possible).
            </p>
          </div>
        )}

        {/* ────────────────────────────── MODAL : détail jour ────────────────────────────── */}
        <Modal
          open={dayModalOpen}
          title={
            selectedDate
              ? selectedDate.toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })
              : "Détail"
          }
          onClose={() => {
            setDayModalOpen(false);
            setSelectedEventId(null);
          }}
          footer={
            <>
              <div className="text-xs text-slate-400">
                {selectedDateKey ? (
                  <>
                    <span className="font-semibold text-slate-200">{eventsForSelectedDay.length}</span> événement(s) ce jour
                  </>
                ) : (
                  "—"
                )}
              </div>

              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <button
                  type="button"
                  onClick={() => router.push("/bureau/planning/nouveau")}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-pink-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-pink-400"
                >
                  ＋ Ajouter un événement
                </button>

                <button
                  type="button"
                  disabled={!selectedEventId || mutating}
                  onClick={() => setConfirmDeleteOpen(true)}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition",
                    !selectedEventId || mutating
                      ? "cursor-not-allowed border-slate-800 bg-slate-900/30 text-slate-500"
                      : "border-red-500/40 bg-red-500/10 text-red-100 hover:border-red-500/70 hover:bg-red-500/15"
                  )}
                  title={!selectedEventId ? "Sélectionne d’abord un événement dans la liste" : "Supprimer l’événement sélectionné"}
                >
                  🗑️ Supprimer sélection
                </button>
              </div>
            </>
          }
        >
          {/* Contenu du détail */}
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  Cliquez sur un événement pour le sélectionner (puis supprimer si besoin).
                </span>
              </div>
            </div>

            {eventsForSelectedDay.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/30 px-5 py-8 text-center text-sm text-slate-300">
                Aucun événement ce jour.
              </div>
            ) : (
              <ul className="space-y-2">
                {eventsForSelectedDay.map((e) => {
                  const badge = getTypeBadge(e.type);
                  const selected = selectedEventId === e.id;

                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setSelectedEventId(e.id)}
                      className={cn(
                        "w-full rounded-2xl border px-4 py-3 text-left transition",
                        selected
                          ? "border-pink-500/70 bg-slate-950/70"
                          : "border-slate-800 bg-slate-950/40 hover:border-pink-500/40 hover:bg-slate-900/60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-slate-50">{e.title}</span>
                            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px]", badge.className)}>
                              {badge.label}
                            </span>
                            {e.team && (
                              <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300">
                                {e.team}
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                            {(e.start_time || e.end_time) && (
                              <span className="inline-flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-slate-500" />
                                {formatTime(e.start_time)} {e.end_time ? `– ${formatTime(e.end_time)}` : ""}
                              </span>
                            )}
                            {e.location && (
                              <span className="inline-flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-pink-400" />
                                {e.location}
                              </span>
                            )}
                          </div>
                        </div>

                        {selected && (
                          <div className="shrink-0 rounded-full border border-pink-500/40 bg-pink-500/10 px-3 py-1 text-[11px] font-semibold text-pink-200">
                            Sélectionné
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </ul>
            )}
          </div>
        </Modal>

        {/* ────────────────────────────── MODAL : récurrence ────────────────────────────── */}
        <Modal
          open={recurringOpen}
          title="Planifier des entraînements récurrents"
          onClose={() => setRecurringOpen(false)}
          footer={
            <>
              <div className="text-xs text-slate-400">
                Génère tous les entraînements du <span className="text-slate-200">1er septembre</span> au{" "}
                <span className="text-slate-200">30 juin</span> (année scolaire du mois courant), hors week-ends.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRecurringOpen(false)}
                  className="rounded-full border border-slate-800 bg-slate-900/40 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:border-pink-500/40 hover:bg-slate-900"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={mutating}
                  onClick={createRecurringTrainings}
                  className={cn(
                    "rounded-full px-4 py-2 text-xs font-semibold text-white transition",
                    mutating ? "bg-pink-500/50 cursor-not-allowed" : "bg-pink-500 hover:bg-pink-400"
                  )}
                >
                  {mutating ? "Génération..." : "Créer les entraînements"}
                </button>
              </div>
            </>
          }
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-200">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Mode simple</div>
              <p className="mt-2 text-sm text-slate-300">
                Pour les vacances scolaires, on te propose pour l’instant une liste d’<span className="text-slate-100 font-semibold">exclusions</span> (dates à exclure).
                Ensuite, on pourra brancher un vrai calendrier de vacances (académie) automatiquement.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Équipe */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Équipe</label>
                <select
                  value={recTeam}
                  onChange={(e) => setRecTeam(e.target.value)}
                  className="h-10 rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-pink-500 focus:ring-1 focus:ring-pink-500/60"
                >
                  <option value="all">— Choisir une équipe —</option>
                  {teams.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Jour */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Jour</label>
                <select
                  value={recWeekday}
                  onChange={(e) => setRecWeekday(Number(e.target.value))}
                  className="h-10 rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-pink-500 focus:ring-1 focus:ring-pink-500/60"
                >
                  <option value={1}>Lundi</option>
                  <option value={2}>Mardi</option>
                  <option value={3}>Mercredi</option>
                  <option value={4}>Jeudi</option>
                  <option value={5}>Vendredi</option>
                  <option value={6}>Samedi</option>
                  <option value={7}>Dimanche</option>
                </select>
              </div>

              {/* Titre */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Titre</label>
                <input
                  value={recTitle}
                  onChange={(e) => setRecTitle(e.target.value)}
                  className="h-10 rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-pink-500 focus:ring-1 focus:ring-pink-500/60"
                  placeholder="Entraînement"
                />
              </div>

              {/* Lieu */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Lieu</label>
                <input
                  value={recLocation}
                  onChange={(e) => setRecLocation(e.target.value)}
                  className="h-10 rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-pink-500 focus:ring-1 focus:ring-pink-500/60"
                  placeholder="Gymnase Cluny"
                />
              </div>

              {/* Heure début */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Début</label>
                <input
                  type="time"
                  value={recStart}
                  onChange={(e) => setRecStart(e.target.value)}
                  className="h-10 rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-pink-500 focus:ring-1 focus:ring-pink-500/60"
                />
              </div>

              {/* Heure fin */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium uppercase tracking-wide text-slate-400">Fin</label>
                <input
                  type="time"
                  value={recEnd}
                  onChange={(e) => setRecEnd(e.target.value)}
                  className="h-10 rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-pink-500 focus:ring-1 focus:ring-pink-500/60"
                />
              </div>
            </div>

            {/* Exclusions */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Exclusions (optionnel) · dates séparées par des virgules
              </label>
              <input
                value={recExclusions}
                onChange={(e) => setRecExclusions(e.target.value)}
                className="h-10 rounded-xl border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-pink-500 focus:ring-1 focus:ring-pink-500/60"
                placeholder="ex: 2026-10-19, 2026-10-26, 2026-12-22"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Astuce : tu peux coller ici les lundis des vacances si tu les as déjà. Sinon, on branchera un calendrier de vacances plus tard.
              </p>
            </div>
          </div>
        </Modal>

        {/* ────────────────────────────── MODAL : confirmation suppression ────────────────────────────── */}
        <Modal
          open={confirmDeleteOpen}
          title="Confirmer la suppression"
          onClose={() => setConfirmDeleteOpen(false)}
          footer={
            <>
              <div className="text-xs text-slate-400">
                Action irréversible.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(false)}
                  className="rounded-full border border-slate-800 bg-slate-900/40 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:border-pink-500/40 hover:bg-slate-900"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={!selectedEventId || mutating}
                  onClick={deleteSelectedEvent}
                  className={cn(
                    "rounded-full px-4 py-2 text-xs font-semibold text-white transition",
                    !selectedEventId || mutating ? "bg-red-500/50 cursor-not-allowed" : "bg-red-500 hover:bg-red-400"
                  )}
                >
                  {mutating ? "Suppression..." : "Supprimer"}
                </button>
              </div>
            </>
          }
        >
          {selectedEvent ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-semibold text-slate-100">{selectedEvent.title}</div>
                <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px]", getTypeBadge(selectedEvent.type).className)}>
                  {getTypeBadge(selectedEvent.type).label}
                </span>
                {selectedEvent.team && (
                  <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300">
                    {selectedEvent.team}
                  </span>
                )}
              </div>
              <div className="mt-2 text-xs text-slate-300">
                {selectedEvent.date}{" "}
                {(selectedEvent.start_time || selectedEvent.end_time) && (
                  <>
                    · {formatTime(selectedEvent.start_time)} {selectedEvent.end_time ? `– ${formatTime(selectedEvent.end_time)}` : ""}
                  </>
                )}
                {selectedEvent.location ? <> · {selectedEvent.location}</> : null}
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-300">Aucun événement sélectionné.</div>
          )}
        </Modal>
      </main>
    </div>
  );
}
