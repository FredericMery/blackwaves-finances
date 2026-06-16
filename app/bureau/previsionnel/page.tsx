'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type BudgetType = 'depense' | 'recette';
type Status = 'idle' | 'loading' | 'success' | 'error';

type CategoryRow = {
  id: string;
  type: BudgetType;
  code?: string | null;
  label: string;
  ordre?: number | null;
  actif?: boolean | null;
};

type DesignationRow = {
  id: string;
  category_id: string;
  label: string;
  ordre?: number | null;
  actif?: boolean | null;
  saison?: string | null;
};

type PrevisionnelDbRow = {
  id: string;
  saison: string;
  type: BudgetType;
  categorie: string;
  designation: string;
  montant_prevu: number;
  commentaire?: string | null;
};

type CustomLine = {
  uid: string;
  id?: string;
  saison: string;
  type: BudgetType;
  categorie: string;
  designation: string;
  montant_prevu: number;
  commentaire?: string | null;
  isCustom: true;
};

const SAISONS = ['2024-2025', '2025-2026', '2026-2027'];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatCurrencyPdf = (value: number) => {
  const s = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value || 0);
  return s.replace(/[\u00A0\u202F]/g, ' ');
};

const createUid = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2)}-${Date.now()}`;

const norm = (s: string) =>
  (s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

const presetKey = (saison: string, categorieLabel: string, designationLabel: string) =>
  `${saison}__${norm(categorieLabel)}__${norm(designationLabel)}`;

export default function PrevisionnelPage() {
  const [saison, setSaison] = useState<string>('2025-2026');

  const [statusLoad, setStatusLoad] = useState<Status>('idle');
  const [statusSave, setStatusSave] = useState<Status>('idle');
  const [statusPdf, setStatusPdf] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);

  // Désignations chargées à la demande, cache par category_id
  const [desigsCache, setDesigsCache] = useState<Record<string, DesignationRow[]>>({});
  const [desigsLoading, setDesigsLoading] = useState<boolean>(false);

  // Montants presets : clé -> montant
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  // Meta presets : clé -> {categorie, designation} (pour save/export sans perdre les libellés)
  const [meta, setMeta] = useState<Record<string, { categorie: string; designation: string }>>({});

  // Lignes custom (ajout libre)
  const [customLines, setCustomLines] = useState<CustomLine[]>([]);

  // Limitation d’affichage des désignations dans l’onglet (utile si 200+)
  const BASE_LIMIT = 50;
  const STEP_LIMIT = 50;
  const [limit, setLimit] = useState<number>(BASE_LIMIT);
  const [search, setSearch] = useState<string>('');

  // Pour éviter setState après un changement rapide (sécurité)
  const loadTokenRef = useRef(0);

  // 1) Charger categories (1 fois)
  useEffect(() => {
    const loadCats = async () => {
      try {
        const { data, error: err } = await supabase
          .from('budget_categories')
          .select('id,type,code,label,ordre,actif')
          .eq('actif', true)
          .order('ordre', { ascending: true });

        if (err) {
          console.error('Erreur chargement budget_categories', err);
          setError("Impossible de charger les catégories (référentiel).");
          return;
        }

        const cats = (data || []) as CategoryRow[];

        // Tri: dépenses puis recettes, puis ordre
        cats.sort((a, b) => {
          const ta = a.type === 'depense' ? 0 : 1;
          const tb = b.type === 'depense' ? 0 : 1;
          if (ta !== tb) return ta - tb;
          const oa = Number(a.ordre ?? 99999);
          const ob = Number(b.ordre ?? 99999);
          if (oa !== ob) return oa - ob;
          return (a.label || '').localeCompare(b.label || '');
        });

        setCategories(cats);

        // Définit l’onglet par défaut si pas déjà set
        if (!activeCatId && cats.length) {
          setActiveCatId(cats[0].id);
        }
      } catch (e) {
        console.error('Erreur inattendue categories', e);
        setError("Impossible de charger les catégories (référentiel).");
      }
    };

    loadCats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categoryById = useMemo(() => {
    const m = new Map<string, CategoryRow>();
    categories.forEach((c) => m.set(c.id, c));
    return m;
  }, [categories]);

  const categoryByLabelNorm = useMemo(() => {
    const m = new Map<string, CategoryRow>();
    categories.forEach((c) => m.set(norm(c.label), c));
    return m;
  }, [categories]);

  // 2) Charger budget_previsionnel saison (1 fois par saison + categories prêtes)
  useEffect(() => {
    const loadPrevisionnel = async () => {
      if (!categories.length) return;

      setStatusLoad('loading');
      setError(null);

      const token = ++loadTokenRef.current;

      try {
        const { data, error: err } = await supabase
          .from('budget_previsionnel')
          .select('*')
          .eq('saison', saison);

        if (token !== loadTokenRef.current) return;

        if (err) {
          console.error('Erreur chargement budget_previsionnel', err);
          setError('Impossible de charger le prévisionnel.');
          setStatusLoad('error');
          setAmounts({});
          setMeta({});
          setCustomLines([]);
          return;
        }

        const rows = (data || []) as PrevisionnelDbRow[];

        const newAmounts: Record<string, number> = {};
        const newMeta: Record<string, { categorie: string; designation: string }> = {};
        const newCustom: CustomLine[] = [];

        rows.forEach((r) => {
          const catLabel = (r.categorie || '').trim() || 'Sans catégorie';
          const desLabel = (r.designation || '').trim() || 'sans designation';

          const catRef = categoryByLabelNorm.get(norm(catLabel));
          const isCatKnown = !!catRef;

          const isClearlyCustom = !isCatKnown || norm(desLabel) === norm('sans designation');

          if (isClearlyCustom) {
            newCustom.push({
              uid: r.id ? `db-${r.id}` : createUid(`custom-${catLabel}`),
              id: r.id,
              saison: r.saison,
              type: r.type as BudgetType,
              categorie: catLabel,
              designation: desLabel,
              montant_prevu: Number(r.montant_prevu || 0),
              commentaire: r.commentaire ?? null,
              isCustom: true,
            });
          } else {
            const k = presetKey(saison, catLabel, desLabel);
            newAmounts[k] = Number(r.montant_prevu || 0);
            newMeta[k] = { categorie: catLabel, designation: desLabel };
          }
        });

        setAmounts(newAmounts);
        setMeta(newMeta);
        setCustomLines(newCustom);
        setStatusLoad('success');

        // reset onglet et ui
        if (!activeCatId && categories.length) setActiveCatId(categories[0].id);
        setLimit(BASE_LIMIT);
        setSearch('');
      } catch (e) {
        if (token !== loadTokenRef.current) return;
        console.error('Erreur inattendue load previsionnel', e);
        setError('Impossible de charger le prévisionnel.');
        setStatusLoad('error');
      }
    };

    loadPrevisionnel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saison, categories]);

  // 3) Charger désignations UNIQUEMENT pour la catégorie active
  useEffect(() => {
    const loadDesigsForActive = async () => {
      if (!activeCatId) return;
      if (desigsCache[activeCatId]) return; // déjà en cache

      setDesigsLoading(true);
      const token = ++loadTokenRef.current;

      try {
        const { data, error: err } = await supabase
          .from('budget_designations')
          .select('id,category_id,label,ordre,actif,saison')
          .eq('actif', true)
          .eq('category_id', activeCatId)
          .or(`saison.is.null,saison.eq.${saison}`)
          .order('ordre', { ascending: true });

        if (token !== loadTokenRef.current) return;

        if (err) {
          console.error('Erreur chargement budget_designations', err);
          setDesigsCache((prev) => ({ ...prev, [activeCatId]: [] }));
          setDesigsLoading(false);
          return;
        }

        const arr = (data || []) as DesignationRow[];
        arr.sort((a, b) => {
          const oa = Number(a.ordre ?? 99999);
          const ob = Number(b.ordre ?? 99999);
          if (oa !== ob) return oa - ob;
          return (a.label || '').localeCompare(b.label || '');
        });

        setDesigsCache((prev) => ({ ...prev, [activeCatId]: arr }));
        setDesigsLoading(false);
      } catch (e) {
        if (token !== loadTokenRef.current) return;
        console.error('Erreur inattendue designations', e);
        setDesigsCache((prev) => ({ ...prev, [activeCatId]: [] }));
        setDesigsLoading(false);
      }
    };

    loadDesigsForActive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCatId, saison]);

  const activeCategory = useMemo(() => {
    if (!activeCatId) return null;
    return categoryById.get(activeCatId) || null;
  }, [activeCatId, categoryById]);

  const activeDesigs = useMemo(() => {
    if (!activeCatId) return [];
    return desigsCache[activeCatId] || [];
  }, [activeCatId, desigsCache]);

  /**
   * ✅ FIX IMPORTANT :
   * Si une désignation existe dans budget_previsionnel (meta/amounts),
   * mais pas dans budget_designations (référentiel), elle était invisible.
   * => On ajoute ces "orphelines" au tableau pour éviter le montant fantôme (ex: 22630€).
   */
  const activeAllDesigs = useMemo(() => {
    if (!activeCategory) return activeDesigs;

    const catNorm = norm(activeCategory.label);

    // Set des désignations référentiel (normalisées)
    const refSet = new Set(activeDesigs.map((d) => norm(d.label)));

    // On récupère les désignations présentes dans meta/amounts pour cette catégorie
    const orphanLabels: string[] = [];
    for (const [k, m] of Object.entries(meta)) {
      // k = saison__catNorm__desNorm
      const parts = k.split('__');
      const kCatNorm = parts[1] || '';
      if (kCatNorm !== catNorm) continue;
      if (!m?.designation) continue;

      const dn = norm(m.designation);
      if (!dn) continue;
      if (refSet.has(dn)) continue;

      // On ne les ajoute que si elles ont une valeur (sinon bruit)
      const v = Number(amounts[k] || 0);
      if (v !== 0) orphanLabels.push(m.designation);
    }

    if (!orphanLabels.length) return activeDesigs;

    // Dédup + tri alpha
    const uniq = Array.from(new Set(orphanLabels)).sort((a, b) => a.localeCompare(b, 'fr'));

    const orphans: DesignationRow[] = uniq.map((label, i) => ({
      id: `orphan-${activeCatId}-${i}-${norm(label)}`,
      category_id: activeCatId!,
      label,
      ordre: 999999,
      actif: true,
      saison,
    }));

    return [...activeDesigs, ...orphans];
  }, [activeDesigs, activeCategory, meta, amounts, activeCatId, saison]);

  // ✅ Filtre (sur la liste fusionnée)
  const activeDesigsFiltered = useMemo(() => {
    const q = norm(search);
    return q ? activeAllDesigs.filter((d) => norm(d.label).includes(q)) : activeAllDesigs;
  }, [activeAllDesigs, search]);

  // ✅ Limite (sur la liste fusionnée)
  const activeDesigsVisible = useMemo(() => {
    return activeDesigsFiltered.slice(0, limit);
  }, [activeDesigsFiltered, limit]);

  // Custom lines de la catégorie active
  const activeCustom = useMemo(() => {
    if (!activeCategory) return [];
    const catNorm = norm(activeCategory.label);
    return customLines.filter((l) => norm(l.categorie) === catNorm);
  }, [customLines, activeCategory]);

  const setPresetAmount = (catLabel: string, designationLabel: string, raw: string) => {
    const numeric = Number((raw || '').replace(',', '.'));
    const v = Number.isNaN(numeric) ? 0 : numeric;

    const k = presetKey(saison, catLabel, designationLabel);

    setAmounts((prev) => {
      if ((prev[k] || 0) === v) return prev;
      return { ...prev, [k]: v };
    });

    setMeta((prev) => {
      if (prev[k]) return prev;
      return { ...prev, [k]: { categorie: catLabel, designation: designationLabel } };
    });
  };

  const updateCustomLine = (uid: string, patch: Partial<CustomLine>) => {
    setCustomLines((prev) => prev.map((l) => (l.uid === uid ? { ...l, ...patch } : l)));
  };

  const addCustomLine = (cat: CategoryRow) => {
    setCustomLines((prev) => [
      ...prev,
      {
        uid: createUid(`custom-${cat.label}`),
        saison,
        type: cat.type,
        categorie: cat.label,
        designation: 'Nouvelle ligne',
        montant_prevu: 0,
        isCustom: true,
      },
    ]);
  };

  const deleteCustomLine = (uid: string) => {
    setCustomLines((prev) => prev.filter((l) => l.uid !== uid));
  };

  // Totaux globaux (amounts + custom)
  const { totalRecettes, totalDepenses, solde } = useMemo(() => {
    let recettes = 0;
    let depenses = 0;

    for (const [k, v] of Object.entries(amounts)) {
      const montant = Number(v || 0);
      const parts = k.split('__');
      const catNorm = parts[1] || '';
      const catRef = categoryByLabelNorm.get(catNorm);
      const type: BudgetType = catRef?.type || 'depense';
      if (type === 'recette') recettes += montant;
      else depenses += montant;
    }

    customLines.forEach((l) => {
      const m = Number(l.montant_prevu || 0);
      if (l.type === 'recette') recettes += m;
      else depenses += m;
    });

    return { totalRecettes: recettes, totalDepenses: depenses, solde: recettes - depenses };
  }, [amounts, customLines, categoryByLabelNorm]);

  const totalActiveCategory = useMemo(() => {
    if (!activeCategory) return 0;

    let sum = 0;
    const catNorm = norm(activeCategory.label);

    for (const [k, m] of Object.entries(amounts)) {
      const parts = k.split('__');
      const kCatNorm = parts[1] || '';
      if (kCatNorm === catNorm) sum += Number(m || 0);
    }

    activeCustom.forEach((l) => {
      sum += Number(l.montant_prevu || 0);
    });

    return sum;
  }, [amounts, activeCategory, activeCustom]);

  // Export/save : on travaille uniquement sur les lignes > 0
  const exportRows = useMemo(() => {
    const out: Array<{ saison: string; type: BudgetType; categorie: string; designation: string; montant: number }> = [];

    for (const [k, montant] of Object.entries(amounts)) {
      const v = Number(montant || 0);
      if (v <= 0) continue;

      const m = meta[k];
      if (!m) continue;

      const catRef = categoryByLabelNorm.get(norm(m.categorie));
      const type: BudgetType = catRef?.type || 'depense';

      out.push({
        saison,
        type,
        categorie: m.categorie,
        designation: m.designation,
        montant: v,
      });
    }

    customLines.forEach((l) => {
      const v = Number(l.montant_prevu || 0);
      if (v <= 0) return;
      out.push({
        saison,
        type: l.type,
        categorie: (l.categorie || '').trim() || 'Sans catégorie',
        designation: (l.designation || '').trim() || 'sans designation',
        montant: v,
      });
    });

    out.sort((a, b) => {
      const ta = a.type === 'depense' ? 0 : 1;
      const tb = b.type === 'depense' ? 0 : 1;
      if (ta !== tb) return ta - tb;
      const c = a.categorie.localeCompare(b.categorie);
      if (c !== 0) return c;
      return a.designation.localeCompare(b.designation);
    });

    return out;
  }, [amounts, meta, customLines, saison, categoryByLabelNorm]);

  const handleSubmit = async () => {
    setStatusSave('loading');
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('budget_previsionnel')
        .delete()
        .eq('saison', saison);

      if (deleteError) {
        console.error('Erreur suppression prévisionnel', deleteError);
        setError("Impossible d'écraser le prévisionnel existant.");
        setStatusSave('error');
        return;
      }

      const rowsToInsert = exportRows.map((r) => ({
        saison: r.saison,
        type: r.type,
        categorie: r.categorie,
        designation: r.designation,
        montant_prevu: r.montant,
      }));

      if (rowsToInsert.length === 0) {
        setStatusSave('success');
        return;
      }

      const { error: insertError } = await supabase.from('budget_previsionnel').insert(rowsToInsert);
      if (insertError) {
        console.error('Erreur insertion prévisionnel', insertError);
        setError("Impossible d'enregistrer le prévisionnel.");
        setStatusSave('error');
        return;
      }

      setStatusSave('success');
    } catch (e) {
      console.error('Erreur save', e);
      setError("Une erreur inattendue s'est produite.");
      setStatusSave('error');
    }
  };

  const handleExportPdf = async () => {
    try {
      setStatusPdf('loading');

      if (!exportRows.length) {
        setStatusPdf('idle');
        return;
      }

      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);

      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 40;

      const now = new Date();
      const dateStr = new Intl.DateTimeFormat('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('Prévisionnel budgétaire – BlackWaves', marginX, 52);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`Saison : ${saison}`, marginX, 74);
      doc.text(`Généré le : ${dateStr}`, marginX, 90);

      const boxTop = 108;
      const boxH = 58;
      doc.setDrawColor(220);
      doc.setLineWidth(1);
      doc.roundedRect(marginX, boxTop, pageWidth - marginX * 2, boxH, 10, 10);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Synthèse', marginX + 14, boxTop + 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.text(`Recettes : ${formatCurrencyPdf(totalRecettes)}`, marginX + 14, boxTop + 40);
      doc.text(`Dépenses : ${formatCurrencyPdf(totalDepenses)}`, marginX + 220, boxTop + 40);
      doc.text(`Solde : ${formatCurrencyPdf(solde)}`, marginX + 420, boxTop + 40);

      let cursorY = boxTop + boxH + 18;

      const groups = new Map<string, { type: BudgetType; subtotal: number; body: Array<[string, string, string]> }>();
      for (const r of exportRows) {
        const g = groups.get(r.categorie) || { type: r.type, subtotal: 0, body: [] };
        g.subtotal += r.montant;
        g.body.push([r.designation, r.type === 'recette' ? 'Recette' : 'Dépense', formatCurrencyPdf(r.montant)]);
        groups.set(r.categorie, g);
      }

      const orderedCats = categories.map((c) => c.label).filter((lbl) => groups.has(lbl));
      for (const lbl of groups.keys()) if (!orderedCats.includes(lbl)) orderedCats.push(lbl);

      for (const catLbl of orderedCats) {
        const g = groups.get(catLbl);
        if (!g) continue;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(catLbl, marginX, cursorY + 14);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Sous-total : ${formatCurrencyPdf(g.subtotal)}`, marginX, cursorY + 30);

        autoTable(doc, {
          startY: cursorY + 42,
          head: [['Désignation', 'Type', 'Montant']],
          body: g.body,
          theme: 'grid',
          styles: { font: 'helvetica', fontSize: 10, cellPadding: { top: 6, right: 8, bottom: 6, left: 8 } },
          columnStyles: { 0: { cellWidth: 320 }, 1: { cellWidth: 120 }, 2: { cellWidth: 120, halign: 'right' } },
          margin: { left: marginX, right: marginX },
        });

        const finalY = (doc as any).lastAutoTable?.finalY || cursorY + 80;
        cursorY = finalY + 18;
      }

      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(`Page ${i} / ${pageCount}`, pageWidth - marginX, doc.internal.pageSize.getHeight() - 26, {
          align: 'right',
        });
      }

      doc.save(`BlackWaves_Previsionnel_${saison}.pdf`);
      setStatusPdf('idle');
    } catch (e) {
      console.error('Erreur export PDF', e);
      setStatusPdf('error');
    }
  };

  const catBoxClass = (type: BudgetType) =>
    type === 'depense' ? 'border border-rose-500/25' : 'border border-emerald-500/25';

  // Onglets : dépenses rouge / recettes vert (même inactifs)
  const tabClass = (active: boolean, type: BudgetType) => {
    const base = 'rounded-full px-3 py-1 text-[11px] font-semibold border transition whitespace-nowrap';

    if (active) {
      return type === 'depense'
        ? `${base} border-rose-500/45 bg-rose-900/30 text-rose-100`
        : `${base} border-emerald-500/45 bg-emerald-900/30 text-emerald-100`;
    }

    return type === 'depense'
      ? `${base} border-rose-500/25 bg-rose-950/25 text-rose-200 hover:bg-rose-950/40`
      : `${base} border-emerald-500/25 bg-emerald-950/25 text-emerald-200 hover:bg-emerald-950/40`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-3 border-b border-white/5 pb-6">
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-400">
            Espace bureau • finances
          </div>
          <h1 className="text-3xl font-bold text-white md:text-4xl">Prévisionnel budgétaire</h1>
          <p className="max-w-2xl text-sm text-slate-300">
            Version onglets (anti-crash) : 1 catégorie affichée à la fois + désignations chargées à la demande.
          </p>
        </header>

        {/* Consolidé + actions top */}
        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-sky-500/40 bg-gradient-to-br from-sky-900/50 via-slate-900/40 to-slate-950/80 p-4 shadow-lg shadow-sky-900/40">
            <div className="text-xs font-medium uppercase tracking-wide text-sky-300">Saison</div>
            <div className="mt-2 flex items-center gap-3">
              <select
                className="w-36 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-1.5 text-sm text-slate-50 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-500"
                value={saison}
                onChange={(e) => {
                  setSaison(e.target.value);
                  setLimit(BASE_LIMIT);
                  setSearch('');
                  // IMPORTANT : on garde le cache (fonctionnement identique)
                }}
              >
                {SAISONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-slate-300">
                {statusLoad === 'loading' ? 'Chargement…' : 'OK'}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={statusPdf === 'loading' || exportRows.length === 0}
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-slate-950/40 px-4 py-2 text-sm font-semibold text-slate-50 hover:bg-slate-950/70 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {statusPdf === 'loading' ? 'Export PDF…' : 'Exporter PDF'}
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={statusSave === 'loading'}
                className="inline-flex items-center justify-center rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-500/40 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {statusSave === 'loading' ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-900/50 via-slate-900/40 to-slate-950/80 p-4 shadow-lg shadow-emerald-900/40">
            <div className="text-xs font-medium uppercase tracking-wide text-emerald-300">Total recettes</div>
            <div className="mt-2 text-2xl font-semibold">{formatCurrencyPdf(totalRecettes)}</div>
          </div>

          <div className="rounded-2xl border border-rose-500/40 bg-gradient-to-br from-rose-900/50 via-slate-900/40 to-slate-950/80 p-4 shadow-lg shadow-rose-900/40">
            <div className="text-xs font-medium uppercase tracking-wide text-rose-300">Total dépenses</div>
            <div className="mt-2 text-2xl font-semibold">{formatCurrencyPdf(totalDepenses)}</div>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-xl shadow-black/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-300">Solde</div>
              <div className="mt-1 text-2xl font-semibold">{formatCurrencyPdf(solde)}</div>
            </div>
            <div className="max-w-md text-xs text-slate-300">
              Export / Save ne prend que les lignes &gt; 0. Les onglets évitent de surcharger le navigateur.
            </div>
          </div>
        </section>

        {statusPdf === 'error' && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-900/40 px-4 py-3 text-sm text-rose-50">
            Impossible de générer le PDF. Vérifie que <b>jspdf</b> et <b>jspdf-autotable</b> sont installés.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-900/40 px-4 py-3 text-sm text-rose-50">
            {error}
          </div>
        )}

        {statusSave === 'success' && (
          <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-900/40 px-4 py-3 text-sm text-emerald-50">
            Prévisionnel enregistré.
          </div>
        )}

        {/* Onglets catégories */}
        <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-black/40 backdrop-blur">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white">Catégories (onglets)</div>
              <div className="text-xs text-slate-300">
                Dépenses puis recettes. 1 catégorie visible → pas de crash Chrome.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setLimit(BASE_LIMIT);
                }}
                placeholder="Filtrer les désignations…"
                className="w-56 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-50 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="mb-5 overflow-auto">
            <div className="flex min-w-max flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={tabClass(c.id === activeCatId, c.type)}
                  onClick={() => {
                    setActiveCatId(c.id);
                    setLimit(BASE_LIMIT);
                    setSearch('');
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Panneau catégorie active */}
          {!activeCategory ? (
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-6 text-center text-sm text-slate-300">
              Aucune catégorie active.
            </div>
          ) : (
            <div className={`rounded-2xl bg-slate-950/50 p-4 ${catBoxClass(activeCategory.type)}`}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-white">{activeCategory.label}</h3>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">
                    {activeCategory.type === 'recette' ? 'Recettes' : 'Dépenses'} • Total :{' '}
                    <span className="font-semibold text-slate-200">{formatCurrency(totalActiveCategory)}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {desigsLoading && <span className="text-[11px] text-slate-400">Chargement des désignations…</span>}

                  {/* Bouton "Tout afficher" basé sur la liste fusionnée */}
                  {activeDesigsFiltered.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setLimit(activeDesigsFiltered.length)}
                      disabled={limit >= activeDesigsFiltered.length}
                      className={[
                        'rounded-full border px-3 py-1 text-[11px] font-semibold transition',
                        limit >= activeDesigsFiltered.length
                          ? 'border-white/10 bg-slate-950/30 text-slate-500 cursor-not-allowed'
                          : 'border-white/15 bg-slate-950/40 text-slate-200 hover:bg-slate-950/70',
                      ].join(' ')}
                      title={
                        limit >= activeDesigsFiltered.length
                          ? 'Toutes les désignations sont déjà affichées'
                          : 'Afficher toutes les désignations de la catégorie'
                      }
                    >
                      Tout afficher ({activeDesigsFiltered.length})
                    </button>
                  )}

                  {limit > BASE_LIMIT && (
                    <button
                      type="button"
                      onClick={() => setLimit(BASE_LIMIT)}
                      className="rounded-full border border-white/15 bg-slate-950/40 px-3 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-950/70"
                    >
                      Replier
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-white/5 bg-slate-900/80">
                <div className="overflow-auto">
                  <table className="min-w-full border-collapse text-xs">
                    <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wide text-slate-300">
                      <tr>
                        <th className="px-3 py-2 text-left">Désignation</th>
                        <th className="w-40 px-3 py-2 text-right">Montant (€)</th>
                        <th className="w-20 px-3 py-2 text-center">Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {/* Presets (référentiel + orphelines) */}
                      {activeDesigsVisible.map((d) => {
                        const k = presetKey(saison, activeCategory.label, d.label);
                        const v = Number(amounts[k] || 0);

                        // (optionnel mais utile visuellement) badge si orpheline
                        const isOrphan = String(d.id || '').startsWith('orphan-');

                        return (
                          <tr key={`preset-${d.id}`} className="border-t border-white/5">
                            <td className="px-3 py-2 text-slate-100">
                              <div className="flex items-center gap-2">
                                <span>{d.label}</span>
                                {isOrphan && (
                                  <span className="rounded-full border border-amber-500/30 bg-amber-900/20 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                                    Hors référentiel
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right align-middle">
                              <input
                                type="number"
                                step="1"
                                className="w-full rounded-lg border border-white/15 bg-slate-950/80 px-2 py-1 text-right text-xs text-slate-50 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-500"
                                value={v ? String(v) : ''}
                                onChange={(e) => setPresetAmount(activeCategory.label, d.label, e.target.value)}
                                placeholder="0"
                              />
                            </td>
                            <td className="px-3 py-2 text-center align-middle">
                              <span className="text-[11px] text-slate-500">—</span>
                            </td>
                          </tr>
                        );
                      })}

                      {/* Lignes custom (toujours visibles dans l’onglet) */}
                      {activeCustom.map((l) => (
                        <tr key={l.uid} className="border-t border-white/5">
                          <td className="px-3 py-2 text-slate-100">
                            <input
                              type="text"
                              className="w-full rounded-lg border border-white/15 bg-slate-950/80 px-2 py-1 text-xs text-slate-50 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-500"
                              value={l.designation}
                              onChange={(e) => updateCustomLine(l.uid, { designation: e.target.value })}
                              placeholder="Intitulé"
                            />
                          </td>
                          <td className="px-3 py-2 text-right align-middle">
                            <input
                              type="number"
                              step="1"
                              className="w-full rounded-lg border border-white/15 bg-slate-950/80 px-2 py-1 text-right text-xs text-slate-50 outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-500"
                              value={l.montant_prevu ? String(l.montant_prevu) : ''}
                              onChange={(e) => {
                                const numeric = Number((e.target.value || '').replace(',', '.'));
                                updateCustomLine(l.uid, { montant_prevu: Number.isNaN(numeric) ? 0 : numeric });
                              }}
                              placeholder="0"
                            />
                          </td>
                          <td className="px-3 py-2 text-center align-middle">
                            <button
                              type="button"
                              onClick={() => deleteCustomLine(l.uid)}
                              className="inline-flex items-center rounded-full border border-rose-500/70 px-2 py-0.5 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/10"
                            >
                              Suppr
                            </button>
                          </td>
                        </tr>
                      ))}

                      {activeDesigsVisible.length === 0 && activeCustom.length === 0 && !desigsLoading && (
                        <tr className="border-t border-white/5">
                          <td colSpan={3} className="px-3 py-6 text-center text-xs text-slate-400">
                            Aucune désignation (référentiel) chargée / trouvée. Tu peux ajouter une ligne custom.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Ajout custom */}
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => addCustomLine(activeCategory)}
                  className="inline-flex items-center gap-1 rounded-full border border-sky-500/70 px-3 py-1 text-[11px] font-semibold text-sky-300 hover:bg-sky-500/10"
                >
                  <span className="text-sm">+</span>
                  <span>Ajouter une ligne</span>
                </button>
              </div>

              <div className="mt-2 text-[11px] text-slate-400">
                Astuce : utilise la recherche + “Tout afficher” si la catégorie a beaucoup de postes.
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
