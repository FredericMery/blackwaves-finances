"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// Type aligné sur la table public.events
type EventRow = {
  id: string;
  title: string;
  team: string | null;
  type: string | null;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS ou HH:MM
  end_time: string; // HH:MM:SS ou HH:MM
  location: string | null;
  created_at: string;
  created_by: string | null;
  details: string | null;
};

type TeamRow = {
  id: string;
  saison: string;
  code: string; // valeur stockée dans events.team
  label: string; // libellé affiché
  categorie?: string | null;
  type_equipe?: string | null;
  actif?: boolean | null;
  ordre?: number | null;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TYPE_OPTIONS = [
  { value: "entrainement", label: "Entraînement" },
  { value: "competition", label: "Compétition" },
  { value: "evenement", label: "Événement du club" },
];

function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function plusMonthsISO(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function formatDateFR(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function computeSeasonLabel(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return "—";
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  if (month >= 9) return `${year}-${year + 1}`;
  return `${year - 1}-${year}`;
}

function cn(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function isISODate(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function enumerateDates(fromISO: string, toISO: string): string[] {
  if (!isISODate(fromISO) || !isISODate(toISO)) return [];
  const from = new Date(fromISO + "T00:00:00");
  const to = new Date(toISO + "T00:00:00");
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return [];
  if (to < from) return [];

  const days: string[] = [];
  const cur = new Date(from);
  while (cur <= to) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    days.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export default function NewEventPage() {
  const router = useRouter();

  // ─────────────────────────────
  //  Teams dynamiques (table equipes)
  // ─────────────────────────────
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [teamsError, setTeamsError] = useState<string | null>(null);

  // ─────────────────────────────
  //  Formulaire
  // ─────────────────────────────
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");

  // multi-jours (duplication)
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");

  // multi-équipes (duplication) — "toutes" exclusive
  const [selectedTeams, setSelectedTeams] = useState<string[]>(["toutes"]);

  const [eventType, setEventType] = useState("entrainement");
  const [location, setLocation] = useState("Gymnase du club");

  const [loadingForm, setLoadingForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const seasonLabel = computeSeasonLabel(dateFrom);

  async function fetchTeams(saison?: string) {
    setLoadingTeams(true);
    setTeamsError(null);
    try {
      const qs = saison && saison !== "—" ? `?saison=${encodeURIComponent(saison)}` : "";
      const res = await fetch(`/api/teams/list${qs}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Impossible de charger les équipes");
      }

      const list = (json.teams as TeamRow[]) ?? [];
      const hasToutes = list.some((t) => t.code === "toutes");
      const normalized = hasToutes
        ? list
        : [
            { id: "ui-toutes", saison: saison || "—", code: "toutes", label: "Toutes les équipes", ordre: 0 },
            ...list,
          ];

      setTeams(normalized);
    } catch (e: any) {
      console.error(e);
      setTeamsError(e?.message || "Erreur chargement équipes");
    } finally {
      setLoadingTeams(false);
    }
  }

  useEffect(() => {
    fetchTeams(seasonLabel !== "—" ? seasonLabel : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonLabel]);

  useEffect(() => {
    if (!teams.length) return;
    const valid = new Set(teams.map((t) => t.code));
    setSelectedTeams((prev) => {
      const cleaned = prev.filter((c) => valid.has(c));
      if (cleaned.length === 0) return ["toutes"];
      if (cleaned.includes("toutes") && cleaned.length > 1) return cleaned.filter((c) => c !== "toutes");
      return cleaned;
    });
  }, [teams]);

  useEffect(() => {
    if (!dateFrom || !dateTo) return;
    const a = new Date(dateFrom + "T00:00:00").getTime();
    const b = new Date(dateTo + "T00:00:00").getTime();
    if (!Number.isNaN(a) && !Number.isNaN(b) && b < a) setDateTo(dateFrom);
  }, [dateFrom, dateTo]);

  const teamLabelByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of teams) m.set(t.code, t.label);
    return m;
  }, [teams]);

  const selectedTeamsLabel = useMemo(() => {
    if (!selectedTeams.length) return "—";
    if (selectedTeams.includes("toutes")) return "Toutes les équipes";
    return selectedTeams
      .map((code) => teamLabelByCode.get(code) || code)
      .filter(Boolean)
      .join(", ");
  }, [selectedTeams, teamLabelByCode]);

  function toggleTeam(code: string) {
    setSelectedTeams((prev) => {
      const has = prev.includes(code);

      if (code === "toutes") return ["toutes"];

      const base = prev.filter((c) => c !== "toutes");
      if (has) {
        const next = base.filter((c) => c !== code);
        return next.length ? next : ["toutes"];
      }
      return [...base, code];
    });
  }

  const previewCount = useMemo(() => {
    const effectiveTo = dateTo || dateFrom;
    const days = dateFrom && effectiveTo ? enumerateDates(dateFrom, effectiveTo) : [];
    const teamsCount = selectedTeams.includes("toutes") ? 1 : selectedTeams.length || 1;
    return (days.length || 0) * teamsCount;
  }, [dateFrom, dateTo, selectedTeams]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!title.trim()) return setFormError("Merci d’indiquer un titre d’évènement.");
    if (!dateFrom) return setFormError("Merci de choisir une date de début.");
    if (!startTime || !endTime) return setFormError("Merci de renseigner l’heure de début et de fin.");

    const effectiveTo = dateTo || dateFrom;
    const days = enumerateDates(dateFrom, effectiveTo);
    if (!days.length) return setFormError("Période invalide : vérifie les dates (début/fin).");
    if (days.length > 60) return setFormError("Période trop longue (max 60 jours).");
    if (!selectedTeams.length) return setFormError("Merci de sélectionner au moins une équipe.");

    setLoadingForm(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const teamsToInsert = selectedTeams.length ? selectedTeams : ["toutes"];

      const rows = days.flatMap((d) =>
        teamsToInsert.map((teamCode) => ({
          title: title.trim(),
          team: teamCode || null,
          type: eventType,
          date: d,
          start_time: startTime,
          end_time: endTime,
          location: location.trim() || null,
          details: details.trim() || null,
          created_by: user?.email ?? null,
        }))
      );

      const { error } = await supabase.from("events").insert(rows);

      if (error) {
        console.error("Erreur insert events :", error);
        setFormError(`Impossible d’enregistrer l’évènement : ${error.message ?? "erreur inconnue"}`);
      } else {
        setFormSuccess("Planning mis à jour ✅");
        setTimeout(() => router.push("/bureau/planning"), 900);
      }
    } catch (err) {
      console.error("Erreur inattendue (insert) :", err);
      setFormError("Une erreur inattendue est survenue lors de l’enregistrement.");
    } finally {
      setLoadingForm(false);
    }
  }

  // ─────────────────────────────
  //  Modal ajout équipe (inline)
  // ─────────────────────────────
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeamLabel, setNewTeamLabel] = useState("");
  const [newTeamCode, setNewTeamCode] = useState("");
  const [newTeamType, setNewTeamType] = useState("");
  const [newTeamCategorie, setNewTeamCategorie] = useState("");
  const [addingTeam, setAddingTeam] = useState(false);
  const [addTeamError, setAddTeamError] = useState<string | null>(null);

  async function handleCreateTeam() {
    setAddTeamError(null);

    const saison = seasonLabel !== "—" ? seasonLabel : computeSeasonLabel(todayISO());
    if (!newTeamLabel.trim()) {
      setAddTeamError("Merci d’indiquer le nom de l’équipe (label).");
      return;
    }

    setAddingTeam(true);
    try {
      const res = await fetch("/api/teams/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": process.env.NEXT_PUBLIC_BUREAU_ADMIN_TOKEN || "",
        },
        body: JSON.stringify({
          saison,
          label: newTeamLabel.trim(),
          code: newTeamCode.trim() || undefined,
          type_equipe: newTeamType.trim() || undefined,
          categorie: newTeamCategorie.trim() || undefined,
          ordre: 100,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Impossible de créer l’équipe");

      await fetchTeams(saison);

      setSelectedTeams((prev) => {
        const code = json.team.code as string;
        const base = prev.includes("toutes") ? [] : prev;
        if (base.includes(code)) return base;
        return [...base, code].length ? [...base, code] : ["toutes"];
      });

      setShowAddTeam(false);
      setNewTeamLabel("");
      setNewTeamCode("");
      setNewTeamType("");
      setNewTeamCategorie("");
    } catch (e: any) {
      setAddTeamError(e?.message || "Erreur lors de la création");
    } finally {
      setAddingTeam(false);
    }
  }

  const periodLabel = useMemo(() => {
    const from = todayISO();
    const to = plusMonthsISO(3);
    return `${formatDateFR(from)} → ${formatDateFR(to)}`;
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 py-10">
      <div className="max-w-6xl mx-auto px-4">
        {/* Breadcrumb */}
        <div className="mb-6 text-sm text-slate-400 flex flex-wrap gap-1">
          <button type="button" onClick={() => router.push("/bureau")} className="hover:text-slate-100 transition">
            Espace bureau
          </button>
          <span>/</span>
          <button
            type="button"
            onClick={() => router.push("/bureau/planning")}
            className="hover:text-slate-100 transition"
          >
            Planning du club
          </button>
          <span>/</span>
          <span className="text-slate-200">Nouvel évènement</span>
        </div>

        {/* Titre */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Créer un évènement de planning</h1>
            <p className="text-slate-300 max-w-2xl">
              Multi-jours et multi-équipes = duplication automatique des lignes dans{" "}
              <span className="font-semibold">public.events</span>.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/bureau/planning")}
            className="inline-flex items-center justify-center rounded-lg border border-slate-600 bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800 transition"
          >
            ↩️ Retour au planning
          </button>
        </div>

        {/* ✅ Bandeau léger (remplace l'historique/synthèse) */}
        <div className="mb-8 rounded-2xl border border-slate-700/70 bg-slate-900/70 p-5 shadow-lg shadow-black/30">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-slate-100">Planning mis à jour</div>
              <div className="text-xs text-slate-400">
                Tu peux revenir au planning pour vérifier l’affichage. Période de référence :{" "}
                <span className="text-slate-200">{periodLabel}</span>
              </div>
            </div>
            <div className="text-xs text-slate-400">
              (Page allégée pour éviter les ralentissements navigateur)
            </div>
          </div>
        </div>

        {/* Messages form */}
        {formError && (
          <div className="mb-4 rounded-lg border border-red-500/70 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {formError}
          </div>
        )}
        {formSuccess && (
          <div className="mb-4 rounded-lg border border-emerald-500/70 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {formSuccess} — redirection vers le planning…
          </div>
        )}

        {/* Erreur équipes */}
        {teamsError && (
          <div className="mb-4 rounded-lg border border-amber-500/60 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            ⚠️ {teamsError}
          </div>
        )}

        {/* Formulaire */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-700/70 shadow-xl shadow-black/50 backdrop-blur">
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            {/* Ligne titre + type */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-200 mb-1">Titre de l’évènement</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Entraînement Junior – Mardi soir"
                  className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm md:text-base text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/70 focus:border-pink-500/80"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Type d’évènement</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm md:text-base text-slate-50 focus:outline-none focus:ring-2 focus:ring-pink-500/70 focus:border-pink-500/80"
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dates / heures */}
            <div className="grid md:grid-cols-6 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-200 mb-1">Du (date début)</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm md:text-base text-slate-50 focus:outline-none focus:ring-2 focus:ring-pink-500/70 focus:border-pink-500/80"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Saison : <span className="font-semibold text-slate-100">{seasonLabel}</span>
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-200 mb-1">Au (date fin)</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm md:text-base text-slate-50 focus:outline-none focus:ring-2 focus:ring-pink-500/70 focus:border-pink-500/80"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Laisser vide = <span className="text-slate-200">1 seul jour</span>.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Début</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm md:text-base text-slate-50 focus:outline-none focus:ring-2 focus:ring-pink-500/70 focus:border-pink-500/80"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Fin</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm md:text-base text-slate-50 focus:outline-none focus:ring-2 focus:ring-pink-500/70 focus:border-pink-500/80"
                />
              </div>
            </div>

            {/* Sélection multi-équipes */}
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
              <div className="flex items-start md:items-center justify-between gap-3 mb-2">
                <div>
                  <div className="text-sm font-medium text-slate-200">Équipes concernées</div>
                  <div className="text-[12px] text-slate-400">
                    Multi-sélection = duplication d’une ligne par équipe (sans ajouter de champs en base).
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddTeam(true)}
                  className="text-[12px] font-medium text-pink-300 hover:text-pink-200 transition"
                >
                  + Ajouter une équipe
                </button>
              </div>

              {loadingTeams ? (
                <div className="text-sm text-slate-300">Chargement des équipes…</div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {teams.map((t) => {
                    const checked = selectedTeams.includes(t.code);
                    const isToutes = t.code === "toutes";
                    return (
                      <label
                        key={`${t.saison}-${t.code}`}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition",
                          checked
                            ? "border-pink-500/60 bg-pink-500/10"
                            : "border-slate-700 bg-slate-950/30 hover:bg-slate-900/60"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTeam(t.code)}
                          className="h-4 w-4"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-slate-100 truncate">
                            {t.label}
                            {isToutes && <span className="ml-2 text-[11px] text-slate-400">(global)</span>}
                          </div>
                          {t.categorie ? <div className="text-[11px] text-slate-400 truncate">{t.categorie}</div> : null}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="text-[12px] text-slate-400">
                  Sélection : <span className="text-slate-200">{selectedTeamsLabel}</span>
                </div>
                <div className="text-[12px] text-slate-400">
                  Prévisualisation insert : <span className="text-slate-200 font-semibold">{previewCount || 0}</span>{" "}
                  ligne{previewCount > 1 ? "s" : ""}
                </div>
              </div>
            </div>

            {/* Lieu */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-slate-200 mb-1">Lieu</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Gymnase, adresse, salle…"
                  className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm md:text-base text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/70 focus:border-pink-500/80"
                />
              </div>
            </div>

            {/* Détails */}
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Détails / consignes (optionnel)</label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={4}
                placeholder="Consignes particulières, dress code, infos déplacement, covoiturage…"
                className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm md:text-base text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/70 focus:border-pink-500/80"
              />
            </div>

            {/* Boutons */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-2">
              <p className="text-xs text-slate-400">
                Les évènements créés sont enregistrés dans <span className="font-semibold">public.events</span>.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => router.push("/bureau/planning")}
                  className="rounded-lg border border-slate-600 bg-slate-900/80 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 transition"
                  disabled={loadingForm}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loadingForm}
                  className="inline-flex items-center justify-center rounded-lg bg-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-pink-500/30 hover:bg-pink-400 transition disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loadingForm ? "Enregistrement…" : "Enregistrer l’évènement"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Modal ajout équipe */}
        {showAddTeam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-950/95 shadow-2xl">
              <div className="p-5 border-b border-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">Ajouter une équipe</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Saison ciblée :{" "}
                      <span className="text-slate-200 font-semibold">{seasonLabel !== "—" ? seasonLabel : "auto"}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddTeam(false)}
                    className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800 transition"
                  >
                    Fermer
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {addTeamError && (
                  <div className="rounded-lg border border-red-500/70 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                    {addTeamError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">Nom affiché (label)</label>
                  <input
                    value={newTeamLabel}
                    onChange={(e) => setNewTeamLabel(e.target.value)}
                    placeholder="Ex: Cadet"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/60"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">Code (optionnel)</label>
                    <input
                      value={newTeamCode}
                      onChange={(e) => setNewTeamCode(e.target.value)}
                      placeholder="Ex: cadet"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/60"
                    />
                    <p className="mt-1 text-[11px] text-slate-400">Sinon, on le génère depuis le label.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">Type équipe (optionnel)</label>
                    <input
                      value={newTeamType}
                      onChange={(e) => setNewTeamType(e.target.value)}
                      placeholder="Ex: allstar / loisir"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-1">Catégorie (optionnel)</label>
                  <input
                    value={newTeamCategorie}
                    onChange={(e) => setNewTeamCategorie(e.target.value)}
                    placeholder="Ex: compétition / performance / loisir"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-pink-500/60"
                  />
                </div>
              </div>

              <div className="p-5 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddTeam(false)}
                  className="rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 transition"
                  disabled={addingTeam}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleCreateTeam}
                  disabled={addingTeam}
                  className="rounded-lg bg-pink-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-pink-500/30 hover:bg-pink-400 transition disabled:opacity-60"
                >
                  {addingTeam ? "Création…" : "Créer l’équipe"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
