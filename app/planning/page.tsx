
"use client";

import { useEffect, useState } from "react";

type EventType =
  | "Entraînement"
  | "Compétition"
  | "Stage"
  | "Événement club"
  | "Autre";

type ClubEvent = {
  id: string;
  title: string;
  team: string;
  type: EventType;
  date: string; // YYYY-MM-DD
  startTime?: string;
  endTime?: string;
  location?: string;
};

const TEAMS = [
  "Toutes les équipes",
  "Minimes novices",
  "Minimes intermédiaires",
  "Cadets",
  "Juniors",
  "U16",
];

const EVENT_TYPES: EventType[] = [
  "Entraînement",
  "Compétition",
  "Stage",
  "Événement club",
  "Autre",
];

const GYM_FILTERS = ["Tous les gymnases", "Cluny", "Dromel"] as const;

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}

function getDaysGrid(currentMonth: Date) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7; // Lundi = 0

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const totalCells = 42; // 6 semaines
  const grid: (number | null)[] = [];

  for (let i = 0; i < firstWeekday; i++) {
    grid.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push(d);
  }
  while (grid.length < totalCells) {
    grid.push(null);
  }

  return grid;
}

function sameMonth(date: Date, isoDate: string) {
  const d = new Date(isoDate);
  return (
    d.getFullYear() === date.getFullYear() &&
    d.getMonth() === date.getMonth()
  );
}

function dayMatches(date: Date, isoDate: string, day: number) {
  const d = new Date(isoDate);
  return (
    d.getFullYear() === date.getFullYear() &&
    d.getMonth() === date.getMonth() &&
    d.getDate() === day
  );
}

// Couleurs par équipe (cohérentes avec l’esprit page Équipes)
function getTeamStyles(team: string) {
  switch (team) {
    case "Minimes novices":
      return "bg-pink-500/25 border-pink-400/60";
    case "Minimes intermédiaires":
      return "bg-sky-500/25 border-sky-400/60";
    case "Cadets":
      return "bg-violet-500/25 border-violet-400/60";
    case "Juniors":
      return "bg-emerald-500/25 border-emerald-400/60";
    case "U16":
      return "bg-amber-500/25 border-amber-400/60";
    case "Toutes les équipes":
      return "bg-bw-blue/40 border-bw-cyan/50";
    default:
      return "bg-bw-blue/40 border-bw-cyan/40";
  }
}

// Couleurs du badge "type d'événement"
function getEventTypeBadgeClasses(type: EventType) {
  switch (type) {
    case "Entraînement":
      return "bg-emerald-500/80 text-black";
    case "Compétition":
      return "bg-purple-500/80 text-white";
    case "Stage":
      return "bg-amber-400/90 text-black";
    case "Événement club":
      return "bg-fuchsia-500/90 text-white";
    default:
      return "bg-slate-500/80 text-white";
  }
}

