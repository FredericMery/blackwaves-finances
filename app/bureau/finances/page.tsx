"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type BudgetRow = {
  id: string;
  saison: string | null;
  type: "depense" | "recette" | string;
  montant: number | string;
  date?: string;
  categorie?: string | null;
};

type SeasonAggregate = {
  saison: string;
  totalDepenses: number;
  totalRecettes: number;
  solde: number;
};

// Recalcule la saison au cas où certaines lignes n'ont pas de saison en base
function computeSeason(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "Saison inconnue";

  const year = d.getFullYear();
  const month = d.getMonth() + 1;

  let startYear: number;
  let endYear: number;

  if (month >= 9) {
    startYear = year;
    endYear = year + 1;
  } else {
    startYear = year - 1;
    endYear = year;
  }

  return `${startYear}-${endYear}`;
}

// Palette de couleurs pour les catégories
const CATEGORY_COLORS = [
  "bg-emerald-400",
  "bg-sky-400",
  "bg-amber-400",
  "bg-rose-400",
  "bg-violet-400",
  "bg-teal-400",
  "bg-indigo-400",
  "bg-lime-400",
];

export default function FinancesDashboardPage() {
  const [seasons, setSeasons] = useState<SeasonAggregate[]>([]);
  const [allRows, setAllRows] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const rows: BudgetRow[] = [];
        for (let start = 0; ; start += 1000) {
          const { data, error } = await supabase
            .from("budget_lignes")
            .select("id, saison, type, montant, date, categorie")
            .order("id")
            .range(start, start + 999);
          if (error) throw error;
          rows.push(...((data || []) as BudgetRow[]));
          if (!data || data.length < 1000) break;
        }
        if (cancelled) return;
        setAllRows(rows);

        const map = new Map<string, SeasonAggregate>();

        for (const row of rows) {
          const montantNum = Number(row.montant || 0);
          const saison = row.saison || (row.date ? computeSeason(row.date) : "Saison inconnue");

          if (!map.has(saison)) {
            map.set(saison, {
              saison,
              totalDepenses: 0,
              totalRecettes: 0,
              solde: 0,
            });
          }

          const agg = map.get(saison)!;

          if (row.type === "depense") {
            agg.totalDepenses += montantNum;
          } else if (row.type === "recette") {
            agg.totalRecettes += montantNum;
          }
        }

        const list = Array.from(map.values())
          .map((s) => ({
            ...s,
            solde: s.totalRecettes - s.totalDepenses,
          }))
          .sort((a, b) => a.saison.localeCompare(b.saison));

        setSeasons(list);
      } catch {
        if (cancelled) return;
        setError("Impossible de charger les données financières.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchData();
    return () => { cancelled = true; };
  }, [retry]);

  // Max pour dimensionner les barres du graphe par saison (valeurs absolues)
  const maxValue = seasons.reduce((max, s) => {
    const localMax = Math.max(s.totalDepenses, s.totalRecettes);
    return localMax > max ? localMax : max;
  }, 0);

  // 📊 Répartition des dépenses par catégorie ET par saison
  // On part uniquement des lignes de "depense"
  const depenseRows = allRows.filter((r) => r.type === "depense");
  const categorySet = new Set<string>();

  depenseRows.forEach((r) => {
    const cat = r.categorie || "Non catégorisé";
    categorySet.add(cat);
  });

  const categories = Array.from(categorySet).sort();

  type SeasonCategoryShare = {
    saison: string;
    categories: {
      name: string;
      total: number;
      percentage: number; // % des dépenses de cette saison
    }[];
  };

  const seasonCategoryShares: SeasonCategoryShare[] = seasons.map((s) => {
    const saison = s.saison;
    // Dépenses de cette saison uniquement
    const rowsSeason = depenseRows.filter((r) => {
      const rsaison = r.saison || (r.date ? computeSeason(r.date) : "Saison inconnue");
      return rsaison === saison;
    });

    const totalSeason = rowsSeason.reduce(
      (sum, r) => sum + Number(r.montant || 0),
      0
    );

    const catTotals = new Map<string, number>();
    categories.forEach((c) => catTotals.set(c, 0));

    rowsSeason.forEach((r) => {
      const cat = r.categorie || "Non catégorisé";
      const prev = catTotals.get(cat) || 0;
      catTotals.set(cat, prev + Number(r.montant || 0));
    });

    const cats = categories.map((cat) => {
      const total = catTotals.get(cat) || 0;
      const percentage =
        totalSeason > 0 ? (total / totalSeason) * 100 : 0;
      return { name: cat, total, percentage };
    });

    return {
      saison,
      categories: cats,
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-slate-900">
      {/* En-tête */}
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">
          Pilotage financier
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mt-2">
          Analyse par saison
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          Visualisez les dépenses, recettes et le résultat par saison, ainsi que le
          poids de chaque catégorie de dépense dans le total des dépenses de la
          saison.
        </p>
        <p className="mt-3 text-sm text-slate-600">
          Périmètre : toutes les saisons et toutes les catégories de budget_lignes,
          réalisé uniquement. Résultat = recettes − dépenses ; ce n&apos;est pas le
          solde bancaire. Les saisons absentes sont déduites de la date (septembre
          à août), ou classées « Saison inconnue ».
        </p>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2 text-sm text-rose-800">
          {error}
          <button className="ml-3 rounded-lg border border-rose-300 px-3 py-2" onClick={() => setRetry(r => r + 1)}>Réessayer</button>
        </div>
      )}

      {loading ? (
        <p role="status" className="text-sm text-neutral-500">Chargement des données…</p>
      ) : error ? null : seasons.length === 0 ? (
        <p className="text-xs text-neutral-500">
          Aucune donnée trouvée dans le budget pour le moment.
        </p>
      ) : (
        <>
          {/* Résumé global */}
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <SummaryCard
              label="Saisons suivies"
              value={seasons.length.toString()}
              subtitle="Nombre de saisons avec au moins un mouvement"
            />
            <SummaryCard
              label="Dépenses totales"
              value={
                seasons
                  .reduce((sum, s) => sum + s.totalDepenses, 0)
                  .toFixed(2) + " €"
              }
              subtitle="Sur toutes les saisons"
            />
            <SummaryCard
              label="Recettes totales"
              value={
                seasons
                  .reduce((sum, s) => sum + s.totalRecettes, 0)
                  .toFixed(2) + " €"
              }
              subtitle="Sur toutes les saisons"
            />
          </div>

          {/* 🔹 Ligne de graphiques : gauche = Dép/Rec – droite = Catégories 100% empilées */}
          <div className="grid min-w-0 gap-6 md:grid-cols-2 mb-8">
            {/* Graphique barres par saison (dépenses / recettes) */}
            <div className="min-w-0 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6">
              <h2 className="text-sm font-semibold text-neutral-800 mb-3">
                Dépenses et recettes par saison
              </h2>
              <p className="text-[11px] text-neutral-500 mb-4">
                Chaque saison affiche deux barres : dépenses (rouge) et recettes (vert).
              </p>

              <div className="w-full overflow-x-auto" role="region" aria-label="Graphique dépenses et recettes par saison" tabIndex={0}>
                <div style={{ minWidth: Math.max(320, seasons.length * 92) }}>
                  <div className="flex items-end gap-4 h-64 border-b border-neutral-200 pb-4">
                    {seasons.map((s) => {
                      const dep = s.totalDepenses;
                      const rec = s.totalRecettes;
                      const depHeight =
                        maxValue > 0 ? Math.max((dep / maxValue) * 180, 0) : 0;
                      const recHeight =
                        maxValue > 0 ? Math.max((rec / maxValue) * 180, 0) : 0;

                      return (
                        <div
                          key={s.saison}
                          className="flex flex-col items-center justify-end gap-2"
                        >
                          <div className="flex items-end gap-1">
                            {/* Dépenses */}
                            <div className="flex flex-col items-center gap-1">
                              <div
                                className="w-5 rounded-t-md bg-rose-300"
                                style={{ height: `${depHeight}px` }}
                              />
                              <span className="text-[9px] text-neutral-500">
                                {dep.toFixed(0)} €
                              </span>
                            </div>
                            {/* Recettes */}
                            <div className="flex flex-col items-center gap-1">
                              <div
                                className="w-5 rounded-t-md bg-emerald-400"
                                style={{ height: `${recHeight}px` }}
                              />
                              <span className="text-[9px] text-neutral-500">
                                {rec.toFixed(0)} €
                              </span>
                            </div>
                          </div>
                          <div className="text-[10px] font-medium text-neutral-700 mt-1 text-center">
                            {s.saison}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Légende */}
                  <div className="flex items-center gap-4 mt-3 text-[11px] text-neutral-600">
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded-sm bg-rose-300" />
                      <span>Dépenses</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded-sm bg-emerald-400" />
                      <span>Recettes</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 📊 Barres verticales 100% empilées par saison et par catégorie */}
            <div className="min-w-0 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6">
              <h2 className="text-sm font-semibold text-neutral-800 mb-3">
                Poids des catégories dans les dépenses de chaque saison
              </h2>
              <p className="text-[11px] text-neutral-500 mb-4">
                Chaque colonne représente 100% des dépenses de la saison. Les couleurs
                indiquent la part de chaque catégorie (uniformes, déplacements, etc.).
              </p>

              {categories.length === 0 ? (
                <p className="text-[11px] text-neutral-400">
                  Aucune catégorie de dépense renseignée pour le moment.
                </p>
              ) : (
                <>
                  <div className="w-full overflow-x-auto" role="region" aria-label="Répartition des catégories par saison" tabIndex={0}>
                    <div style={{ minWidth: Math.max(320, seasons.length * 92) }}>
                      <div className="flex items-end gap-4 h-64 border-b border-neutral-200 pb-4">
                        {seasonCategoryShares.map((s) => {
                          const totalSeason = s.categories.reduce(
                            (sum, c) => sum + c.total,
                            0
                          );
                          const hasDep = totalSeason > 0;

                          return (
                            <div
                              key={s.saison}
                              className="flex flex-col items-center justify-end gap-2"
                            >
                              {/* Colonne 100% */}
                              <div className="flex flex-col-reverse w-7 h-40 rounded-md overflow-hidden bg-neutral-100 border border-neutral-200">
                                {hasDep
                                  ? s.categories
                                      .filter((c) => c.percentage > 0)
                                      .map((cat) => (
                                        <div
                                          key={cat.name}
                                          className={`${
                                            CATEGORY_COLORS[
                                              categories.indexOf(cat.name) % CATEGORY_COLORS.length
                                            ]
                                          }`}
                                          style={{
                                            height: `${cat.percentage}%`,
                                          }}
                                          title={`${s.saison} · ${cat.name} · ${cat.total.toFixed(2)} € – ${cat.percentage.toFixed(
                                            1
                                          )}%`}
                                        />
                                      ))
                                  : null}
                              </div>
                              <div className="text-[10px] font-medium text-neutral-700 mt-1 text-center">
                                {s.saison}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Légende catégories */}
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    {categories.map((cat, index) => (
                      <div
                        key={cat}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-neutral-50 border border-neutral-200"
                      >
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-full ${
                            CATEGORY_COLORS[index % CATEGORY_COLORS.length]
                          }`}
                        />
                        <span className="text-neutral-700">{cat}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Tableau récap par saison */}
          <div className="bg-white rounded-2xl shadow-md border border-neutral-200 p-5 md:p-6">
            <h2 className="text-sm font-semibold text-neutral-800 mb-3">
              Récapitulatif par saison
            </h2>
            <div className="overflow-auto" role="region" aria-label="Récapitulatif financier par saison" tabIndex={0}>
              <table className="min-w-[480px] w-full text-sm">
                <caption className="mb-3 text-left text-xs text-slate-500">Toutes les saisons · Toutes les catégories · Réalisé uniquement</caption>
                <thead>
                  <tr className="border-b border-neutral-200 text-left bg-neutral-50">
                    <th scope="col" className="py-2 px-2">Saison</th>
                    <th scope="col" className="py-2 px-2 text-right">Dépenses</th>
                    <th scope="col" className="py-2 px-2 text-right">Recettes</th>
                    <th scope="col" className="py-2 px-2 text-right">Résultat</th>
                  </tr>
                </thead>
                <tbody>
                  {seasons.map((s) => (
                    <tr key={s.saison} className="border-b border-neutral-100">
                      <th scope="row" className="py-2 px-2 text-left font-medium">{s.saison}</th>
                      <td className="py-2 px-2 text-right text-red-600">
                        -{s.totalDepenses.toFixed(2)} €
                      </td>
                      <td className="py-2 px-2 text-right text-emerald-600">
                        +{s.totalRecettes.toFixed(2)} €
                      </td>
                      <td
                        className={`py-2 px-2 text-right ${
                          s.solde >= 0 ? "text-emerald-700" : "text-red-700"
                        }`}
                      >
                        {s.solde >= 0 ? "+" : ""}
                        {s.solde.toFixed(2)} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <details className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
              <summary className="cursor-pointer text-sm font-semibold">Montants par catégorie et par saison</summary>
              <p className="my-3 text-xs text-slate-500">Périmètre : toutes les catégories de dépenses de chaque saison. Même calcul que le graphique empilé.</p>
              <div className="overflow-x-auto" role="region" aria-label="Dépenses détaillées par saison et catégorie" tabIndex={0}>
                <table className="w-full min-w-[480px] text-sm">
                  <thead><tr className="border-b border-slate-200 text-left"><th scope="col" className="py-2">Saison</th><th scope="col">Catégorie</th><th scope="col" className="text-right">Dépenses</th><th scope="col" className="text-right">Part de la saison</th></tr></thead>
                  <tbody>{seasonCategoryShares.flatMap(s => s.categories.filter(c => c.total !== 0).map(c => <tr key={`${s.saison}-${c.name}`} className="border-b border-slate-100"><th scope="row" className="py-3 text-left font-normal">{s.saison}</th><td>{c.name}</td><td className="text-right">{c.total.toFixed(2)} €</td><td className="text-right">{c.percentage.toFixed(1)} %</td></tr>))}</tbody>
                </table>
              </div>
            </details>
            <Link href="/bureau/budget?view=moves&season=all&category=all" className="mt-5 inline-block text-sm font-medium text-cyan-800 underline">Consulter tous les mouvements</Link>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
      <p className="text-[11px] text-neutral-500 uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-lg font-semibold text-neutral-900 mb-1">
        {value}
      </p>
      <p className="text-[11px] text-neutral-500">{subtitle}</p>
    </div>
  );
}
