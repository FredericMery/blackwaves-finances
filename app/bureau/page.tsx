"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Option = {
  href: string;
  label: string;
};

type Group = {
  id: string;
  label: string;
  helper: string;
  options: Option[];
};

const primaryActions: Option[] = [
  { href: "/bureau/gerer-asso-2", label: "Gérer l'association 2" },
  { href: "/bureau/preparer-saison", label: "Préparer la saison" },
  { href: "/bureau/comparatif-budget", label: "Comparer les années" },
];

const actionGroups: Group[] = [
  {
    id: "finance",
    label: "Budget et finance",
    helper: "Pilotage des budgets, suivi financier et comptes.",
    options: [
      { href: "/bureau/dashboard", label: "Tableau de bord" },
      { href: "/bureau/budget", label: "Budget détaillé" },
      { href: "/bureau/previsionnel", label: "Prévisionnel" },
      { href: "/bureau/finances", label: "Finances" },
      { href: "/bureau/comptes-athletes", label: "Comptes athlètes" },
    ],
  },
  {
    id: "inscriptions",
    label: "Inscriptions et dossiers",
    helper: "Suivi administratif des adhérents et des familles.",
    options: [
      { href: "/bureau/preinscriptions", label: "Préinscriptions" },
      { href: "/bureau/inscriptions", label: "Inscriptions" },
      { href: "/bureau/inscrits", label: "Inscrits" },
      { href: "/bureau/dossiers", label: "Dossiers" },
      { href: "/bureau/access", label: "Accès utilisateurs" },
      { href: "/bureau/actions", label: "Actions club" },
    ],
  },
  {
    id: "sport",
    label: "Équipes et organisation",
    helper: "Préparation sportive, planning et affectations.",
    options: [
      { href: "/bureau/liste-athletes", label: "Liste athlètes" },
      { href: "/bureau/definir-equipes", label: "Définir les équipes" },
      { href: "/bureau/affecter-athletes", label: "Affecter les athlètes" },
      { href: "/bureau/coach-equipes", label: "Coach équipes" },
      { href: "/bureau/staff-equipes", label: "Staff équipes" },
      { href: "/bureau/planning", label: "Planning" },
      { href: "/bureau/essais-gymnases", label: "Essais gymnases" },
    ],
  },
  {
    id: "communication",
    label: "Communication et contenus",
    helper: "Pages publiques, campagnes et contenus du club.",
    options: [
      { href: "/bureau/communications", label: "Communications" },
      { href: "/bureau/surveys", label: "Sondages" },
      { href: "/bureau/contenus-publics", label: "Contenus publics" },
      { href: "/bureau/evenements", label: "Événements" },
      { href: "/bureau/photos", label: "Photos" },
      { href: "/bureau/goodies", label: "Goodies" },
    ],
  },
];

export default function BureauPage() {
  const router = useRouter();
  const [selectedByGroup, setSelectedByGroup] = useState<Record<string, string>>({});

  function handleNavigate(href: string) {
    if (!href) return;
    router.push(href);
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-slate-200 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(248,250,252,0.98)_48%,rgba(240,249,255,0.92))] p-5 shadow-[0_26px_70px_rgba(148,163,184,0.18)] sm:p-7">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-cyan-700/80">
            Sélection des actions
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Accès rapide au bureau
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            On garde trois actions prioritaires en tête. Tout le reste est rangé par thème dans des listes déroulantes pour éviter de surcharger l’interface.
          </p>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {primaryActions.map((action, index) => (
            <button
              key={action.href}
              type="button"
              onClick={() => handleNavigate(action.href)}
              className={`rounded-[24px] border px-5 py-5 text-left transition ${
                index === 0
                  ? "border-cyan-200 bg-cyan-50 hover:bg-cyan-100"
                  : index === 1
                  ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                  : "border-violet-200 bg-violet-50 hover:bg-violet-100"
              }`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Priorité {index + 1}
              </div>
              <div className="mt-3 text-xl font-semibold text-slate-950">{action.label}</div>
              <div className="mt-2 text-sm text-slate-600">
                Ouvrir directement cette section.
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {actionGroups.map((group) => (
          <div
            key={group.id}
            className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(148,163,184,0.14)]"
          >
            <div>
              <h2 className="text-lg font-semibold text-slate-950">{group.label}</h2>
              <p className="mt-1 text-sm text-slate-500">{group.helper}</p>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <select
                value={selectedByGroup[group.id] || ""}
                onChange={(event) =>
                  setSelectedByGroup((prev) => ({
                    ...prev,
                    [group.id]: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-200"
              >
                <option value="">Choisir une fonctionnalité</option>
                {group.options.map((option) => (
                  <option key={option.href} value={option.href}>
                    {option.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => handleNavigate(selectedByGroup[group.id] || "")}
                disabled={!selectedByGroup[group.id]}
                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Ouvrir
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {group.options.map((option) => (
                <span
                  key={option.href}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                >
                  {option.label}
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
