'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

  useEffect(() => {
    const load = async () => {
      setStatus('loading');
      setError(null);

      try {
        const [
          { data: prevData, error: prevErr },
          { data: realData, error: realErr },
        ] = await Promise.all([
          supabase.from('budget_previsionnel').select('*').eq('saison', saison),
          supabase.from('budget_lignes').select('*').eq('saison', saison),
        ]);

        if (prevErr || realErr) {
          console.error('Erreur chargement comparatif', { prevErr, realErr });
          setError("Impossible de charger les données de budget pour cette saison.");
          setStatus('error');
          return;
        }

        setPrevisionnel((prevData || []) as PrevisionnelLigne[]);
        setLignes((realData || []) as BudgetLigne[]);
        setStatus('success');
      } catch (e) {
        console.error('Erreur inattendue comparatif', e);
        setError(
          "Une erreur inattendue s'est produite. Merci de réessayer un peu plus tard."
        );
        setStatus('error');
      }
    };

    load();
  }, [saison]);

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
      doc.text(`Saison : ${saison}`, marginX, cursorY);
      doc.text(`Généré le : ${formatDateFR(new Date())}`, marginX + 160, cursorY);

      // Synthèse
      cursorY += 18;
      doc.setDrawColor(220);
      doc.setLineWidth(1);
      doc.roundedRect(marginX, cursorY, pageWidth - marginX * 2, 52, 10, 10);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Synthèse', marginX + 16, cursorY + 18);

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

        // @ts-ignore
        cursorY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 26 : cursorY + 26;

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10">
        {/* En-tête */}
        <header className="mb-8 flex flex-col gap-3 border-b border-white/5 pb-6">
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-400">
            Espace bureau • finances
          </div>
          <h1 className="text-3xl font-bold text-white md:text-4xl">
            Comparatif prévisionnel / réalisé
          </h1>
          <p className="max-w-2xl text-sm text-slate-300">
            Visualisez, par catégorie et par poste, l&apos;écart entre le budget
            prévisionnel et les dépenses / recettes réellement enregistrées.
          </p>
        </header>

        {/* Barre de saison + état + export */}
        <section className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-slate-200">Saison</label>
            <select
              className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-1.5 text-sm text-slate-50 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-500"
              value={saison}
              onChange={(e) => setSaison(e.target.value)}
            >
              {SAISONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={status !== 'success' || exporting}
              className="inline-flex items-center justify-center rounded-full bg-violet-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-violet-500/30 hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
              title={
                status !== 'success'
                  ? 'Attendez la fin du chargement pour exporter.'
                  : 'Exporter en PDF'
              }
            >
              {exporting ? 'Export en cours…' : 'Exporter PDF'}
            </button>
          </div>

          <div className="text-xs text-slate-400">
            {status === 'loading' && 'Chargement des données…'}
            {status === 'success' &&
              `${previsionnel.length} lignes prévisionnelles • ${lignes.length} mouvements réalisés`}
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-500/40 bg-rose-900/40 px-4 py-3 text-sm text-rose-50">
            {error}
          </div>
        )}

        {/* Cartes de synthèse globales */}
        <section className="mb-8 grid gap-4 md:grid-cols-3">
          {/* Prévisionnel global */}
          <div className="rounded-2xl border border-sky-500/40 bg-gradient-to-br from-sky-900/50 via-slate-900/40 to-slate-950/80 p-4 shadow-lg shadow-sky-900/40">
            <div className="text-xs font-medium uppercase tracking-wide text-sky-300">
              Prévisionnel global
            </div>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-300">Recettes prévues</span>
                <span className="font-semibold">
                  {formatCurrency(aggreg.totalPrevRec)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Dépenses prévues</span>
                <span className="font-semibold">
                  {formatCurrency(aggreg.totalPrevDep)}
                </span>
              </div>
            </div>
            <div className="mt-3 border-t border-white/10 pt-2 text-xs text-slate-300">
              Solde prévisionnel :{' '}
              <span
                className={
                  soldePrev >= 0
                    ? 'font-semibold text-emerald-300'
                    : 'font-semibold text-rose-300'
                }
              >
                {formatCurrency(soldePrev)}
              </span>
            </div>
          </div>

          {/* Réalisé global */}
          <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-900/50 via-slate-900/40 to-slate-950/80 p-4 shadow-lg shadow-emerald-900/40">
            <div className="text-xs font-medium uppercase tracking-wide text-emerald-300">
              Réalisé global
            </div>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-300">Recettes réalisées</span>
                <span className="font-semibold">
                  {formatCurrency(aggreg.totalRealRec)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Dépenses réalisées</span>
                <span className="font-semibold">
                  {formatCurrency(aggreg.totalRealDep)}
                </span>
              </div>
            </div>
            <div className="mt-3 border-t border-white/10 pt-2 text-xs text-slate-300">
              Solde réalisé :{' '}
              <span
                className={
                  soldeReal >= 0
                    ? 'font-semibold text-emerald-300'
                    : 'font-semibold text-rose-300'
                }
              >
                {formatCurrency(soldeReal)}
              </span>
            </div>
          </div>

          {/* Écart global */}
          <div className="rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-900/60 via-slate-900/40 to-slate-950/80 p-4 shadow-lg shadow-violet-900/50">
            <div className="text-xs font-medium uppercase tracking-wide text-violet-300">
              Écart global
            </div>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-300">Écart recettes</span>
                <span
                  className={
                    ecartRec >= 0
                      ? 'font-semibold text-emerald-300'
                      : 'font-semibold text-rose-300'
                  }
                >
                  {formatCurrency(ecartRec)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Écart dépenses</span>
                <span
                  className={
                    ecartDep <= 0
                      ? 'font-semibold text-emerald-300'
                      : 'font-semibold text-rose-300'
                  }
                >
                  {formatCurrency(ecartDep)}
                </span>
              </div>
            </div>
            <div className="mt-3 border-t border-white/10 pt-2 text-xs text-slate-300">
              Écart sur le solde :{' '}
              <span
                className={
                  ecartSolde >= 0
                    ? 'font-semibold text-emerald-300'
                    : 'font-semibold text-rose-300'
                }
              >
                {formatCurrency(ecartSolde)}
              </span>
            </div>
          </div>
        </section>

        {/* Tableaux détaillés */}
        <section className="space-y-8">
          {/* DEPENSES */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-black/40">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Dépenses par catégorie et poste
                </h2>
                <p className="text-[11px] text-slate-300">
                  Comparatif entre budget prévu et réalisé pour chaque ligne de dépense.
                </p>
              </div>
              <div className="text-right text-xs text-slate-300">
                Total prévu :{' '}
                <span className="font-semibold text-slate-50">
                  {formatCurrency(aggreg.totalPrevDep)}
                </span>
                <br />
                Total réalisé :{' '}
                <span className="font-semibold text-slate-50">
                  {formatCurrency(aggreg.totalRealDep)}
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-white/5 bg-slate-950/70">
              <div className="max-h-[380px] overflow-auto text-xs">
                <table className="min-w-full border-collapse">
                  <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wide text-slate-300">
                    <tr>
                      <th className="px-3 py-2 text-left">Catégorie</th>
                      <th className="px-3 py-2 text-left">Poste</th>
                      <th className="px-3 py-2 text-right">Prévu</th>
                      <th className="px-3 py-2 text-right">Réalisé</th>
                      <th className="px-3 py-2 text-right">Écart</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggreg.depenses.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-center text-xs text-slate-400"
                        >
                          Aucune donnée de dépense pour cette saison.
                        </td>
                      </tr>
                    )}

                    {aggreg.depenses.map((row, idx) => {
                      const ecart = row.montantRealise - row.montantPrevu;
                      return (
                        <tr
                          key={`${row.categorie}-${row.designation}-${idx}`}
                          className={
                            idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900/10'
                          }
                        >
                          <td className="whitespace-nowrap px-3 py-2 text-slate-200">
                            {row.categorie}
                          </td>
                          <td className="px-3 py-2 text-slate-100">
                            {row.designation}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right text-slate-200">
                            {formatCurrency(row.montantPrevu)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right text-slate-100">
                            {formatCurrency(row.montantRealise)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right">
                            <span
                              className={
                                ecart <= 0
                                  ? 'font-semibold text-emerald-300'
                                  : 'font-semibold text-rose-300'
                              }
                            >
                              {formatCurrency(ecart)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RECETTES */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-black/40">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Recettes par catégorie et poste
                </h2>
                <p className="text-[11px] text-slate-300">
                  Comparatif entre budget prévu et réalisé pour chaque ligne de recette.
                </p>
              </div>
              <div className="text-right text-xs text-slate-300">
                Total prévu :{' '}
                <span className="font-semibold text-slate-50">
                  {formatCurrency(aggreg.totalPrevRec)}
                </span>
                <br />
                Total réalisé :{' '}
                <span className="font-semibold text-slate-50">
                  {formatCurrency(aggreg.totalRealRec)}
                </span>
              </div>
            </div>

            {/* ✅ fix petite typo border_white/5 -> border-white/5 */}
            <div className="overflow-hidden rounded-xl border border-white/5 bg-slate-950/70">
              <div className="max-h-[380px] overflow-auto text-xs">
                <table className="min-w-full border-collapse">
                  <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wide text-slate-300">
                    <tr>
                      <th className="px-3 py-2 text-left">Catégorie</th>
                      <th className="px-3 py-2 text-left">Poste</th>
                      <th className="px-3 py-2 text-right">Prévu</th>
                      <th className="px-3 py-2 text-right">Réalisé</th>
                      <th className="px-3 py-2 text-right">Écart</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aggreg.recettes.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-center text-xs text-slate-400"
                        >
                          Aucune donnée de recette pour cette saison.
                        </td>
                      </tr>
                    )}

                    {aggreg.recettes.map((row, idx) => {
                      const ecart = row.montantRealise - row.montantPrevu;
                      return (
                        <tr
                          key={`${row.categorie}-${row.designation}-${idx}`}
                          className={
                            idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900/10'
                          }
                        >
                          <td className="whitespace-nowrap px-3 py-2 text-slate-200">
                            {row.categorie}
                          </td>
                          <td className="px-3 py-2 text-slate-100">
                            {row.designation}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right text-slate-200">
                            {formatCurrency(row.montantPrevu)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right text-slate-100">
                            {formatCurrency(row.montantRealise)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right">
                            <span
                              className={
                                ecart >= 0
                                  ? 'font-semibold text-emerald-300'
                                  : 'font-semibold text-rose-300'
                              }
                            >
                              {formatCurrency(ecart)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
