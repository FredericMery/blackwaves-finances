"use client";

import { useEffect, useMemo, useState } from "react";

type LoadStatus = "idle" | "loading" | "success" | "error" | "saving";

type TeamRow = {
  team_key: string;
  team_order: number;
  label: string;
};

type TrialSession = {
  id: string;
  date: string;
  start: string;
  end: string;
  gymnase: string;
  targetKeys: string[];
};

type ApiSlot = {
  team_key: string;
  team_order: number;
  trial_sessions?: Array<{
    date?: string | null;
    start?: string | null;
    end?: string | null;
    gymnase?: string | null;
  }>;
  essai1_date?: string | null;
  essai1_start?: string | null;
  essai1_end?: string | null;
  essai1_gymnase?: string | null;
  essai2_date?: string | null;
  essai2_start?: string | null;
  essai2_end?: string | null;
  essai2_gymnase?: string | null;
};

const TEAM_ROWS: TeamRow[] = [
  { team_key: "Tiny", team_order: 1, label: "Tiny - Equipe 1" },
  { team_key: "Tiny", team_order: 2, label: "Tiny - Equipe 2" },
  { team_key: "Minimes", team_order: 1, label: "Minimes - Equipe 1" },
  { team_key: "Minimes", team_order: 2, label: "Minimes - Equipe 2" },
  { team_key: "Cadets", team_order: 1, label: "Cadets - Equipe 1" },
  { team_key: "Cadets", team_order: 2, label: "Cadets - Equipe 2" },
  { team_key: "Juniors", team_order: 1, label: "Juniors - Equipe 1" },
  { team_key: "Juniors", team_order: 2, label: "Juniors - Equipe 2" },
  { team_key: "Senior", team_order: 1, label: "Senior - Equipe 1" },
  { team_key: "Senior", team_order: 2, label: "Senior - Equipe 2" },
];

const GYMNASES = ["", "Gymnase Cluny", "Gymnase Dromel"];

