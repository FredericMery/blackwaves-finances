"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type BudgetLigne = {
  id: string;
  type: string;
  date: string;
  saison: string | null;
  categorie: string | null;
  montant: number | string;
  designation?: string | null;
  facture_url?: string | null;
  created_at?: string;
  previsionnel_id?: string | null;
};

type PrevisionnelLigne = {
  id: string | number;
  saison: string | null;
  type: string;
  categorie: string | null;
  designation: string | null;
  montant_prevu: number | string;
};

const currency = (value: number) =>
  value.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const seasonOf = (row: { saison: string | null }) => row.saison || "Non définie";
const categoryOf = (row: { categorie: string | null }) => row.categorie || "Non renseignée";
const amount = (value: number | string) => Number(value) || 0;
const panel = "min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

function formatDateFr(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("fr-FR");
}

function variance(actual: number, planned: number, expense = false) {
  const delta = actual - planned;
  const favorable = expense ? delta < 0 : delta > 0;
  return {
    delta,
    label: delta === 0 ? "À l’équilibre" : favorable ? "Favorable" : "Défavorable",
    color: delta === 0 ? "text-slate-600" : favorable ? "text-emerald-700" : "text-rose-700",
    percentage: planned === 0 ? "% non défini (prévu nul)" : `${((delta / Math.abs(planned)) * 100).toFixed(1)} %`,
  };
}

