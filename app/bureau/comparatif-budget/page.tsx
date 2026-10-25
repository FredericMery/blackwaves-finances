'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type BudgetType = 'depense' | 'recette';

type Status = 'idle' | 'loading' | 'success' | 'error';

type PrevisionnelLigne = {
  id?: string | number;
  saison: string;
  type: BudgetType;
  categorie: string;
  designation: string;
  montant_prevu: number;
};

type BudgetLigne = {
  id: string;
  date: string;
  saison: string;
  type: BudgetType;
  montant: number;
  designation: string | null;
  categorie: string | null;
  commentaire: string | null;
  facture_url: string | null;
  previsionnel_id: string | null; // ✅ AJOUT
};

type AggregRow = {
  type: BudgetType;
  categorie: string;
  designation: string;
  montantPrevu: number;
  montantRealise: number;
};

type AggregResult = {
  depenses: AggregRow[];
  recettes: AggregRow[];
  totalPrevDep: number;
  totalRealDep: number;
  totalPrevRec: number;
  totalRealRec: number;
};

const SAISONS = ['2024-2025', '2025-2026', '2026-2027'];

function varianceText(actual: number, planned: number, expense = false) {
  const delta = actual - planned;
  const label = delta === 0 ? 'À l’équilibre' : (expense ? delta < 0 : delta > 0) ? 'Favorable' : 'Défavorable';
  const percentage = planned === 0 ? '% non défini (prévu nul)' : `${(delta / Math.abs(planned) * 100).toFixed(1)} %`;
  return `${label} · ${percentage}`;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value || 0);

// ✅ Pour le PDF (jsPDF supporte mal les espaces insécables FR -> parfois rendus en "/")
const formatCurrencyPdf = (value: number) => {
  const s = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value || 0);

  // remplace NBSP + NNBSP par espace normal
  return s.replace(/[\u00A0\u202F]/g, ' ');
};

const formatDateFR = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
};

