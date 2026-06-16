"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("budget_lignes")
        .select("id, saison, type, montant, date, categorie");

      if (error) {
        console.error("Erreur chargement budget pour dashboard :", error);
        setError("Impossible de charger les données financières.");
        setLoading(false);
        return;
      }

      const rows = (data || []) as BudgetRow[];
      setAllRows(rows);

      const map = new Map<string, SeasonAggregate>();

      for (const row of rows) {
        const montantNum = Number(row.montant || 0);
        let saison = row.saison || "Saison inconnue";

        if ((!row.saison || row.saison === "") && row.date) {
          saison = computeSeason(row.date);
        }

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
      setLoading(false);
    }

    fetchData();
  }, []);

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
      let rsaison = r.saison;
      if ((!rsaison || rsaison === "") && r.date) {
        rsaison = computeSeason(r.date);
      }
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
    <div className="max-w-6xl mx-auto px-4 pb-16">
      {/* En-tête */}
      <div className="mt-10 mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-600">
          Espace bureau
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mt-2">
          Tableau de bord financier
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          Visualisez les dépenses, recettes et le solde par saison, ainsi que le
          poids de chaque catégorie de dépense dans le total des dépenses de la
          saison.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-xs text-neutral-500">Chargement des données…</p>
      ) : seasons.length === 0 ? (
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
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            {/* Graphique barres par saison (dépenses / recettes) */}
            <div className="bg-white rounded-2xl shadow-md border border-neutral-200 p-5 md:p-6">
              <h2 className="text-sm font-semibold text-neutral-800 mb-3">
                Dépenses et recettes par saison
              </h2>
              <p className="text-[11px] text-neutral-500 mb-4">
                Chaque saison affiche deux barres : dépenses (rouge) et recettes (vert).
              </p>

              <div className="w-full overflow-x-auto">
                <div className="min-w-[320px]">
                  <div className="flex items-end gap-4 h-64 border-b border-neutral-200 pb-4">
                    {seasons.map((s) => {
                      const dep = s.totalDepenses;
                      const rec = s.totalRecettes;
                      const depHeight =
                        maxValue > 0 ? Math.max((dep / maxValue) * 180, 4) : 4;
                      const recHeight =
                        maxValue > 0 ? Math.max((rec / maxValue) * 180, 4) : 4;

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
            <div className="bg-white rounded-2xl shadow-md border border-neutral-200 p-5 md:p-6">
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
                  <div className="w-full overflow-x-auto">
                    <div className="min-w-[320px]">
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
                                      .map((cat, index) => (
                                        <div
                                          key={cat.name}
                                          className={`${
                                            CATEGORY_COLORS[
                                              index % CATEGORY_COLORS.length
                                            ]
                                          }`}
                                          style={{
                                            height: `${cat.percentage}%`,
                                          }}
                                          title={`${cat.name} – ${cat.percentage.toFixed(
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
            <div className="overflow-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 text-left bg-neutral-50">
                    <th className="py-2 px-2">Saison</th>
                    <th className="py-2 px-2 text-right">Dépenses</th>
                    <th className="py-2 px-2 text-right">Recettes</th>
                    <th className="py-2 px-2 text-right">Solde</th>
                  </tr>
                </thead>
                <tbody>
                  {seasons.map((s) => (
                    <tr key={s.saison} className="border-b border-neutral-100">
                      <td className="py-2 px-2">{s.saison}</td>
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
    <div className="bg-white rounded-2xl shadow-md border border-emerald-100 p-4">
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