export default function PlanningPage() {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [selectedTeam, setSelectedTeam] = useState("Toutes les équipes");
  const [selectedGym, setSelectedGym] = useState<string>("Tous les gymnases");
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Formulaire nouvel événement / édition
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState<EventType>("Entraînement");
  const [formTeam, setFormTeam] = useState("Toutes les équipes");
  const [formDate, setFormDate] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formLocation, setFormLocation] = useState("");

  // Quand on change de filtre d'équipe, on pré-remplit le formulaire
  useEffect(() => {
    if (selectedTeam !== "Toutes les équipes") {
      setFormTeam(selectedTeam);
    }
  }, [selectedTeam]);

  const grid = getDaysGrid(currentMonth);

  const filteredEvents = events.filter((ev) => {
    if (!sameMonth(currentMonth, ev.date)) return false;

    if (
      selectedTeam !== "Toutes les équipes" &&
      ev.team !== selectedTeam &&
      ev.team !== "Toutes les équipes"
    ) {
      return false;
    }

    if (selectedGym !== "Tous les gymnases") {
      const loc = (ev.location || "").toLowerCase();
      if (!loc.includes(selectedGym.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  async function fetchEventsForMonth(date: Date) {
    try {
      setLoadingEvents(true);
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // 1–12

      const res = await fetch(`/api/events?year=${year}&month=${month}`);
      if (!res.ok) {
        console.error("Erreur chargement événements");
        setLoadingEvents(false);
        return;
      }

      const data = await res.json();

      const loaded: ClubEvent[] = (data.events || []).map((ev: any) => ({
        id: ev.id,
        title: ev.title,
        team: ev.team,
        type: ev.type as EventType,
        date: ev.date,
        startTime: ev.start_time ?? undefined,
        endTime: ev.end_time ?? undefined,
        location: ev.location ?? undefined,
      }));

      setEvents(loaded);
    } catch (err) {
      console.error("Erreur réseau événements", err);
    } finally {
      setLoadingEvents(false);
    }
  }

  // Chargement initial + à chaque changement de mois
  useEffect(() => {
    fetchEventsForMonth(currentMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  function handlePrevMonth() {
    setCurrentMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  }

  function handleNextMonth() {
    setCurrentMonth((prev) => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  }

  function resetForm() {
    setFormTitle("");
    setFormDate("");
    setFormStart("");
    setFormEnd("");
    setFormLocation("");
    setFormType("Entraînement");
    setFormTeam("Toutes les équipes");
    setEditingId(null);
    setSaveMessage(null);
  }

  async function handleCreateOrUpdateEvent(e: React.FormEvent) {
    e.preventDefault();
    setSaveMessage(null);

    if (!formDate || !formTitle) {
      setSaveMessage("Merci de remplir au minimum le titre et la date.");
      return;
    }

    const payload = {
      title: formTitle,
      team: formTeam,
      type: formType,
      date: formDate,
      startTime: formStart || null,
      endTime: formEnd || null,
      location: formLocation || null,
      createdBy: "Bureau Black Waves",
    };

    try {
      setSaving(true);

      if (editingId) {
        // Mise à jour
        const res = await fetch("/api/events", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...payload }),
        });

        if (!res.ok) {
          setSaveMessage(
            "Erreur lors de la mise à jour. Merci de réessayer ou de prévenir le bureau."
          );
          setSaving(false);
          return;
        }

        setSaveMessage("Événement mis à jour.");
      } else {
        // Création
        const res = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          setSaveMessage(
            "Erreur lors de l’enregistrement. Merci de réessayer ou de prévenir le bureau."
          );
          setSaving(false);
          return;
        }

        setSaveMessage(
          "Événement enregistré. Le planning est à jour pour le mois sélectionné."
        );
      }

      await fetchEventsForMonth(currentMonth);
      resetForm();
    } catch (err) {
      console.error("Erreur enregistrement événement", err);
      setSaveMessage(
        "Une erreur est survenue côté serveur. Merci de réessayer."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEditEvent(ev: ClubEvent) {
    setEditingId(ev.id);
    setFormTitle(ev.title);
    setFormType(ev.type);
    setFormTeam(ev.team);
    setFormDate(ev.date);
    setFormStart(ev.startTime || "");
    setFormEnd(ev.endTime || "");
    setFormLocation(ev.location || "");
    setSaveMessage("Modification de l’événement en cours. Pensez à enregistrer.");
  }

  async function handleDeleteEvent(id: string) {
    const ok =
      typeof window !== "undefined"
        ? window.confirm("Supprimer cet événement du planning ?")
        : true;

    if (!ok) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/events?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        setSaveMessage(
          "Erreur lors de la suppression. Merci de réessayer ou de prévenir le bureau."
        );
        setSaving(false);
        return;
      }

      setSaveMessage("Événement supprimé.");
      await fetchEventsForMonth(currentMonth);
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      console.error("Erreur suppression événement", err);
      setSaveMessage("Une erreur est survenue lors de la suppression.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-bw-dark via-black to-bw-navy text-white">
      <section className="max-w-6xl mx-auto px-4 pt-10 pb-16">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bw-cyan/80">
              Espace adhérents · Planning
            </p>
            <h1 className="mt-3 text-2xl md:text-3xl font-bold">
              Planning des entraînements & événements
            </h1>
            <p className="mt-2 text-sm text-bw-light/80 max-w-2xl">
              Sélectionnez votre équipe, un gymnase et le mois pour consulter les
              entraînements, compétitions et événements du club.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 md:items-center">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-sm hover:border-bw-cyan/80"
              >
                ◀
              </button>
              <span className="text-sm font-semibold">
                {formatMonthLabel(currentMonth)}
              </span>
              <button
                onClick={handleNextMonth}
                className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-sm hover:border-bw-cyan/80"
              >
                ▶
              </button>
            </div>

            <select
              className="rounded-lg bg-black/40 border border-white/15 px-3 py-1.5 text-sm text-white outline-none focus:border-bw-cyan/80"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
            >
              {TEAMS.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>

            <select
              className="rounded-lg bg-black/40 border border-white/15 px-3 py-1.5 text-sm text-white outline-none focus:border-bw-cyan/80"
              value={selectedGym}
              onChange={(e) => setSelectedGym(e.target.value)}
            >
              {GYM_FILTERS.map((gym) => (
                <option key={gym} value={gym}>
                  {gym}
                </option>
              ))}
            </select>
          </div>
        </header>

        <div className="mt-8 grid lg:grid-cols-[2fr,1fr] gap-6">
          {/* Calendrier */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
            <div className="grid grid-cols-7 text-[11px] md:text-xs font-semibold text-bw-light/70 mb-2 md:mb-3">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
                <div key={d} className="text-center py-1">
                  {d}
                </div>
              ))}
            </div>

            {loadingEvents && (
              <p className="text-[11px] text-bw-light/70 mb-2">
                Chargement des événements...
              </p>
            )}

            <div className="grid grid-cols-7 gap-1.5 md:gap-2 text-xs">
              {grid.map((day, index) => {
                const dayEvents =
                  day === null
                    ? []
                    : filteredEvents.filter((ev) =>
                        dayMatches(currentMonth, ev.date, day)
                      );

                return (
                  <div
                    key={index}
                    className="min-h-[70px] md:min-h-[90px] rounded-xl border border-white/10 bg-black/30 px-1.5 py-1.5 flex flex-col"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] text-bw-light/80">
                        {day ?? ""}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 overflow-hidden">
                      {dayEvents.map((ev) => (
                        <div
                          key={ev.id}
                          className={`rounded-md px-1.5 py-1 border text-[10px] leading-tight ${getTeamStyles(
                            ev.team
                          )}`}
                        >
                          <div className="font-semibold truncate">
                            {ev.title}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[9px] text-bw-light/80">
                            {ev.team !== "Toutes les équipes" && (
                              <span>{ev.team} ·</span>
                            )}

                            <span
                              className={
                                "inline-flex items-center px-1 py-[1px] rounded-full text-[8px] font-semibold uppercase tracking-[0.05em] " +
                                getEventTypeBadgeClasses(ev.type)
                              }
                            >
                              {ev.type}
                            </span>

                            {ev.location && <span>· {ev.location}</span>}
                            {ev.startTime && (
                              <span>
                                {" "}
                                · {ev.startTime}
                                {ev.endTime ? `–${ev.endTime}` : ""}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditEvent(ev)}
                              className="px-1.5 py-0.5 rounded-md bg-black/30 border border-white/20 text-[9px] hover:border-bw-cyan/70"
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEvent(ev.id)}
                              className="px-1.5 py-0.5 rounded-md bg-red-600/40 border border-red-400/70 text-[9px] hover:bg-red-600/60"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Légende par équipe */}
            <div className="mt-3 text-[11px] text-bw-light/70 flex flex-wrap gap-3">
              <div className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-full bg-pink-400/80" />
                <span>Minimes novices</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-full bg-sky-400/80" />
                <span>Minimes intermédiaires</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-full bg-violet-400/80" />
                <span>Cadets</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-full bg-emerald-400/80" />
                <span>Juniors</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-full bg-amber-400/80" />
                <span>U16</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-full bg-fuchsia-500/90" />
                <span>Événements club</span>
              </div>
            </div>
          </div>

          {/* Formulaire coach */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5 text-sm">
            <h2 className="text-base font-semibold mb-1">
              {editingId ? "Modifier un événement" : "Planifier un événement"}
            </h2>
            <p className="text-[11px] text-bw-light/70 mb-3">
              Réservé aux coachs et au bureau : entraînements spéciaux,
              compétitions, stages, événements club, réservations de gymnase…
            </p>

            <form onSubmit={handleCreateOrUpdateEvent} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-bw-light/80 mb-1">
                  Titre de l’événement
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-1.5 text-sm text-white outline-none focus:border-bw-cyan/80"
                  placeholder="Ex : Entraînement supplémentaire Minimes"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-bw-light/80 mb-1">
                    Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) =>
                      setFormType(e.target.value as EventType)
                    }
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-2 py-1.5 text-xs text-white outline-none focus:border-bw-cyan/80"
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-bw-light/80 mb-1">
                    Équipe
                  </label>
                  <select
                    value={formTeam}
                    onChange={(e) => setFormTeam(e.target.value)}
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-2 py-1.5 text-xs text-white outline-none focus:border-bw-cyan/80"
                  >
                    {TEAMS.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-bw-light/80 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-2 py-1.5 text-xs text-white outline-none focus:border-bw-cyan/80"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-bw-light/80 mb-1">
                    Lieu (gymnase)
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-2 py-1.5 text-xs text-white outline-none focus:border-bw-cyan/80"
                    placeholder="Cluny, Dromel…"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-bw-light/80 mb-1">
                    Heure début
                  </label>
                  <input
                    type="time"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-2 py-1.5 text-xs text-white outline-none focus:border-bw-cyan/80"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-bw-light/80 mb-1">
                    Heure fin
                  </label>
                  <input
                    type="time"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="w-full rounded-lg bg-black/40 border border-white/15 px-2 py-1.5 text-xs text-white outline-none focus:border-bw-cyan/80"
                  />
                </div>
              </div>

              {saveMessage && (
                <p className="text-[11px] text-bw-light/80 bg-black/40 border border-white/10 rounded-md px-3 py-2">
                  {saveMessage}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-bw-blue px-4 py-1.5 text-sm font-semibold text-white hover:bg-bw-cyan transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving
                    ? editingId
                      ? "Mise à jour..."
                      : "Enregistrement..."
                    : editingId
                    ? "Mettre à jour"
                    : "Ajouter au planning"}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3 py-1.5 rounded-lg border border-white/25 bg-black/30 text-xs hover:border-bw-cyan/80"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