export default function ComparatifBudgetPage() {
  const [saison, setSaison] = useState<string>('2025-2026');
  const [previsionnel, setPrevisionnel] = useState<PrevisionnelLigne[]>([]);
  const [lignes, setLignes] = useState<BudgetLigne[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sort, setSort] = useState('category');
  const [filtersReady, setFiltersReady] = useState(false);
  const [retry, setRetry] = useState(0);
  const [availableSeasons, setAvailableSeasons] = useState(SAISONS);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('bureau-comparison-filters') || '{}');
      if (typeof saved.season === 'string') setSaison(saved.season);
      if (typeof saved.query === 'string') setQuery(saved.query);
      if (['all', 'depense', 'recette'].includes(saved.type)) setTypeFilter(saved.type);
      if (typeof saved.category === 'string') setCategoryFilter(saved.category);
      if (['category', 'variance', 'planned', 'actual'].includes(saved.sort)) setSort(saved.sort);
    } catch { /* Storage is optional. */ }
    setFiltersReady(true);
  }, []);

  useEffect(() => {
    if (!filtersReady) return;
    try {
      sessionStorage.setItem('bureau-comparison-filters', JSON.stringify({ season: saison, query, type: typeFilter, category: categoryFilter, sort }));
    } catch { /* Keep filters usable without storage. */ }
  }, [saison, query, typeFilter, categoryFilter, sort, filtersReady]);

  useEffect(() => {
    let cancelled = false;
    const loadSeasons = async () => {
      const seasons = new Set(SAISONS);
      try {
        for (const table of ['budget_lignes', 'budget_previsionnel']) {
          for (let start = 0; ; start += 1000) {
            const { data, error } = await supabase.from(table).select('id, saison').order('id').range(start, start + 999);
            if (error) throw error;
            (data || []).forEach(row => { if (row.saison) seasons.add(row.saison); });
            if (!data || data.length < 1000) break;
          }
        }
        if (!cancelled) setAvailableSeasons(Array.from(seasons).sort().reverse());
      } catch { /* The default seasons and a manual season field remain available. */ }
    };
    void loadSeasons();
    return () => { cancelled = true; };
  }, [retry]);

  useEffect(() => {
    if (!filtersReady) return;
    let cancelled = false;
    const load = async () => {
      setStatus('loading');
      setError(null);
      setPrevisionnel([]);
      setLignes([]);

      try {
        async function readAll(table: 'budget_lignes' | 'budget_previsionnel') {
          const rows = [];
          for (let start = 0; ; start += 1000) {
            const { data, error } = await supabase.from(table).select('*').eq('saison', saison).order('id').range(start, start + 999);
            if (error) throw error;
            rows.push(...(data || []));
            if (!data || data.length < 1000) return rows;
          }
        }
        const [prevData, realData] = await Promise.all([readAll('budget_previsionnel'), readAll('budget_lignes')]);
        if (cancelled) return;
        setPrevisionnel((prevData || []) as PrevisionnelLigne[]);
        setLignes((realData || []) as BudgetLigne[]);
        setStatus('success');
      } catch (e) {
        if (cancelled) return;
        console.error('Erreur inattendue comparatif', e);
        setError(
          "Une erreur inattendue s'est produite. Merci de réessayer un peu plus tard."
        );
        setStatus('error');
      }
    };

    load();
    return () => { cancelled = true; };
  }, [saison, retry, filtersReady]);

  const aggreg: AggregResult = useMemo(() => {
    const map = new Map<string, AggregRow>();

    const makeKey = (type: BudgetType, categorie: string, designation: string) =>
      `${type}__${categorie || 'Sans catégorie'}__${designation || 'Sans libellé'}`;

    const prevById = new Map<string, PrevisionnelLigne>();
    previsionnel.forEach((p) => {
      if (p.id) prevById.set(String(p.id), p);
    });

    // 1) Injecter le prévisionnel
    previsionnel.forEach((p) => {
      const type = p.type as BudgetType;
      const categorie = p.categorie || 'Sans catégorie';
      const designation = p.designation || 'Sans libellé';
      const key = makeKey(type, categorie, designation);
      const montant = Number(p.montant_prevu || 0);

      const existing = map.get(key);
      if (existing) existing.montantPrevu += montant;
      else {
        map.set(key, {
          type,
          categorie,
          designation,
          montantPrevu: montant,
          montantRealise: 0,
        });
      }
    });

    // 2) Injecter le réalisé (budget_lignes)
    lignes.forEach((l) => {
      const montant = Number(l.montant || 0);

      // ✅ Si rattaché à une ligne prévisionnelle, on agrège sur cette ligne
      if (l.previsionnel_id) {
        const p = prevById.get(String(l.previsionnel_id));
        if (p) {
          const type = p.type as BudgetType;
          const categorie = p.categorie || 'Sans catégorie';
          const designation = p.designation || 'Sans libellé';
          const key = makeKey(type, categorie, designation);

          const existing = map.get(key);
          if (existing) existing.montantRealise += montant;
          else {
            map.set(key, {
              type,
              categorie,
              designation,
              montantPrevu: Number(p.montant_prevu || 0),
              montantRealise: montant,
            });
          }
          return;
        }
      }

      // 🔁 Fallback : si pas rattaché ou id introuvable, comportement actuel
      const type = l.type as BudgetType;
      const categorie = l.categorie || 'Sans catégorie';
      const designation = l.designation || 'Sans libellé';
      const key = makeKey(type, categorie, designation);

      const existing = map.get(key);
      if (existing) existing.montantRealise += montant;
      else {
        map.set(key, {
          type,
          categorie,
          designation,
          montantPrevu: 0,
          montantRealise: montant,
        });
      }
    });

    const all = Array.from(map.values());

    const depenses = all
      .filter((r) => r.type === 'depense')
      .sort((a, b) => {
        if (a.categorie === b.categorie) return a.designation.localeCompare(b.designation);
        return a.categorie.localeCompare(b.categorie);
      });

    const recettes = all
      .filter((r) => r.type === 'recette')
      .sort((a, b) => {
        if (a.categorie === b.categorie) return a.designation.localeCompare(b.designation);
        return a.categorie.localeCompare(b.categorie);
      });

    const totalPrevDep = depenses.reduce((sum, r) => sum + (r.montantPrevu || 0), 0);
    const totalRealDep = depenses.reduce((sum, r) => sum + (r.montantRealise || 0), 0);
    const totalPrevRec = recettes.reduce((sum, r) => sum + (r.montantPrevu || 0), 0);
    const totalRealRec = recettes.reduce((sum, r) => sum + (r.montantRealise || 0), 0);

    return {
      depenses,
      recettes,
      totalPrevDep,
      totalRealDep,
      totalPrevRec,
      totalRealRec,
    };
  }, [previsionnel, lignes]);

  const ecartDep = aggreg.totalRealDep - aggreg.totalPrevDep;
  const ecartRec = aggreg.totalRealRec - aggreg.totalPrevRec;
  const soldePrev = aggreg.totalPrevRec - aggreg.totalPrevDep;
  const soldeReal = aggreg.totalRealRec - aggreg.totalRealDep;
  const ecartSolde = soldeReal - soldePrev;

  const categories = Array.from(new Set([...aggreg.depenses, ...aggreg.recettes].map(r => r.categorie))).sort();
  const filteredRows = [...aggreg.depenses, ...aggreg.recettes].filter(row =>
    (typeFilter === 'all' || row.type === typeFilter) &&
    (categoryFilter === 'all' || row.categorie === categoryFilter) &&
    `${row.categorie} ${row.designation}`.toLocaleLowerCase('fr').includes(query.trim().toLocaleLowerCase('fr'))
  ).sort((a, b) => {
    if (sort === 'variance') return Math.abs(b.montantRealise - b.montantPrevu) - Math.abs(a.montantRealise - a.montantPrevu);
    if (sort === 'planned') return b.montantPrevu - a.montantPrevu;
    if (sort === 'actual') return b.montantRealise - a.montantRealise;
    return a.categorie.localeCompare(b.categorie) || a.designation.localeCompare(b.designation);
  });

  const handleExportPdf = async () => {
    try {
      setExporting(true);

      // Dynamic imports (évite de charger jsPDF au 1er rendu)
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);

      // A4 paysage pour tenir 5 colonnes
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 40;
      let cursorY = 48;

      // Titre
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('Comparatif budget – BlackWaves', marginX, cursorY);

      cursorY += 22;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`Saison complete : ${saison}`, marginX, cursorY);
      doc.text(`Généré le : ${formatDateFR(new Date())}`, marginX + 160, cursorY);

      // Synthèse
      cursorY += 18;
      doc.setDrawColor(220);
      doc.setLineWidth(1);
      doc.roundedRect(marginX, cursorY, pageWidth - marginX * 2, 52, 10, 10);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Synthèse (résultat, pas solde bancaire)', marginX + 16, cursorY + 18);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);

      const synthLeft = marginX + 16;
      const synthTop = cursorY + 36;

      doc.text(`Prévu recettes : ${formatCurrencyPdf(aggreg.totalPrevRec)}`, synthLeft, synthTop);
      doc.text(`Prévu dépenses : ${formatCurrencyPdf(aggreg.totalPrevDep)}`, synthLeft + 190, synthTop);
      doc.text(`Solde prévu : ${formatCurrencyPdf(soldePrev)}`, synthLeft + 380, synthTop);

      doc.text(`Réel recettes : ${formatCurrencyPdf(aggreg.totalRealRec)}`, synthLeft, synthTop + 16);
      doc.text(`Réel dépenses : ${formatCurrencyPdf(aggreg.totalRealDep)}`, synthLeft + 190, synthTop + 16);
      doc.text(`Solde réel : ${formatCurrencyPdf(soldeReal)}`, synthLeft + 380, synthTop + 16);

      doc.text(`Écart solde : ${formatCurrencyPdf(ecartSolde)}`, synthLeft + 560, synthTop + 16);

      cursorY += 78;

      const exportSection = (
        title: string,
        rows: AggregRow[],
        totals: { prev: number; real: number }
      ) => {
        // Filtrer pour export : on garde uniquement les lignes “utiles”
        const filtered = rows.filter(
          (r) => (r.montantPrevu || 0) !== 0 || (r.montantRealise || 0) !== 0
        );

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(title, marginX, cursorY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.text(
          `Total prévu : ${formatCurrencyPdf(totals.prev)}    •    Total réalisé : ${formatCurrencyPdf(
            totals.real
          )}`,
          marginX,
          cursorY + 16
        );

        cursorY += 26;

        autoTable(doc, {
          startY: cursorY,
          head: [['Catégorie', 'Poste', 'Prévu', 'Réalisé', 'Écart']],
          body:
            filtered.length === 0
              ? [['—', 'Aucune ligne', '0 €', '0 €', '0 €']]
              : filtered.map((r) => {
                  const ecart = (r.montantRealise || 0) - (r.montantPrevu || 0);
                  return [
                    r.categorie,
                    r.designation,
                    formatCurrencyPdf(r.montantPrevu || 0),
                    formatCurrencyPdf(r.montantRealise || 0),
                    formatCurrencyPdf(ecart),
                  ];
                }),
          styles: {
            font: 'helvetica',
            fontSize: 9.5,
            cellPadding: 6,
            overflow: 'linebreak',
            valign: 'middle',
          },
          headStyles: {
            fontStyle: 'bold',
            fillColor: [240, 240, 240],
            textColor: 20,
          },
          alternateRowStyles: { fillColor: [248, 248, 248] },
          columnStyles: {
            0: { cellWidth: 190 }, // Catégorie
            1: { cellWidth: 300 }, // Poste
            2: { cellWidth: 90, halign: 'right' },
            3: { cellWidth: 90, halign: 'right' },
            4: { cellWidth: 90, halign: 'right' },
          },
          margin: { left: marginX, right: marginX },
          didDrawPage: () => {
            // Footer page
            const pageCount = doc.getNumberOfPages();
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(
              `BlackWaves Cheer • Comparatif budget • Page ${pageCount}`,
              marginX,
              doc.internal.pageSize.getHeight() - 18
            );
          },
        });

        const finalY = (doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
        cursorY = finalY ? finalY + 26 : cursorY + 26;

        // Saut de page si nécessaire avant la prochaine section
        const pageHeight = doc.internal.pageSize.getHeight();
        if (cursorY > pageHeight - 140) {
          doc.addPage();
          cursorY = 48;
        }
      };

      exportSection('Dépenses', aggreg.depenses, {
        prev: aggreg.totalPrevDep,
        real: aggreg.totalRealDep,
      });

      exportSection('Recettes', aggreg.recettes, {
        prev: aggreg.totalPrevRec,
        real: aggreg.totalRealRec,
      });

      const filename = `BlackWaves_ComparatifBudget_${saison}_${formatDateFR(new Date()).replace(
        /\//g,
        '-'
      )}.pdf`;
      doc.save(filename);
    } catch (e) {
      console.error('Erreur export PDF comparatif', e);
      alert("Impossible de générer le PDF. Merci de réessayer.");
    } finally {
      setExporting(false);
    }
  };

  const panel = 'min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
  const inputClass = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900';

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 text-slate-900">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-700">Pilotage financier</p>
        <h1 className="mt-2 text-3xl font-bold">Comparatif prévisionnel / réalisé</h1>
        <p className="mt-2 text-sm text-slate-600">Comparez les postes du budget historique du club. Le résultat n&apos;est pas le solde bancaire.</p>
      </header>
      <section className={`${panel} flex flex-wrap items-end gap-4`} aria-label="Saison et export">
        <label className="grid gap-1 text-sm" htmlFor="comparison-season">Saison
          <input id="comparison-season" list="comparison-seasons" className={inputClass} value={saison} onChange={e => { setSaison(e.target.value); setStatus('loading'); }} placeholder="2025-2026" />
          <datalist id="comparison-seasons">{Array.from(new Set([...availableSeasons, saison])).map(s => <option key={s} value={s} />)}</datalist>
        </label>
        <button type="button" onClick={handleExportPdf} disabled={status !== 'success' || exporting} className="rounded-lg bg-cyan-800 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-900 disabled:opacity-50">
          {exporting ? 'Export en cours…' : 'Exporter PDF · saison complète'}
        </button>
        <p className="max-w-md text-xs text-slate-500">Le PDF exporte tous les postes de la saison {saison || 'sélectionnée'}, sans appliquer les filtres de détail ci-dessous.</p>
      </section>
      {status === 'loading' || status === 'idle' ? <p role="status" className={panel}>Chargement des données…</p> : status === 'error' ? <div role="alert" className={`${panel} text-rose-700`}>{error} <button className="ml-3 rounded-lg border border-rose-300 px-3 py-2" onClick={() => setRetry(r => r + 1)}>Réessayer</button></div> : <>
        <p className="text-sm text-slate-600">Synthèse indépendante des filtres de détail · Saison {saison} · Toutes les catégories et tous les postes · {previsionnel.length} lignes prévisionnelles et {lignes.length} mouvements.</p>
        <section className="grid gap-4 md:grid-cols-3" aria-label={`Synthèse de la saison ${saison}`}>
          <article className={panel}>
            <h2 className="text-sm font-semibold text-slate-600">Prévisionnel · saison complète</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt>Recettes</dt><dd>{formatCurrency(aggreg.totalPrevRec)}</dd></div>
              <div className="flex justify-between gap-3"><dt>Dépenses</dt><dd>{formatCurrency(aggreg.totalPrevDep)}</dd></div>
              <div className="flex justify-between gap-3 border-t border-slate-200 pt-3 font-semibold"><dt>Résultat prévu</dt><dd>{formatCurrency(soldePrev)}</dd></div>
            </dl>
          </article>
          <article className={panel}>
            <h2 className="text-sm font-semibold text-slate-600">Réalisé · saison complète</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt>Recettes</dt><dd>{formatCurrency(aggreg.totalRealRec)}</dd></div>
              <div className="flex justify-between gap-3"><dt>Dépenses</dt><dd>{formatCurrency(aggreg.totalRealDep)}</dd></div>
              <div className="flex justify-between gap-3 border-t border-slate-200 pt-3 font-semibold"><dt>Résultat réalisé</dt><dd>{formatCurrency(soldeReal)}</dd></div>
            </dl>
          </article>
          <article className={panel}>
            <h2 className="text-sm font-semibold text-slate-600">Écarts · réalisé − prévu</h2>
            <dl className="mt-3 space-y-3 text-sm">
              {[
                { title: 'Recettes', delta: ecartRec, actual: aggreg.totalRealRec, planned: aggreg.totalPrevRec, expense: false },
                { title: 'Dépenses', delta: ecartDep, actual: aggreg.totalRealDep, planned: aggreg.totalPrevDep, expense: true },
                { title: 'Résultat', delta: ecartSolde, actual: soldeReal, planned: soldePrev, expense: false },
              ].map(r => <div key={r.title}><div className="flex justify-between gap-3"><dt>{r.title}</dt><dd className="font-semibold">{formatCurrency(r.delta)}</dd></div><p className={`text-xs ${r.delta === 0 ? 'text-slate-500' : (r.expense ? r.delta < 0 : r.delta > 0) ? 'text-emerald-700' : 'text-rose-700'}`}>{varianceText(r.actual, r.planned, r.expense)}</p></div>)}
            </dl>
          </article>
        </section>
        <section className={panel} aria-label="Filtres du détail">
          <h2 className="mb-4 text-lg font-semibold">Explorer les postes</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1 text-sm">Rechercher un poste ou une catégorie<input type="search" className={`${inputClass} min-w-0`} value={query} onChange={e => setQuery(e.target.value)} placeholder="Déplacement, matériel…" /></label>
            <label className="grid gap-1 text-sm">Type<select className={inputClass} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}><option value="all">Tous les types</option><option value="depense">Dépenses</option><option value="recette">Recettes</option></select></label>
            <label className="grid min-w-0 gap-1 text-sm">Catégorie<select className={`${inputClass} max-w-full`} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option value="all">Toutes les catégories</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}{categoryFilter !== 'all' && !categories.includes(categoryFilter) && <option value={categoryFilter}>{categoryFilter} (aucune donnée)</option>}</select></label>
            <label className="grid gap-1 text-sm">Trier par<select className={inputClass} value={sort} onChange={e => setSort(e.target.value)}><option value="category">Catégorie et poste (A–Z)</option><option value="variance">Écart absolu décroissant</option><option value="planned">Montant prévu décroissant</option><option value="actual">Montant réalisé décroissant</option></select></label>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600" role="status">{filteredRows.length} poste(s) · Saison {saison} · {categoryFilter === 'all' ? 'Toutes les catégories' : categoryFilter} · {typeFilter === 'all' ? 'Tous les types' : typeFilter === 'depense' ? 'Dépenses' : 'Recettes'}{query.trim() && ` · Recherche « ${query.trim()} »`}</p>
            <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm" onClick={() => { setQuery(''); setCategoryFilter('all'); setTypeFilter('all'); setSort('category'); }}>Réinitialiser le détail</button>
          </div>
        </section>
        <p className="text-xs text-slate-600">Favorable = dépenses inférieures au prévu ou recettes supérieures au prévu. Pourcentage = (réalisé − prévu) / |prévu| ; non défini lorsque le prévu est nul. Le rattachement prévisionnel est prioritaire ; sans lien valide, le rapprochement utilise le type, la catégorie et la désignation.</p>
        {(['depense', 'recette'] as const).filter(type => typeFilter === 'all' || typeFilter === type).map(type => {
          const rows = filteredRows.filter(r => r.type === type);
          return <section key={type} className={panel}>
            <h2 className="text-lg font-semibold">{type === 'depense' ? 'Dépenses' : 'Recettes'} par catégorie et poste</h2>
            <p className="my-2 text-xs text-slate-600">Détail filtré · Saison {saison} · {categoryFilter === 'all' ? 'Toutes les catégories' : categoryFilter} · {rows.length} poste(s) · Prévu : {formatCurrency(rows.reduce((s, r) => s + r.montantPrevu, 0))} · Réalisé : {formatCurrency(rows.reduce((s, r) => s + r.montantRealise, 0))}</p>
            <div className="mt-3 max-h-[520px] overflow-auto rounded-lg border border-slate-200" role="region" aria-label={`${type === 'depense' ? 'Dépenses' : 'Recettes'} comparées`} tabIndex={0}>
              <table className="w-full min-w-[740px] text-sm">
                <thead className="sticky top-0 bg-slate-100 text-slate-700"><tr><th scope="col" className="px-3 py-3 text-left">Catégorie</th><th scope="col" className="px-3 py-3 text-left">Poste</th><th scope="col" className="px-3 py-3 text-right">Prévu</th><th scope="col" className="px-3 py-3 text-right">Réalisé</th><th scope="col" className="px-3 py-3 text-right">Écart € / % et appréciation</th></tr></thead>
                <tbody>{rows.length === 0 ? <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Aucun poste ne correspond à ces filtres pour cette saison.</td></tr> : rows.map((row, index) => {
                  const delta = row.montantRealise - row.montantPrevu;
                  const favorable = type === 'depense' ? delta < 0 : delta > 0;
                  return <tr key={`${row.categorie}-${row.designation}-${index}`} className="border-t border-slate-100 even:bg-slate-50">
                    <td className="px-3 py-3">{row.categorie}</td><th scope="row" className="px-3 py-3 text-left font-medium">{row.designation}</th>
                    <td className="whitespace-nowrap px-3 py-3 text-right">{formatCurrency(row.montantPrevu)}</td><td className="whitespace-nowrap px-3 py-3 text-right">{formatCurrency(row.montantRealise)}</td>
                    <td className={`px-3 py-3 text-right ${delta === 0 ? 'text-slate-600' : favorable ? 'text-emerald-700' : 'text-rose-700'}`}><p className="font-semibold">{formatCurrency(delta)}</p><p className="mt-1 text-xs">{varianceText(row.montantRealise, row.montantPrevu, type === 'depense')}</p></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          </section>;
        })}
      </>}
    </div>
  );
}
