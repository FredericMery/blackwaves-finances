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
  const [meta, setMeta] = useState<Record<string, { categorie: string; designation: string; id?: string; commentaire?: string | null; type?: BudgetType }>>({});
  const [savedRows, setSavedRows] = useState<PrevisionnelDbRow[]>([]);
  const [saveRevision, setSaveRevision] = useState(0);

  // Lignes custom (ajout libre)
  const [customLines, setCustomLines] = useState<CustomLine[]>([]);

  // Limitation d’affichage des désignations dans l’onglet (utile si 200+)
  const BASE_LIMIT = 50;
  const [limit, setLimit] = useState<number>(BASE_LIMIT);
  const [search, setSearch] = useState<string>('');
  const [uiReady, setUiReady] = useState(false);
  const restoredCategoryRef = useRef<string | null>(null);
  const restoredScrollRef = useRef<number | null>(null);

  // Pour éviter setState après un changement rapide (sécurité)
  const loadTokenRef = useRef(0);
  const designationTokenRef = useRef(0);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('bw-forecast-view') || 'null');
      if (saved && typeof saved === 'object') {
        if (SAISONS.includes(saved.saison)) setSaison(saved.saison);
        if (typeof saved.category === 'string') restoredCategoryRef.current = saved.category;
        if (typeof saved.search === 'string') setSearch(saved.search);
        if (Number.isInteger(saved.limit) && saved.limit >= BASE_LIMIT) setLimit(saved.limit);
        if (Number.isFinite(saved.scroll) && saved.scroll >= 0) restoredScrollRef.current = saved.scroll;
      }
    } catch {
      // La navigation reste disponible si le stockage du navigateur est bloqué.
    }
    setUiReady(true);
  }, []);

  useEffect(() => {
    if (!uiReady) return;
    try {
      sessionStorage.setItem('bw-forecast-view', JSON.stringify({
        saison, category: activeCatId, search, limit,
        scroll: restoredScrollRef.current ?? window.scrollY,
      }));
    } catch {
      // Le stockage des filtres est facultatif.
    }
  }, [uiReady, saison, activeCatId, search, limit]);

  useEffect(() => {
    if (statusLoad !== 'success' || desigsLoading || restoredScrollRef.current === null) return;
    const frame = requestAnimationFrame(() => {
      window.scrollTo(0, restoredScrollRef.current || 0);
      restoredScrollRef.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [statusLoad, desigsLoading, activeCatId]);

  useEffect(() => {
    let scrollPosition = window.scrollY;
    function trackScroll() {
      scrollPosition = window.scrollY;
    }
    function rememberScroll() {
      try {
        const saved = JSON.parse(sessionStorage.getItem('bw-forecast-view') || '{}');
        sessionStorage.setItem('bw-forecast-view', JSON.stringify({ ...saved, scroll: scrollPosition }));
      } catch {
        // La position de lecture est un confort, pas une condition de saisie.
      }
    }
    window.addEventListener('scroll', trackScroll, { passive: true });
    window.addEventListener('pagehide', rememberScroll);
    return () => {
      rememberScroll();
      window.removeEventListener('scroll', trackScroll);
      window.removeEventListener('pagehide', rememberScroll);
    };
  }, []);

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
          setActiveCatId(cats.find((cat) => cat.id === restoredCategoryRef.current)?.id || cats[0].id);
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
        const rows: PrevisionnelDbRow[] = [];
        for (let start = 0; ; start += 1000) {
          const { data, error: err } = await supabase
            .from('budget_previsionnel').select('*').eq('saison', saison)
            .order('id').range(start, start + 999);
          if (token !== loadTokenRef.current) return;
          if (err) throw err;
          rows.push(...((data || []) as PrevisionnelDbRow[]));
          if (!data || data.length < 1000) break;
        }

        const newAmounts: Record<string, number> = {};
        const newMeta: typeof meta = {};
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
            if (newMeta[k]) {
              newCustom.push({
                ...r,
                uid: `db-${r.id}`,
                montant_prevu: Number(r.montant_prevu || 0),
                isCustom: true,
              });
            } else {
              newAmounts[k] = Number(r.montant_prevu || 0);
              newMeta[k] = { categorie: catLabel, designation: desLabel, id: r.id, commentaire: r.commentaire, type: r.type };
            }
          }
        });

        setAmounts(newAmounts);
        setMeta(newMeta);
        setCustomLines(newCustom);
        setSavedRows(rows);
        setStatusLoad('success');

        // reset onglet et ui
        if (!activeCatId && categories.length) setActiveCatId(categories[0].id);
      } catch (e) {
        if (token !== loadTokenRef.current) return;
        console.error('Erreur inattendue load previsionnel', e);
        setError('Impossible de charger le prévisionnel.');
        setStatusLoad('error');
      }
    };

    loadPrevisionnel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saison, categories, saveRevision]);

  // 3) Charger désignations UNIQUEMENT pour la catégorie active
  useEffect(() => {
    const loadDesigsForActive = async () => {
      const token = ++designationTokenRef.current;
      if (!activeCatId) return;
      const cacheKey = `${saison}__${activeCatId}`;
      if (desigsCache[cacheKey]) {
        setDesigsLoading(false);
        return;
      }

      setDesigsLoading(true);

      try {
        const { data, error: err } = await supabase
          .from('budget_designations')
          .select('id,category_id,label,ordre,actif,saison')
          .eq('actif', true)
          .eq('category_id', activeCatId)
          .or(`saison.is.null,saison.eq.${saison}`)
          .order('ordre', { ascending: true });

        if (token !== designationTokenRef.current) return;

        if (err) {
          console.error('Erreur chargement budget_designations', err);
          setError('Impossible de charger les désignations de cette catégorie.');
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

        setDesigsCache((prev) => ({ ...prev, [cacheKey]: arr }));
        setDesigsLoading(false);
      } catch (e) {
        if (token !== designationTokenRef.current) return;
        console.error('Erreur inattendue designations', e);
        setError('Impossible de charger les désignations de cette catégorie.');
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
    return desigsCache[`${saison}__${activeCatId}`] || [];
  }, [activeCatId, saison, desigsCache]);

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
    setStatusSave('idle');
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
    setStatusSave('idle');
    setCustomLines((prev) => prev.map((l) => (l.uid === uid ? { ...l, ...patch } : l)));
  };

  const addCustomLine = (cat: CategoryRow) => {
    setStatusSave('idle');
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
    setStatusSave('idle');
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
      const type: BudgetType = meta[k]?.type || catRef?.type || 'depense';
      if (type === 'recette') recettes += montant;
      else depenses += montant;
    }

    customLines.forEach((l) => {
      const m = Number(l.montant_prevu || 0);
      if (l.type === 'recette') recettes += m;
      else depenses += m;
    });

    return { totalRecettes: recettes, totalDepenses: depenses, solde: recettes - depenses };
  }, [amounts, customLines, categoryByLabelNorm, meta]);

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
    const out: Array<{ id?: string; commentaire?: string | null; saison: string; type: BudgetType; categorie: string; designation: string; montant: number }> = [];

    for (const [k, montant] of Object.entries(amounts)) {
      const v = Number(montant || 0);
      if (v <= 0) continue;

      const m = meta[k];
      if (!m) continue;

      const catRef = categoryByLabelNorm.get(norm(m.categorie));
      const type: BudgetType = m.type || catRef?.type || 'depense';

      out.push({
        id: m.id,
        commentaire: m.commentaire,
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
        id: l.id,
        commentaire: l.commentaire,
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
    if (statusLoad !== 'success' || statusSave === 'loading') return;
    setStatusSave('loading');
    setError(null);

    try {
      const positiveRows = exportRows.map((r) => ({
        ...(r.id ? { id: r.id } : {}),
        saison: r.saison,
        type: r.type,
        categorie: r.categorie,
        designation: r.designation,
        montant_prevu: r.montant,
        commentaire: r.commentaire ?? null,
      }));
      const retainedIds = new Set(exportRows.flatMap((r) => r.id ? [r.id] : []));
      const removedRows = savedRows.filter((r) => !retainedIds.has(r.id));
      const linkedIds = new Set<string>();
      if (removedRows.length) {
        for (let start = 0; ; start += 1000) {
          const { data: links, error: linksError } = await supabase
            .from('budget_lignes')
            .select('id, previsionnel_id')
            .in('previsionnel_id', removedRows.map((r) => r.id))
            .order('id').range(start, start + 999);
          if (linksError) throw linksError;
          for (const link of links || []) {
            if (link.previsionnel_id) linkedIds.add(String(link.previsionnel_id));
          }
          if (!links || links.length < 1000) break;
        }
      }
      const existingRows = positiveRows.filter((r) => r.id);
      // Un poste à zéro déjà utilisé reste identifiable par ses mouvements.
      const linkedZeroRows = removedRows.filter((r) => linkedIds.has(String(r.id)))
        .map((r) => ({
          id: r.id, saison: r.saison, type: r.type, categorie: r.categorie,
          designation: r.designation, montant_prevu: 0, commentaire: r.commentaire ?? null,
        }));
      if (existingRows.length || linkedZeroRows.length) {
        const { error: updateError } = await supabase.from('budget_previsionnel')
          .upsert([...existingRows, ...linkedZeroRows], { onConflict: 'id' });
        if (updateError) throw updateError;
      }
      const removableIds = removedRows.filter((r) => !linkedIds.has(String(r.id))).map((r) => r.id);
      if (removableIds.length) {
        const { error: deleteError } = await supabase.from('budget_previsionnel')
          .delete().eq('saison', saison).in('id', removableIds);
        if (deleteError) throw deleteError;
      }
      const newRows = positiveRows.filter((r) => !r.id);
      if (newRows.length) {
        const { error: insertError } = await supabase.from('budget_previsionnel').insert(newRows);
        if (insertError) throw insertError;
      }

      setStatusSave('success');
      setSaveRevision((revision) => revision + 1);
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

      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' }) as InstanceType<typeof jsPDF> & {
        lastAutoTable?: { finalY: number };
      };

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

        const finalY = doc.lastAutoTable?.finalY || cursorY + 80;
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
    const base = 'rounded-xl px-3 py-2 text-sm font-semibold border transition text-left';

    if (active) {
      return type === 'depense'
        ? `${base} border-rose-300 bg-rose-50 text-rose-900`
        : `${base} border-emerald-300 bg-emerald-50 text-emerald-900`;
    }

    return type === 'depense'
      ? `${base} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`
      : `${base} border-slate-200 bg-white text-slate-700 hover:bg-slate-50`;
  };

  return (
    <div className="text-slate-950">
      <div className="mx-auto max-w-6xl pb-10">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-6">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-800">
            Préparer la saison
          </div>
          <h1 className="text-3xl font-bold text-slate-950 md:text-4xl">Prévisionnel budgétaire</h1>
          <p className="max-w-2xl text-sm text-slate-600">
            Choisissez une catégorie, renseignez les montants attendus, puis enregistrez la saison.
            Les totaux portent sur toutes les catégories, même celles qui ne sont pas affichées.
          </p>
        </header>

        {/* Consolidé + actions top */}
        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <label htmlFor="forecast-season" className="text-xs font-semibold uppercase tracking-wide text-slate-600">Saison</label>
            <div className="mt-2 flex items-center gap-3">
              <select
                id="forecast-season"
                disabled={statusSave === 'loading'}
                className="w-40 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 disabled:opacity-60"
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
              <span role="status" className="text-xs text-slate-600">
                {statusLoad === 'loading' ? 'Chargement…' : statusLoad === 'success' ? 'Données chargées' : statusLoad === 'error' ? 'Données indisponibles' : 'En attente'}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={statusPdf === 'loading' || statusLoad !== 'success' || exportRows.length === 0}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {statusPdf === 'loading' ? 'Export PDF…' : 'Exporter PDF'}
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={statusSave === 'loading' || statusLoad !== 'success'}
                className="inline-flex items-center justify-center rounded-xl bg-cyan-800 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {statusSave === 'loading' ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Recettes prévues</div>
            <div className="mt-2 text-2xl font-semibold">{statusLoad === 'success' ? formatCurrencyPdf(totalRecettes) : '—'}</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-rose-800">Dépenses prévues</div>
            <div className="mt-2 text-2xl font-semibold">{statusLoad === 'success' ? formatCurrencyPdf(totalDepenses) : '—'}</div>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">Résultat prévisionnel</div>
              <div className="mt-1 text-2xl font-semibold">{statusLoad === 'success' ? formatCurrencyPdf(solde) : '—'}</div>
            </div>
            <div className="max-w-md text-xs leading-relaxed text-slate-600">
              Recettes prévues − dépenses prévues, sans lien avec le solde bancaire.
              Le PDF ne retient que les montants strictement positifs. Les postes remis à zéro
              restent conservés lorsqu’un mouvement leur est rattaché.
            </div>
          </div>
        </section>

        {statusPdf === 'error' && (
          <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            Impossible de générer le PDF. Réessayez avec le bouton « Exporter PDF ».
          </div>
        )}

        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {error}
          </div>
        )}

        {statusSave === 'success' && (
          <div role="status" className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Prévisionnel enregistré.
          </div>
        )}

        {/* Onglets catégories */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Postes budgétaires</h2>
              <div className="text-sm text-slate-600">
                Une catégorie à la fois. Les montants saisis restent disponibles lorsque vous changez de catégorie.
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                aria-label="Rechercher une désignation dans la catégorie"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setLimit(BASE_LIMIT);
                }}
                placeholder="Filtrer les désignations…"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 sm:w-64"
              />
            </div>
          </div>

          <div className="mb-5">
            <div aria-label="Catégories du prévisionnel" className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={c.id === activeCatId}
                  className={tabClass(c.id === activeCatId, c.type)}
                  onClick={() => {
                    setActiveCatId(c.id);
                    setLimit(BASE_LIMIT);
                    setSearch('');
                  }}
                >
                  <span className="block text-xs font-normal">{c.type === 'recette' ? 'Recettes' : 'Dépenses'}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Panneau catégorie active */}
          {!activeCategory ? (
            <div role="status" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
              {statusLoad === 'loading' ? 'Chargement des catégories…' : 'Aucune catégorie disponible.'}
            </div>
          ) : (
            <div aria-busy={desigsLoading || statusLoad === 'loading'} className={`rounded-2xl bg-slate-50 p-3 sm:p-4 ${catBoxClass(activeCategory.type)}`}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-950">{activeCategory.label}</h3>
                  <p className="text-xs uppercase tracking-wide text-slate-600">
                    {activeCategory.type === 'recette' ? 'Recettes' : 'Dépenses'} • Total :{' '}
                    <span className="font-semibold text-slate-950">{statusLoad === 'success' ? formatCurrency(totalActiveCategory) : '—'}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {desigsLoading && <span role="status" className="text-xs text-slate-600">Chargement des désignations…</span>}

                  {/* Bouton "Tout afficher" basé sur la liste fusionnée */}
                  {activeDesigsFiltered.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setLimit(activeDesigsFiltered.length)}
                      disabled={limit >= activeDesigsFiltered.length}
                      className={[
                        'rounded-full border px-3 py-1 text-[11px] font-semibold transition',
                        limit >= activeDesigsFiltered.length
                          ? 'border-slate-200 bg-white text-slate-500 cursor-not-allowed'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100',
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
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Replier
                    </button>
                  )}
                </div>
              </div>

              <fieldset disabled={statusLoad !== 'success' || statusSave === 'loading'} className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white disabled:opacity-60">
                <legend className="sr-only">Montants de la catégorie {activeCategory.label}</legend>
                <div>
                  <table className="forecast-table w-full table-fixed border-collapse text-sm">
                    <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-3 py-2 text-left">Désignation</th>
                        <th className="w-32 px-3 py-2 text-right sm:w-40">Montant (€)</th>
                        <th className="w-24 px-3 py-2 text-center">Actions</th>
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
                          <tr key={`preset-${d.id}`} className="border-t border-slate-200">
                            <td className="px-3 py-2 text-slate-800">
                              <div className="flex items-center gap-2">
                                <span>{d.label}</span>
                                {isOrphan && (
                                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900">
                                    Hors référentiel
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right align-middle">
                              <input
                                type="number"
                                step="1"
                                aria-label={`Montant prévu en euros : ${d.label}`}
                                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-right text-sm text-slate-950"
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
                        <tr key={l.uid} className="border-t border-slate-200">
                          <td className="px-3 py-2 text-slate-800">
                            <input
                              type="text"
                              aria-label="Désignation de la ligne libre"
                              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-950"
                              value={l.designation}
                              onChange={(e) => updateCustomLine(l.uid, { designation: e.target.value })}
                              placeholder="Intitulé"
                            />
                          </td>
                          <td className="px-3 py-2 text-right align-middle">
                            <input
                              type="number"
                              step="1"
                              aria-label={`Montant prévu en euros : ${l.designation}`}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-right text-sm text-slate-950"
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
                              aria-label={`Retirer la ligne ${l.designation}`}
                              className="inline-flex items-center rounded-xl border border-rose-300 px-2 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-50"
                            >
                              Retirer
                            </button>
                          </td>
                        </tr>
                      ))}

                      {activeDesigsVisible.length === 0 && activeCustom.length === 0 && !desigsLoading && (
                        <tr className="border-t border-slate-200">
                          <td colSpan={3} className="px-3 py-6 text-center text-sm text-slate-600">
                            Aucune désignation trouvée. Modifiez la recherche ou ajoutez une ligne libre.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </fieldset>

              {/* Ajout custom */}
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => addCustomLine(activeCategory)}
                  disabled={statusLoad !== 'success' || statusSave === 'loading'}
                  className="inline-flex items-center gap-2 rounded-xl border border-cyan-300 bg-white px-3 py-2 text-sm font-semibold text-cyan-900 hover:bg-cyan-50 disabled:opacity-60"
                >
                  <span className="text-sm">+</span>
                  <span>Ajouter une ligne</span>
                </button>
              </div>

              <div className="mt-2 text-xs text-slate-600">
                Les lignes libres restent visibles dans leur catégorie. « Tout afficher » révèle les autres désignations.
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