function getCurrentSeason(now = new Date()): string {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 8 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

function getSeasonOptions(): string[] {
  const current = getCurrentSeason();
  const startYear = Number(current.slice(0, 4));
  const seasons: string[] = [];
  for (let i = 0; i < 4; i++) {
    const y = startYear + i;
    seasons.push(`${y}-${y + 1}`);
  }
  return seasons;
}

function uuid() {
  return Math.random().toString(36).slice(2, 10);
}

function clean(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function isSessionFilled(session: Pick<TrialSession, "date" | "start" | "end" | "gymnase">) {
  return Boolean(session.date || session.start || session.end || session.gymnase);
}

function makeTeamKey(team_key: string, team_order: number) {
  return `${team_key}__${team_order}`;
}

function normalizeApiSessions(slot: ApiSlot) {
  const fromJson = Array.isArray(slot.trial_sessions)
    ? slot.trial_sessions
        .map((s) => ({
          date: clean(s?.date),
          start: clean(s?.start),
          end: clean(s?.end),
          gymnase: clean(s?.gymnase),
        }))
        .filter(isSessionFilled)
    : [];

  if (fromJson.length) {
    return fromJson;
  }

  return [
    {
      date: clean(slot.essai1_date),
      start: clean(slot.essai1_start),
      end: clean(slot.essai1_end),
      gymnase: clean(slot.essai1_gymnase),
    },
    {
      date: clean(slot.essai2_date),
      start: clean(slot.essai2_start),
      end: clean(slot.essai2_end),
      gymnase: clean(slot.essai2_gymnase),
    },
  ].filter(isSessionFilled);
}

function sessionSignature(s: { date: string; start: string; end: string; gymnase: string }) {
  return `${s.date}|${s.start}|${s.end}|${s.gymnase}`;
}

export default function EssaisGymnasesPage() {
  const seasonOptions = useMemo(() => getSeasonOptions(), []);
  const [selectedSeason, setSelectedSeason] = useState<string>(seasonOptions[0]);

  const [status, setStatus] = useState<LoadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [sessions, setSessions] = useState<TrialSession[]>([]);

  const [draftDate, setDraftDate] = useState("");
  const [draftStart, setDraftStart] = useState("");
  const [draftEnd, setDraftEnd] = useState("");
  const [draftGymnase, setDraftGymnase] = useState("");
  const [draftTargets, setDraftTargets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = async () => {
      setStatus("loading");
      setError(null);
      setSuccessMessage(null);

      try {
        const res = await fetch(`/api/essais-equipes?saison=${encodeURIComponent(selectedSeason)}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Impossible de charger les dates d'essai pour cette saison.");
          setStatus("error");
          return;
        }

        const slotsFromApi = (data.slots || []) as ApiSlot[];
        const grouped = new Map<
          string,
          {
            id: string;
            date: string;
            start: string;
            end: string;
            gymnase: string;
            targetKeys: string[];
          }
        >();

        for (const slot of slotsFromApi) {
          const teamRef = makeTeamKey(slot.team_key, slot.team_order);
          const slotSessions = normalizeApiSessions(slot);

          for (const s of slotSessions) {
            const sig = sessionSignature(s);
            const existing = grouped.get(sig);
            if (!existing) {
              grouped.set(sig, {
                id: uuid(),
                date: s.date,
                start: s.start,
                end: s.end,
                gymnase: s.gymnase,
                targetKeys: [teamRef],
              });
            } else if (!existing.targetKeys.includes(teamRef)) {
              existing.targetKeys.push(teamRef);
            }
          }
        }

        const mergedSessions = Array.from(grouped.values());
        setSessions(mergedSessions);
        setStatus("success");
      } catch (err: any) {
        setError(err?.message || "Erreur reseau lors du chargement des essais equipes.");
        setStatus("error");
      }
    };

    load();
  }, [selectedSeason]);

  const resetDraft = () => {
    setDraftDate("");
    setDraftStart("");
    setDraftEnd("");
    setDraftGymnase("");
    setDraftTargets({});
  };

  const addDraftSession = () => {
    setError(null);
    setSuccessMessage(null);

    const targetKeys = Object.entries(draftTargets)
      .filter(([, checked]) => checked)
      .map(([key]) => key);

    if (!isSessionFilled({ date: draftDate, start: draftStart, end: draftEnd, gymnase: draftGymnase })) {
      setError("Renseigne au moins une info de seance (date, heure ou gymnase).");
      return;
    }

    if (!targetKeys.length) {
      setError("Selectionne au moins une equipe pour cette seance.");
      return;
    }

    setSessions((prev) => [
      ...prev,
      {
        id: uuid(),
        date: draftDate,
        start: draftStart,
        end: draftEnd,
        gymnase: draftGymnase,
        targetKeys,
      },
    ]);

    resetDraft();
    setSuccessMessage("Seance ajoutee. Tu peux en creer une autre.");
  };

  const updateSessionField = (id: string, field: "date" | "start" | "end" | "gymnase", value: string) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const toggleSessionTarget = (id: string, target: string, checked: boolean) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const next = checked
          ? Array.from(new Set([...s.targetKeys, target]))
          : s.targetKeys.filter((k) => k !== target);
        return { ...s, targetKeys: next };
      })
    );
  };

  const removeSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSave = async () => {
    setStatus("saving");
    setError(null);
    setSuccessMessage(null);

    try {
      const payloadSlots = TEAM_ROWS.map((row) => {
        const teamKey = makeTeamKey(row.team_key, row.team_order);

        const teamSessions = sessions
          .filter((s) => s.targetKeys.includes(teamKey))
          .filter((s) => isSessionFilled(s))
          .map((s) => ({
            date: s.date || null,
            start: s.start || null,
            end: s.end || null,
            gymnase: s.gymnase || null,
          }));

        return {
          team_key: row.team_key,
          team_order: row.team_order,
          trial_sessions: teamSessions,
        };
      });

      const res = await fetch("/api/essais-equipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saison: selectedSeason,
          slots: payloadSlots,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Impossible d'enregistrer les dates d'essai. Merci de reessayer.");
        setStatus("error");
        return;
      }

      setSuccessMessage(data.message || "Les dates d'essai ont bien ete enregistrees.");
      setStatus("success");
    } catch (err: any) {
      setError(err?.message || "Erreur reseau lors de l'enregistrement des dates d'essai.");
      setStatus("error");
    }
  };

  const isSaving = status === "saving";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-10">
        <header className="mb-6 border-b border-white/5 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-400">
                Espace bureau - Preparation saison
              </div>
              <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">
                Seances d'essai par equipe
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Cree une seance, choisis les equipes, ajoute. Recommence autant de fois que necessaire.
              </p>
            </div>

            <div className="flex flex-col items-end gap-2 text-sm">
              <label className="text-xs text-slate-300">
                Saison
                <select
                  className="mt-1 rounded-full border border-slate-600 bg-slate-950 px-3 py-1 text-xs text-slate-100 outline-none focus:border-sky-500"
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                >
                  {seasonOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-emerald-500/40 hover:bg-emerald-600 disabled:opacity-60"
              >
                {isSaving ? "Enregistrement en cours..." : "Enregistrer les dates d'essai"}
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/60 bg-rose-900/40 px-4 py-3 text-sm text-rose-50">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded-xl border border-emerald-500/60 bg-emerald-900/40 px-4 py-3 text-sm text-emerald-50">
            {successMessage}
          </div>
        )}

        {status === "loading" && (
          <div className="rounded-xl border border-sky-500/40 bg-sky-900/30 px-4 py-3 text-sm text-sky-50">
            Chargement des essais equipes...
          </div>
        )}

        {(status === "success" || status === "saving") && (
          <section className="mb-6 rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-xl shadow-black/40">
            <h2 className="text-base font-semibold text-slate-100">Creer une seance d'essai</h2>

            <div className="mt-4 grid gap-2 md:grid-cols-4">
              <input
                type="date"
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
                className="w-full rounded-md border border-slate-600 bg-slate-950 px-2 py-2 text-xs text-slate-50 outline-none focus:border-sky-500"
              />
              <input
                type="time"
                value={draftStart}
                onChange={(e) => setDraftStart(e.target.value)}
                className="w-full rounded-md border border-slate-600 bg-slate-950 px-2 py-2 text-xs text-slate-50 outline-none focus:border-sky-500"
              />
              <input
                type="time"
                value={draftEnd}
                onChange={(e) => setDraftEnd(e.target.value)}
                className="w-full rounded-md border border-slate-600 bg-slate-950 px-2 py-2 text-xs text-slate-50 outline-none focus:border-sky-500"
              />
              <select
                value={draftGymnase}
                onChange={(e) => setDraftGymnase(e.target.value)}
                className="w-full rounded-md border border-slate-600 bg-slate-950 px-2 py-2 text-xs text-slate-50 outline-none focus:border-sky-500"
              >
                <option value="">-- Choisir gymnase --</option>
                {GYMNASES.map((g) =>
                  g ? (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ) : null
                )}
              </select>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {TEAM_ROWS.map((row) => {
                const key = makeTeamKey(row.team_key, row.team_order);
                return (
                  <label
                    key={key}
                    className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/50 px-2 py-1.5 text-xs text-slate-200"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(draftTargets[key])}
                      onChange={(e) =>
                        setDraftTargets((prev) => ({
                          ...prev,
                          [key]: e.target.checked,
                        }))
                      }
                      className="h-4 w-4"
                    />
                    {row.label}
                  </label>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addDraftSession}
              className="mt-4 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
            >
              Ajouter cette seance
            </button>
          </section>
        )}

        {(status === "success" || status === "saving") && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-100">Seances configurees</h2>

            {sessions.length === 0 && (
              <div className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
                Aucune seance pour le moment.
              </div>
            )}

            {sessions.map((session, idx) => (
              <article key={session.id} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-xl shadow-black/40">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Seance {idx + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removeSession(session.id)}
                    className="rounded-full border border-rose-400/50 bg-rose-500/20 px-2 py-0.5 text-[11px] font-semibold text-rose-100 hover:bg-rose-500/30"
                  >
                    Supprimer
                  </button>
                </div>

                <div className="grid gap-2 md:grid-cols-4">
                  <input
                    type="date"
                    value={session.date}
                    onChange={(e) => updateSessionField(session.id, "date", e.target.value)}
                    className="w-full rounded-md border border-slate-600 bg-slate-950 px-2 py-2 text-xs text-slate-50 outline-none focus:border-sky-500"
                  />
                  <input
                    type="time"
                    value={session.start}
                    onChange={(e) => updateSessionField(session.id, "start", e.target.value)}
                    className="w-full rounded-md border border-slate-600 bg-slate-950 px-2 py-2 text-xs text-slate-50 outline-none focus:border-sky-500"
                  />
                  <input
                    type="time"
                    value={session.end}
                    onChange={(e) => updateSessionField(session.id, "end", e.target.value)}
                    className="w-full rounded-md border border-slate-600 bg-slate-950 px-2 py-2 text-xs text-slate-50 outline-none focus:border-sky-500"
                  />
                  <select
                    value={session.gymnase}
                    onChange={(e) => updateSessionField(session.id, "gymnase", e.target.value)}
                    className="w-full rounded-md border border-slate-600 bg-slate-950 px-2 py-2 text-xs text-slate-50 outline-none focus:border-sky-500"
                  >
                    <option value="">-- Choisir gymnase --</option>
                    {GYMNASES.map((g) =>
                      g ? (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ) : null
                    )}
                  </select>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {TEAM_ROWS.map((row) => {
                    const key = makeTeamKey(row.team_key, row.team_order);
                    return (
                      <label
                        key={key}
                        className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/50 px-2 py-1.5 text-xs text-slate-200"
                      >
                        <input
                          type="checkbox"
                          checked={session.targetKeys.includes(key)}
                          onChange={(e) => toggleSessionTarget(session.id, key, e.target.checked)}
                          className="h-4 w-4"
                        />
                        {row.label}
                      </label>
                    );
                  })}
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
