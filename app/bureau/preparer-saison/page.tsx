"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Step = {
  id: number;            // ID technique (table steps)
  displayId: string;     // ce qu'on affiche ("3-bis")
  title: string;
  description: string;
  href: string;
};

type StepState = {
  step_id: number;
  done: boolean;
  done_at: string | null;
  done_by: string | null;
};

function cn(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function guessSeasons() {
  const y = new Date().getFullYear();
  const mk = (start: number) => `${start}-${start + 1}`;
  return [mk(y - 1), mk(y), mk(y + 1), mk(y + 2), mk(y + 3)];
}

function nextSeason() {
  const y = new Date().getFullYear();
  return `${y + 1}-${y + 2}`;
}

const STEPS: Step[] = [
  {
    id: 1,
    displayId: "1",
    title: "Pré-inscrire les athlètes",
    description:
      "Relancer les parents des athlètes de la saison précédente, proposer une équipe future, et récupérer leur réponse (Oui/Non/Peut-être).",
    href: "/bureau/preinscriptions",
  },
  {
    id: 2,
    displayId: "2",
    title: "Définir les équipes",
    description:
      "Configurer les tranches d’âge par catégorie et créer les équipes de la saison (type + niveau + capacité). Référence pour toutes les pages suivantes.",
    href: "/bureau/definir-equipes",
  },
  {
    id: 3,
    displayId: "3",
    title: "Choisir les coachs et les équipes",
    description:
      "Attribuer les coachs et assist coachs, et valider la structure d’encadrement par équipe.",
    href: "/bureau/staff-equipes",
  },

  // ✅ NOUVELLE ÉTAPE 3-BIS
  {
    id: 35,
    displayId: "3-bis",
    title: "Affecter les athlètes aux équipes",
    description:
      "Répartir les athlètes dans les équipes de la saison (drag & drop). Enregistrer pour mettre à jour la table athletes.",
    href: "/bureau/affecter-athletes",
  },

  {
    id: 4,
    displayId: "4",
    title: "Choisir les compétitions",
    description:
      "Lister les compétitions et les associer aux équipes avec objectifs sportifs.",
    href: "/bureau/competitions-saison",
  },
  {
    id: 5,
    displayId: "5",
    title: "Définir les dates d’essais par équipe",
    description:
      "Fixer les 2 créneaux d’essai par équipe (date, heure, gymnase). Utilisé dans les e-mails envoyés aux parents.",
    href: "/bureau/essais-gymnases",
  },
  {
    id: 6,
    displayId: "6",
    title: "Définir les événements majeurs de la saison",
    description:
      "Planifier les grands rendez-vous du club : portes ouvertes, shows, shooting photo, événements internes, etc.",
    href: "/bureau/planning",
  },
  {
    id: 7,
    displayId: "7",
    title: "Préparer le budget prévisionnel",
    description:
      "Construire le budget prévisionnel et le préparer pour validation.",
    href: "/bureau/previsionnel",
  },
  {
    id: 8,
    displayId: "8",
    title: "Réaliser le bilan de la saison écoulée (AG)",
    description:
      "Rassembler bilan sportif, bilan financier, actions menées et projets pour préparer l’AG.",
    href: "/bureau/ag-preparation",
  },
];

export default function BureauPrepareSeasonPage() {
  const seasons = useMemo(() => guessSeasons(), []);
  const defaultPrepared = useMemo(() => {
    const ns = nextSeason();
    return seasons.includes(ns) ? ns : seasons[0] || ns;
  }, [seasons]);

  const [loading, setLoading] = useState(true);
  const [savingSeason, setSavingSeason] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [preparedSeason, setPreparedSeason] = useState<string>(defaultPrepared);
  const [stepsState, setStepsState] = useState<Record<number, StepState>>({});

  const doneCount = useMemo(
    () => Object.values(stepsState).filter((s) => s.done).length,
    [stepsState]
  );

  const nextStep = useMemo(() => {
    for (const s of STEPS) {
      if (!stepsState[s.id]?.done) return s.displayId;
    }
    return null;
  }, [stepsState]);

  async function loadAll() {
    setLoading(true);
    setErr(null);
    try {
      const r1 = await fetch("/api/season-preparation/get", { cache: "no-store" });
      const j1 = await r1.json().catch(() => null);
      const current = (j1?.current_saison as string | undefined) || defaultPrepared;

      setPreparedSeason(current);

      const qs = new URLSearchParams({ saison: current });
      const r2 = await fetch(`/api/season-preparation/steps?${qs.toString()}`, { cache: "no-store" });
      const j2 = await r2.json().catch(() => null);

      const map: Record<number, StepState> = {};
      for (const s of j2?.steps || []) map[s.step_id] = s;
      setStepsState(map);
    } catch (e: any) {
      setErr(e?.message || "Erreur chargement.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveSeason(newSeason: string) {
    setSavingSeason(true);
    setErr(null);
    try {
      const r = await fetch("/api/season-preparation/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_saison: newSeason }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Sauvegarde saison impossible.");

      setPreparedSeason(newSeason);

      const qs = new URLSearchParams({ saison: newSeason });
      const r2 = await fetch(`/api/season-preparation/steps?${qs.toString()}`, { cache: "no-store" });
      const j2 = await r2.json().catch(() => null);

      const map: Record<number, StepState> = {};
      for (const s of j2?.steps || []) map[s.step_id] = s;
      setStepsState(map);
    } catch (e: any) {
      setErr(e?.message || "Erreur sauvegarde saison.");
    } finally {
      setSavingSeason(false);
    }
  }

  async function toggleStep(step_id: number, done: boolean) {
    setErr(null);
    try {
      const r = await fetch("/api/season-preparation/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saison: preparedSeason,
          step_id,
          done,
          done_by: "admin",
        }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) throw new Error(j?.error || "MAJ étape impossible.");

      setStepsState((m) => ({
        ...m,
        [step_id]: {
          step_id,
          done,
          done_at: j.done_at ?? null,
          done_by: j.done_by ?? null,
        },
      }));
    } catch (e: any) {
      setErr(e?.message || "Erreur MAJ étape.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10">
        <header className="mb-6 border-b border-white/5 pb-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-400">
                Espace bureau
              </div>
              <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">
                Préparer la prochaine saison
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Une seule préparation commune : saison + avancement des étapes sont partagés entre admins.
              </p>
            </div>

            <Link
              href="/bureau"
              className="inline-flex items-center rounded-full border border-slate-600 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-100 hover:border-slate-400"
            >
              ← Retour au tableau de bord
            </Link>
          </div>
        </header>

        <section className="mb-6 rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-lg shadow-black/40">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-300">
                Saison préparée (commune)
              </div>
              <div className="mt-1 text-sm text-slate-300">
                Cette saison est enregistrée en base. Tous les admins voient la même.
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={preparedSeason}
                onChange={(e) => saveSeason(e.target.value)}
                disabled={savingSeason || loading}
                className={cn(
                  "min-w-[180px] rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/70",
                  savingSeason || loading
                    ? "border-slate-700 bg-slate-900/40 text-slate-400 cursor-not-allowed"
                    : "border-slate-700 bg-slate-950/60 text-slate-100"
                )}
              >
                {seasons.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                {preparedSeason}
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span>
              Progression : <span className="text-slate-200">{doneCount}/{STEPS.length}</span> étapes terminées
            </span>
            {nextStep && (
              <span>
                Prochaine étape :{" "}
                <span className="text-slate-200 font-semibold">Étape {nextStep}</span>
              </span>
            )}
          </div>
        </section>

        {err && (
          <div className="mb-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {err}
          </div>
        )}

        <section className="space-y-4">
          {STEPS.map((step, idx) => {
            const st = stepsState[step.id];
            const isDone = Boolean(st?.done);

            const hrefWithSeason = `${step.href}?saison=${encodeURIComponent(preparedSeason)}`;

            return (
              <div key={step.id} className="relative">
                {idx < STEPS.length - 1 && (
                  <div className="absolute left-[18px] top-[58px] hidden h-[calc(100%-40px)] w-[2px] bg-slate-700/60 md:block" />
                )}

                <article
                  id={`step-${step.id}`}
                  className="relative flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-lg shadow-black/40 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold shadow-md",
                        isDone
                          ? "border-emerald-400 bg-emerald-500/10 text-emerald-200 shadow-emerald-900/30"
                          : "border-pink-400 bg-slate-950 text-pink-100 shadow-pink-900/40"
                      )}
                      title={isDone ? "Terminé" : "À faire"}
                    >
                      {step.displayId}
                    </div>

                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                        Étape {step.displayId}
                      </div>
                      <h2 className="mt-0.5 text-base font-semibold text-white">{step.title}</h2>
                      <p className="mt-1 text-sm text-slate-200">{step.description}</p>

                      {isDone && st?.done_at && (
                        <div className="mt-2 text-[11px] text-slate-400">
                          Terminé le {new Date(st.done_at).toLocaleString("fr-FR")}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <button
                      type="button"
                      onClick={() => toggleStep(step.id, !isDone)}
                      disabled={loading}
                      className={cn(
                        "inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold transition",
                        loading
                          ? "border-slate-700 bg-slate-900/30 text-slate-400 cursor-not-allowed"
                          : isDone
                          ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15"
                          : "border-slate-600 bg-slate-900/40 text-slate-200 hover:border-slate-400"
                      )}
                      title={isDone ? "Marquer comme non terminée" : "Marquer comme terminée"}
                    >
                      {isDone ? "✅ Terminée" : "Marquer comme terminée"}
                    </button>

                    <Link
                      href={hrefWithSeason}
                      className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-900/40 hover:bg-emerald-600"
                    >
                      Ouvrir l’étape
                    </Link>
                  </div>
                </article>
              </div>
            );
          })}
        </section>

        <div className="mt-6 text-xs text-slate-400">
          Note : les liens transmettent <span className="text-slate-200">?saison=…</span>.
        </div>
      </div>
    </div>
  );
}