export default function BureauClubDashboardPage() {
  const [budgetLignes, setBudgetLignes] = useState<BudgetLigne[]>([]);
  const [previsionnel, setPrevisionnel] = useState<PrevisionnelLigne[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [selectedSaison, setSelectedSaison] = useState("all");
  const [selectedCategorie, setSelectedCategorie] = useState("all");
  const [filtersReady, setFiltersReady] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("bureau-dashboard-filters") || "{}");
      if (typeof saved.season === "string") setSelectedSaison(saved.season);
      if (typeof saved.category === "string") setSelectedCategorie(saved.category);
    } catch { /* Storage may be unavailable. */ }
    setFiltersReady(true);
  }, []);

  useEffect(() => {
    if (!filtersReady) return;
    try {
      sessionStorage.setItem("bureau-dashboard-filters", JSON.stringify({ season: selectedSaison, category: selectedCategorie }));
    } catch { /* Keep filters usable without storage. */ }
  }, [selectedSaison, selectedCategorie, filtersReady]);

  useEffect(() => {
    let cancelled = false;
    async function loadBudget() {
      setLoading(true);
      setError(null);
      try {
        // Read every page: historical totals must not stop at Supabase's row limit.
        async function readAll(table: "budget_lignes" | "budget_previsionnel") {
          const rows = [];
          for (let start = 0; ; start += 1000) {
            const { data, error } = await supabase.from(table).select("*").order("id").range(start, start + 999);
            if (error) throw error;
            rows.push(...(data || []));
            if (!data || data.length < 1000) return rows;
          }
        }
        const [actual, planned] = await Promise.all([readAll("budget_lignes"), readAll("budget_previsionnel")]);
        if (cancelled) return;
        setBudgetLignes((actual as BudgetLigne[]).sort((a, b) => (b.date || b.created_at || "").localeCompare(a.date || a.created_at || "")));
        setPrevisionnel(planned as PrevisionnelLigne[]);
      } catch {
        if (!cancelled) setError("Impossible de charger les données budgétaires. Réessayez.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadBudget();
    return () => { cancelled = true; };
  }, [retry]);

  const saisonsDisponibles = useMemo(() =>
    Array.from(new Set([...budgetLignes, ...previsionnel].map(seasonOf))).sort().reverse(),
  [budgetLignes, previsionnel]);
  const categoriesDisponibles = useMemo(() =>
    Array.from(new Set([...budgetLignes, ...previsionnel].map(categoryOf))).sort(),
  [budgetLignes, previsionnel]);
  const inScope = (row: { saison: string | null; categorie: string | null }) =>
    (selectedSaison === "all" || seasonOf(row) === selectedSaison) &&
    (selectedCategorie === "all" || categoryOf(row) === selectedCategorie);
  const lignesFiltrees = budgetLignes.filter(inScope);
  const prevFiltre = previsionnel.filter(inScope);
  const totalRecettes = lignesFiltrees.filter(l => l.type?.toLowerCase() === "recette").reduce((s, l) => s + amount(l.montant), 0);
  const totalDepenses = lignesFiltrees.filter(l => l.type?.toLowerCase() === "depense").reduce((s, l) => s + amount(l.montant), 0);
  const prevRecettes = prevFiltre.filter(l => l.type?.toLowerCase() === "recette").reduce((s, l) => s + amount(l.montant_prevu), 0);
  const prevDepenses = prevFiltre.filter(l => l.type?.toLowerCase() === "depense").reduce((s, l) => s + amount(l.montant_prevu), 0);
  const solde = totalRecettes - totalDepenses;
  const prevSolde = prevRecettes - prevDepenses;
  const scope = `${selectedSaison === "all" ? "Toutes les saisons" : `Saison ${selectedSaison}`} · ${selectedCategorie === "all" ? "Toutes les catégories" : selectedCategorie}`;

  function movements(params: Record<string, string> = {}) {
    const query = new URLSearchParams({ view: "moves", season: selectedSaison, category: selectedCategorie, ...params });
    return `/bureau/budget?${query}`;
  }

  // These historical sections deliberately have independent scopes.
  const aggregParSaison = useMemo(() => {
    const map = new Map<string, { saison: string; totalRecettes: number; totalDepenses: number }>();
    for (const l of budgetLignes) {
      const saison = seasonOf(l);
      const agg = map.get(saison) || { saison, totalRecettes: 0, totalDepenses: 0 };
      if (l.type?.toLowerCase() === "recette") agg.totalRecettes += amount(l.montant);
      if (l.type?.toLowerCase() === "depense") agg.totalDepenses += amount(l.montant);
      map.set(saison, agg);
    }
    return Array.from(map.values()).sort((a, b) => b.saison.localeCompare(a.saison));
  }, [budgetLignes]);

  const aggregParCategorie = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of budgetLignes) {
      if (selectedSaison !== "all" && seasonOf(l) !== selectedSaison) continue;
      if (l.type?.toLowerCase() !== "depense") continue;
      map.set(categoryOf(l), (map.get(categoryOf(l)) || 0) + amount(l.montant));
    }
    const total = Array.from(map.values()).reduce((s, n) => s + n, 0);
    return Array.from(map, ([categorie, value]) => ({ categorie, total: value, pourcentage: total > 0 ? value / total * 100 : 0 })).sort((a, b) => b.total - a.total);
  }, [budgetLignes, selectedSaison]);

  const categoryConsumption = categoriesDisponibles
    .filter(c => selectedCategorie === "all" || c === selectedCategorie)
    .map(categorie => ({
      categorie,
      planned: prevFiltre.filter(l => categoryOf(l) === categorie && l.type?.toLowerCase() === "depense").reduce((s, l) => s + amount(l.montant_prevu), 0),
      actual: lignesFiltrees.filter(l => categoryOf(l) === categorie && l.type?.toLowerCase() === "depense").reduce((s, l) => s + amount(l.montant), 0),
    })).filter(c => c.actual !== 0 || c.planned !== 0);

  const deviations = useMemo(() => {
    const map = new Map<string, { season: string; category: string; type: string; planned: number; actual: number }>();
    const keyOf = (r: { saison: string | null; categorie: string | null; type: string }) =>
      JSON.stringify([seasonOf(r), categoryOf(r), (r.type || "").toLowerCase()]);
    for (const p of previsionnel) {
      const key = keyOf(p);
      const row = map.get(key) || { season: seasonOf(p), category: categoryOf(p), type: (p.type || "").toLowerCase(), planned: 0, actual: 0 };
      row.planned += amount(p.montant_prevu);
      map.set(key, row);
    }
    for (const l of budgetLignes) {
      const key = keyOf(l);
      const row = map.get(key) || { season: seasonOf(l), category: categoryOf(l), type: (l.type || "").toLowerCase(), planned: 0, actual: 0 };
      row.actual += amount(l.montant);
      map.set(key, row);
    }
    return Array.from(map.values()).filter(r =>
      (selectedSaison === "all" || r.season === selectedSaison) &&
      (selectedCategorie === "all" || r.category === selectedCategorie) &&
      (r.type === "depense" || r.type === "recette") && r.actual !== r.planned
    ).sort((a, b) => Math.abs(b.actual - b.planned) - Math.abs(a.actual - a.planned)).slice(0, 5);
  }, [budgetLignes, previsionnel, selectedSaison, selectedCategorie]);

  const monthly = new Map<string, { income: number; expense: number }>();
  let undatedCount = 0;
  for (const row of lignesFiltrees) {
    const type = row.type?.toLowerCase();
    if (type !== "recette" && type !== "depense") continue;
    if (!row.date || !/^\d{4}-\d{2}-\d{2}/.test(row.date) || Number.isNaN(Date.parse(row.date))) { undatedCount++; continue; }
    const month = row.date.slice(0, 7);
    const entry = monthly.get(month) || { income: 0, expense: 0 };
    if (type === "recette") entry.income += amount(row.montant);
    if (type === "depense") entry.expense += amount(row.montant);
    monthly.set(month, entry);
  }
  let cumulative = 0;
  const monthlyRows = Array.from(monthly).sort(([a], [b]) => a.localeCompare(b)).map(([month, totals]) => {
    cumulative += totals.income - totals.expense;
    return { month, ...totals, cumulative };
  });
  const missing = lignesFiltrees.filter(l => !l.facture_url?.trim());
  const missingExpenses = missing.filter(l => l.type?.toLowerCase() === "depense");

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 text-slate-900">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">Pilotage financier</p>
        <h1 className="mt-2 text-3xl font-bold">Tableau de bord du club</h1>
        <p className="mt-2 text-sm text-slate-600">Prévoir, suivre les écarts et retrouver les mouvements à compléter.</p>
      </header>
      <section className={`${panel} flex flex-wrap items-end gap-4`} aria-label="Filtres d’analyse">
        <label className="grid min-w-0 gap-1 text-sm">Saison
          <select className="max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2" value={selectedSaison} onChange={e => setSelectedSaison(e.target.value)}>
            <option value="all">Toutes les saisons</option>
            {saisonsDisponibles.map(s => <option key={s} value={s}>{s}</option>)}
            {selectedSaison !== "all" && !saisonsDisponibles.includes(selectedSaison) && <option value={selectedSaison}>{selectedSaison} (aucune donnée)</option>}
          </select>
        </label>
        <label className="grid min-w-0 max-w-full gap-1 text-sm">Catégorie
          <select className="max-w-full rounded-lg border border-slate-300 bg-white px-3 py-2" value={selectedCategorie} onChange={e => setSelectedCategorie(e.target.value)}>
            <option value="all">Toutes les catégories</option>
            {categoriesDisponibles.map(c => <option key={c} value={c}>{c}</option>)}
            {selectedCategorie !== "all" && !categoriesDisponibles.includes(selectedCategorie) && <option value={selectedCategorie}>{selectedCategorie} (aucune donnée)</option>}
          </select>
        </label>
        <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm" onClick={() => { setSelectedSaison("all"); setSelectedCategorie("all"); }}>Réinitialiser</button>
        <p className="text-sm text-slate-600">{scope}</p>
      </section>
      {loading ? <p role="status" className={panel}>Chargement des données…</p> : error ? (
        <div role="alert" className={`${panel} text-rose-700`}>{error} <button className="ml-3 rounded-lg border border-rose-300 px-3 py-2" onClick={() => setRetry(r => r + 1)}>Réessayer</button></div>
      ) : <>
        {lignesFiltrees.length === 0 && prevFiltre.length === 0 && <p className={panel}>Aucune donnée pour ces filtres. Modifiez la saison ou la catégorie.</p>}
        <section aria-label={`Prévu et réalisé — ${scope}`} className="grid gap-4 md:grid-cols-3">
          {[
            { title: "Recettes", actual: totalRecettes, planned: prevRecettes, type: "recette" },
            { title: "Dépenses", actual: totalDepenses, planned: prevDepenses, type: "depense" },
            { title: "Résultat", actual: solde, planned: prevSolde, type: "all" },
          ].map(card => {
            const diff = variance(card.actual, card.planned, card.type === "depense");
            return <article key={card.title} className={panel}>
              <h2 className="text-sm font-semibold text-slate-600">{card.title}</h2>
              <p className="mt-2 text-2xl font-bold">{currency(card.actual)} <span className="text-xs font-normal text-slate-500">réalisé</span></p>
              <p className="mt-1 text-sm text-slate-600">Prévu : {currency(card.planned)}</p>
              <p className={`mt-3 text-sm font-medium ${diff.color}`}>{currency(diff.delta)} · {diff.label}</p>
              <p className="text-xs text-slate-500">{diff.percentage}</p>
              <Link href={movements({ type: card.type })} className="mt-3 inline-block text-sm font-medium text-cyan-800 underline">Voir les mouvements · {card.title.toLowerCase()}</Link>
            </article>;
          })}
        </section>
        <p className="text-sm text-slate-600">Périmètre : {scope}. Le résultat = recettes − dépenses ; ce n&apos;est pas le solde bancaire. Écart = réalisé − prévu, favorable si recettes supérieures ou dépenses inférieures au prévu.</p>
        <section className="grid min-w-0 gap-6 lg:grid-cols-2">
          <div className={panel}>
            <h2 className="text-lg font-semibold">Écarts prioritaires</h2>
            <p className="mb-4 text-xs text-slate-500">{scope} · 5 plus grands écarts absolus par saison, catégorie et type. Les catégories enregistrées sur les mouvements sont utilisées, comme dans les indicateurs et les filtres. Le rapprochement par poste prévisionnel est réservé à la page Écarts budgétaires.</p>
            {deviations.length === 0 ? <p className="text-sm text-slate-600">Aucun écart sur ce périmètre.</p> : <ul className="divide-y divide-slate-100">
              {deviations.map((r, i) => {
                const diff = variance(r.actual, r.planned, r.type === "depense");
                return <li key={i} className="py-3">
                  <p className="font-medium">{r.category}</p>
                  <p className="text-xs text-slate-500">{r.season} · {r.type === "depense" ? "Dépense" : "Recette"}</p>
                  <p className="mt-1 text-sm">Prévu {currency(r.planned)} · Réalisé {currency(r.actual)}</p>
                  <p className={`text-sm ${diff.color}`}>{currency(diff.delta)} · {diff.label} · {diff.percentage}</p>
                  <Link href={movements({ season: r.season, category: r.category, type: r.type })} className="text-sm text-cyan-800 underline">Examiner les mouvements de cette catégorie</Link>
                </li>;
              })}
            </ul>}
          </div>
          <div className={panel}>
            <h2 className="text-lg font-semibold">Justificatifs à compléter</h2>
            <p className="text-xs text-slate-500">{scope} · Tous les types de mouvements</p>
            <p className="mt-3 text-3xl font-bold">{missing.length}</p>
            <p className="mt-1 text-sm text-slate-600">Sans facture jointe, dont {missingExpenses.length} dépenses ({currency(missingExpenses.reduce((s, l) => s + amount(l.montant), 0))}).</p>
            <Link href={movements({ missing: "1" })} className="mt-4 inline-block rounded-lg bg-cyan-800 px-4 py-2 text-sm font-semibold text-white">Compléter les justificatifs</Link>
            <ul className="mt-3 divide-y divide-slate-100">
              {missing.slice(0, 5).map(l => <li key={l.id} className="py-2 text-sm">
                <Link href={movements({ season: seasonOf(l), category: categoryOf(l), type: l.type, missing: "1", line: l.id })} className="text-cyan-800 underline">{l.designation || "Sans désignation"}</Link>
                <p className="text-xs text-slate-500">{seasonOf(l)} · {categoryOf(l)} · {currency(amount(l.montant))}</p>
              </li>)}
            </ul>
            <p className="mt-3 text-xs text-slate-500">Ajoutez un fichier ou utilisez la caméra depuis la fiche du mouvement.</p>
          </div>
        </section>
        <section className={panel}>
          <h2 className="text-lg font-semibold">Consommation du budget par catégorie</h2>
          <p className="mb-4 text-xs text-slate-500">Dépenses · {scope}. Consommation = réalisé / prévu.</p>
          {categoryConsumption.length === 0 ? <p className="text-sm text-slate-600">Aucune dépense prévue ou réalisée.</p> : <div className="grid gap-5 md:grid-cols-2">
            {categoryConsumption.map(c => <div key={c.categorie}>
              <div className="flex flex-wrap justify-between gap-2 text-sm"><Link className="font-medium text-cyan-800 underline" href={movements({ category: c.categorie, type: "depense" })}>{c.categorie}</Link><span>{currency(c.actual)} / {currency(c.planned)}</span></div>
              <div className="my-2 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><div className={`h-full ${c.actual > c.planned ? "bg-rose-500" : "bg-cyan-600"}`} style={{ width: `${c.planned > 0 ? Math.max(0, Math.min(100, c.actual / c.planned * 100)) : 0}%` }} /></div>
              <p className="text-xs text-slate-600">{c.planned === 0 ? "Consommation non définie (prévu nul)" : `${(c.actual / c.planned * 100).toFixed(1)} % consommé`} · {variance(c.actual, c.planned, true).label}</p>
            </div>)}
          </div>}
        </section>
        <section className={panel}>
          <h2 className="text-lg font-semibold">Réalisé mensuel et résultat cumulé</h2>
          <p className="mb-3 text-xs text-slate-500">{scope} · Mois avec mouvements datés ; cumul chronologique sur ce périmètre, sans report bancaire.{undatedCount > 0 && ` ${undatedCount} mouvement(s) sans date exploitable exclus de cette vue uniquement.`}</p>
          <div className="overflow-x-auto" role="region" aria-label="Réalisé mensuel" tabIndex={0}><table className="w-full min-w-[520px] text-sm">
            <thead><tr className="border-b border-slate-200 text-left"><th scope="col" className="py-2">Mois</th><th scope="col" className="text-right">Recettes</th><th scope="col" className="text-right">Dépenses</th><th scope="col" className="text-right">Résultat du mois</th><th scope="col" className="text-right">Résultat cumulé</th></tr></thead>
            <tbody>{monthlyRows.map(m => <tr key={m.month} className="border-b border-slate-100"><th scope="row" className="py-3 text-left font-normal">{m.month}</th><td className="text-right">{currency(m.income)}</td><td className="text-right">{currency(m.expense)}</td><td className="text-right">{currency(m.income - m.expense)}</td><td className="text-right font-semibold">{currency(m.cumulative)}</td></tr>)}
              {monthlyRows.length === 0 && <tr><td colSpan={5} className="py-4 text-slate-500">Aucun mouvement daté pour ces filtres.</td></tr>}</tbody>
          </table></div>
        </section>
        <details className={panel} open>
          <summary className="cursor-pointer text-lg font-semibold">10 derniers mouvements · {scope}</summary>
          <div className="mt-4 overflow-x-auto" role="region" aria-label="Derniers mouvements" tabIndex={0}><table className="w-full min-w-[640px] text-left text-sm">
            <thead><tr className="border-b border-slate-200"><th scope="col" className="py-2">Date</th><th scope="col">Type</th><th scope="col">Saison</th><th scope="col">Catégorie</th><th scope="col">Désignation</th><th scope="col" className="text-right">Montant</th></tr></thead>
            <tbody>{lignesFiltrees.slice(0, 10).map(l => <tr key={l.id} className="border-b border-slate-100">
              <td className="py-3">{formatDateFr(l.date || l.created_at)}</td><td>{l.type === "recette" ? "Recette" : l.type === "depense" ? "Dépense" : l.type}</td><td>{seasonOf(l)}</td><td>{categoryOf(l)}</td>
              <td><Link className="text-cyan-800 underline" href={movements({ season: seasonOf(l), category: categoryOf(l), type: l.type, line: l.id })}>{l.designation || "Sans désignation"}</Link></td><td className="text-right">{currency(amount(l.montant))}</td>
            </tr>)}{lignesFiltrees.length === 0 && <tr><td colSpan={6} className="py-4 text-slate-500">Aucun mouvement pour ces filtres.</td></tr>}</tbody>
          </table></div>
        </details>
        <details className={panel}>
          <summary className="cursor-pointer text-lg font-semibold">Historique par saison · périmètre indépendant</summary>
          <p className="my-3 text-xs text-slate-500">Toutes les saisons et toutes les catégories, indépendamment des filtres ci-dessus. Réalisé uniquement.</p>
          <div className="overflow-x-auto" role="region" aria-label="Historique par saison" tabIndex={0}><table className="w-full min-w-[420px] text-sm">
            <thead><tr className="border-b border-slate-200 text-left"><th scope="col" className="py-2">Saison</th><th scope="col" className="text-right">Recettes</th><th scope="col" className="text-right">Dépenses</th><th scope="col" className="text-right">Résultat</th></tr></thead>
            <tbody>{aggregParSaison.map(a => <tr key={a.saison} className="border-b border-slate-100"><th scope="row" className="py-3 text-left font-normal">{a.saison}</th><td className="text-right">{currency(a.totalRecettes)}</td><td className="text-right">{currency(a.totalDepenses)}</td><td className="text-right">{currency(a.totalRecettes - a.totalDepenses)}</td></tr>)}
              {aggregParSaison.length === 0 && <tr><td colSpan={4} className="py-4">Aucun mouvement enregistré.</td></tr>}</tbody>
          </table></div>
        </details>
        <details className={panel}>
          <summary className="cursor-pointer text-lg font-semibold">Répartition des dépenses · périmètre indépendant</summary>
          <p className="my-3 text-xs text-slate-500">{selectedSaison === "all" ? "Toutes les saisons" : `Saison ${selectedSaison}`} · Toutes les catégories, indépendamment du filtre catégorie. Part dans les dépenses réalisées.</p>
          <div className="space-y-4">{aggregParCategorie.map(c => <div key={c.categorie}>
            <div className="flex flex-wrap justify-between gap-2 text-sm"><span>{c.categorie}</span><span>{currency(c.total)} · {c.pourcentage.toFixed(1)} %</span></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><div className="h-full bg-cyan-600" style={{ width: `${Math.max(0, Math.min(100, c.pourcentage))}%` }} /></div>
          </div>)}{aggregParCategorie.length === 0 && <p className="text-sm text-slate-500">Aucune dépense sur cette période.</p>}</div>
        </details>
        <p className="text-xs text-slate-500">Périmètre : mouvements et prévisions du suivi budgétaire. Le module Budget &amp; factures reste indépendant.</p>
      </>}
    </div>
  );
}
