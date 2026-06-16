"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type BudgetLigne = {
  id: string;
  type: string; // "depense" | "recette" en pratique
  date: string;
  saison: string;
  categorie: string;
  montant: number;
  libelle?: string;
  commentaire?: string;
  facture_url?: string;
  created_at?: string;
};

type BudgetAggregSaison = {
  saison: string;
  totalRecettes: number;
  totalDepenses: number;
  solde: number;
};

type BudgetAggregCategorie = {
  categorie: string;
  total: number;
  pourcentage: number;
};

function formatCurrency(value: number): string {
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });
}

function formatDateFr(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("fr-FR");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur inattendue s'est produite.";
}

export default function BureauClubDashboardPage() {
  const [budgetLignes, setBudgetLignes] = useState<BudgetLigne[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSaison, setSelectedSaison] = useState<string>("all");
  const [selectedCategorie, setSelectedCategorie] = useState<string>("all");

  // Chargement des données budget
  useEffect(() => {
    async function loadBudget() {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from("budget_lignes")
          .select("*")
          .order("date", { ascending: false });

        if (error) {
          console.error("Erreur chargement budget_lignes:", error);
          setError("Impossible de charger les données budgétaires.");
          setBudgetLignes([]);
          return;
        }

        setBudgetLignes((data as BudgetLigne[]) ?? []);
      } catch (error: unknown) {
        console.error("Erreur inattendue dashboard:", error);
        setError(errorMessage(error));
      } finally {
        setLoading(false);
      }
    }

    loadBudget();
  }, []);

  // Liste des saisons et catégories disponibles
  const saisonsDisponibles = useMemo(() => {
    const set = new Set<string>();
    budgetLignes.forEach((l) => {
      if (l.saison) set.add(l.saison);
    });
    return Array.from(set).sort().reverse();
  }, [budgetLignes]);

  const categoriesDisponibles = useMemo(() => {
    const set = new Set<string>();
    budgetLignes.forEach((l) => {
      if (l.categorie) set.add(l.categorie);
    });
    return Array.from(set).sort();
  }, [budgetLignes]);

  // Lignes filtrées
  const lignesFiltrees = useMemo(() => {
    return budgetLignes.filter((l) => {
      if (selectedSaison !== "all" && l.saison !== selectedSaison) {
        return false;
      }
      if (selectedCategorie !== "all" && l.categorie !== selectedCategorie) {
        return false;
      }
      return true;
    });
  }, [budgetLignes, selectedSaison, selectedCategorie]);

  // KPI globaux sur les lignes filtrées
  const { totalRecettes, totalDepenses, solde } = useMemo(() => {
    let recettes = 0;
    let depenses = 0;

    for (const l of lignesFiltrees) {
      const type = (l.type || "").toLowerCase();
      if (type === "recette") {
        recettes += Number(l.montant) || 0;
      } else if (type === "depense") {
        depenses += Number(l.montant) || 0;
      }
    }

    return {
      totalRecettes: recettes,
      totalDepenses: depenses,
      solde: recettes - depenses,
    };
  }, [lignesFiltrees]);

  // Agrégat par saison (sur toutes les lignes, pas seulement filtrées)
  const aggregParSaison: BudgetAggregSaison[] = useMemo(() => {
    const map = new Map<string, BudgetAggregSaison>();

    for (const l of budgetLignes) {
      const saison = l.saison || "Non définie";
      if (!map.has(saison)) {
        map.set(saison, {
          saison,
          totalRecettes: 0,
          totalDepenses: 0,
          solde: 0,
        });
      }
      const agg = map.get(saison)!;
      const montant = Number(l.montant) || 0;
      const type = (l.type || "").toLowerCase();

      if (type === "recette") {
        agg.totalRecettes += montant;
      } else if (type === "depense") {
        agg.totalDepenses += montant;
      }
      agg.solde = agg.totalRecettes - agg.totalDepenses;
    }

    return Array.from(map.values()).sort((a, b) =>
      a.saison < b.saison ? 1 : -1
    );
  }, [budgetLignes]);

  // Agrégat par catégorie (sur la saison sélectionnée si != all)
  const aggregParCategorie: BudgetAggregCategorie[] = useMemo(() => {
    const lignesSource =
      selectedSaison === "all"
        ? budgetLignes
        : budgetLignes.filter((l) => l.saison === selectedSaison);

    const map = new Map<string, number>();
    let totalDepenses = 0;

    for (const l of lignesSource) {
      const type = (l.type || "").toLowerCase();
      if (type !== "depense") continue;

      const cat = l.categorie || "Non renseignée";
      const montant = Number(l.montant) || 0;

      totalDepenses += montant;
      map.set(cat, (map.get(cat) || 0) + montant);
    }

    return Array.from(map.entries())
      .map(([categorie, total]) => ({
        categorie,
        total,
        pourcentage:
          totalDepenses > 0 ? Math.round((total / totalDepenses) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [budgetLignes, selectedSaison]);

  const dernieresLignes = useMemo(
    () => lignesFiltrees.slice(0, 10),
    [lignesFiltrees]
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fbfdff_0%,#f5f9fc_46%,#eef4f7_100%)] text-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* En-tête + navigation */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-pink-400/80">
              Espace bureau
            </p>
            <h1 className="mt-2 text-3xl md:text-4xl font-bold">
              Tableau de bord du club
            </h1>
            <p className="mt-2 text-sm md:text-base text-slate-600">
              Visualisez d&apos;un coup d&apos;œil la santé financière du club et
              le détail des mouvements par saison et par catégorie.
            </p>
          </div>

          <div className="hidden md:flex flex-col items-end gap-2 text-xs text-slate-500">
            <span className="uppercase tracking-[0.2em] text-slate-500">
              Raccourcis
            </span>
            <div className="flex gap-2">
              <Link
                href="/bureau"
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50 transition"
              >
                ⬅️ Espace bureau
              </Link>
              <Link
                href="/bureau/gerer-asso-2"
                className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs text-violet-800 hover:bg-violet-100 transition"
              >
                Gérer asso 2
              </Link>
              <Link
                href="/bureau/budget"
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-800 hover:bg-emerald-100 transition"
              >
                💰 Gestion détaillée du budget
              </Link>
            </div>
          </div>
        </div>

        {/* Barre de filtres */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-xs text-emerald-400 border border-emerald-500/40">
                ●
              </span>
              <span>Filtres d&apos;analyse</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Saison</span>
                <select
                  value={selectedSaison}
                  onChange={(e) => setSelectedSaison(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-pink-300"
                >
                  <option value="all">Toutes les saisons</option>
                  {saisonsDisponibles.map((saison) => (
                    <option key={saison} value={saison}>
                      {saison}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-500">Catégorie</span>
                <select
                  value={selectedCategorie}
                  onChange={(e) => setSelectedCategorie(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-pink-300"
                >
                  <option value="all">Toutes les catégories</option>
                  {categoriesDisponibles.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Messages d'état */}
        {loading && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            Chargement des données…
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* KPIs principaux */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-700/80">
              Recettes
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(totalRecettes)}
            </p>
            <p className="mt-1 text-xs text-emerald-700/70">
              Toutes sources de revenus confondues
            </p>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-white px-4 py-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.25em] text-sky-700/80">
              Dépenses
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(totalDepenses)}
            </p>
            <p className="mt-1 text-xs text-sky-700/70">
              Uniformes, déplacements, engagements, matériel…
            </p>
          </div>

          <div className="rounded-2xl border border-pink-200 bg-white px-4 py-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.25em] text-pink-700/80">
              Solde net
            </p>
            <p
              className={`mt-2 text-2xl font-semibold ${
                solde >= 0 ? "text-emerald-300" : "text-red-300"
              }`}
            >
              {formatCurrency(solde)}
            </p>
            <p className="mt-1 text-xs text-pink-700/70">
              Sur la période et les filtres sélectionnés
            </p>
          </div>
        </div>

        {/* Deux colonnes principales */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Bloc gauche : budget par saison + derniers mouvements */}
          <div className="space-y-6">
            {/* Budget par saison */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                    Vue annuelle
                  </h2>
                  <p className="text-sm text-slate-400">
                    Synthèse recettes / dépenses par saison
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase text-slate-400">
                      <th className="px-3 py-2">Saison</th>
                      <th className="px-3 py-2">Recettes</th>
                      <th className="px-3 py-2">Dépenses</th>
                      <th className="px-3 py-2 text-right">Solde</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggregParSaison.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-4 text-center text-sm text-slate-500"
                        >
                          Aucune ligne budgétaire enregistrée pour le moment.
                        </td>
                      </tr>
                    )}

                    {aggregParSaison.map((agg) => (
                      <tr
                        key={agg.saison}
                        className="border-b border-slate-800/80 last:border-0"
                      >
                        <td className="px-3 py-2 text-sm font-medium text-slate-200">
                          {agg.saison}
                        </td>
                        <td className="px-3 py-2 text-sm text-emerald-300">
                          {formatCurrency(agg.totalRecettes)}
                        </td>
                        <td className="px-3 py-2 text-sm text-sky-300">
                          {formatCurrency(agg.totalDepenses)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right text-sm font-semibold ${
                            agg.solde >= 0
                              ? "text-emerald-300"
                              : "text-red-300"
                          }`}
                        >
                          {formatCurrency(agg.solde)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Derniers mouvements */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                    Derniers mouvements
                  </h2>
                  <p className="text-sm text-slate-400">
                    10 derniers mouvements selon les filtres en cours
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-[0.7rem] uppercase text-slate-400">
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Type</th>
                      <th className="px-3 py-2">Saison</th>
                      <th className="px-3 py-2">Catégorie</th>
                      <th className="px-3 py-2">Libellé</th>
                      <th className="px-3 py-2 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dernieresLignes.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-3 py-4 text-center text-sm text-slate-500"
                        >
                          Aucun mouvement ne correspond aux filtres sélectionnés.
                        </td>
                      </tr>
                    )}

                    {dernieresLignes.map((l) => {
                      const isRecette =
                        (l.type || "").toLowerCase() === "recette";
                      return (
                        <tr
                          key={l.id}
                          className="border-b border-slate-800/70 last:border-0"
                        >
                          <td className="px-3 py-2 text-xs text-slate-300">
                            {formatDateFr(l.date || l.created_at)}
                          </td>
                          <td
                            className={`px-3 py-2 text-xs font-semibold ${
                              isRecette ? "text-emerald-300" : "text-sky-300"
                            }`}
                          >
                            {isRecette ? "Recette" : "Dépense"}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-300">
                            {l.saison}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-300">
                            {l.categorie}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-300">
                            {l.libelle || "-"}
                          </td>
                          <td
                            className={`px-3 py-2 text-right text-xs font-semibold ${
                              isRecette ? "text-emerald-300" : "text-sky-300"
                            }`}
                          >
                            {formatCurrency(Number(l.montant) || 0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bloc droit : répartition des dépenses */}
          <div className="space-y-6">
            {/* Répartition par catégorie */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
                    Répartition des dépenses
                  </h2>
                  <p className="text-sm text-slate-400">
                    Poids de chaque catégorie sur le total des dépenses
                    {selectedSaison !== "all" && (
                      <> — saison {selectedSaison}</>
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {aggregParCategorie.length === 0 && (
                  <p className="text-sm text-slate-500">
                    Pas encore de dépenses enregistrées pour cette période.
                  </p>
                )}

                {aggregParCategorie.map((cat) => (
                  <div key={cat.categorie} className="space-y-1">
                    <div className="flex items-center justify-between text-xs md:text-sm">
                      <span className="font-medium text-slate-200">
                        {cat.categorie}
                      </span>
                      <span className="text-slate-300">
                        {formatCurrency(cat.total)}{" "}
                        <span className="text-slate-500">
                          ({cat.pourcentage.toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400"
                        style={{ width: `${cat.pourcentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bloc info / prochaines étapes */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300 mb-2">
                Prochaines évolutions
              </h2>
              <p className="text-sm text-slate-400 mb-3">
                Ce tableau de bord pourra être enrichi progressivement avec :
              </p>
              <ul className="space-y-1 text-sm text-slate-300">
                <li>• Suivi des inscriptions et licences par équipe</li>
                <li>• Suivi des présences aux entraînements et compétitions</li>
                <li>• Indicateurs d&apos;occupation des créneaux gymnase</li>
                <li>• Synthèse &quot;coût par athlète&quot; par saison</li>
              </ul>
              <p className="mt-4 text-xs text-slate-500">
                Pour l&apos;instant, toutes les données affichées proviennent
                uniquement de la table <code>budget_lignes</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
