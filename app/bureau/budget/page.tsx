'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState, FormEvent, useRef, useId } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const SAISONS = ['2024-2025', '2025-2026', '2026-2027'];

type BudgetType = 'depense' | 'recette';

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
  previsionnel_id: string | null;
  created_at?: string;
};

type PrevisionnelLigne = {
  id: string | number;
  saison: string;
  type: BudgetType;
  categorie: string;
  designation: string;
  montant_prevu: number;
};

type PrevisionnelRow = {
  id: string | number;
  saison: string;
  type: BudgetType;
  categorie: string;
  designation: string;
  montant_prevu: number | string | null;
};

type Status = 'idle' | 'loading' | 'success' | 'error';
type TabKey = 'new' | 'moves';

type BudgetCategoryRow = {
  id: string;
  type: BudgetType;
  code: string | null;
  label: string;
  ordre: number | null;
  actif: boolean;
};

type BudgetDesignationRow = {
  id: string;
  category_id: string;
  code: string | null;
  label: string;
  description: string | null;
  ordre: number | null;
  actif: boolean;
  saison: string | null; // NULL = générique
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(value || 0);

const formatCurrency0 = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatDate = (value: string) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('fr-FR');
};

function Pill({
  children,
  tone = 'slate',
}: {
  children: React.ReactNode;
  tone?: 'slate' | 'emerald' | 'rose' | 'sky' | 'amber';
}) {
  const cls =
    tone === 'emerald'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : tone === 'rose'
      ? 'bg-rose-50 text-rose-800 border-rose-200'
      : tone === 'sky'
      ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
      : tone === 'amber'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <span className={['inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold', cls].join(' ')}>
      {children}
    </span>
  );
}

function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  variant?: 'dark' | 'white';
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const trigger = document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null;
    dialog.showModal();
    dialog.querySelector<HTMLButtonElement>('button')?.focus();
    return () => {
      dialog.close();
      if (trigger?.isConnected) trigger.focus();
      else document.getElementById('budget-add')?.focus();
    };
  }, [open]);

  return (
    <dialog ref={dialogRef} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') { event.preventDefault(); onClose(); return; }
        if (event.key !== 'Tab') return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'))
          .filter((control) => control.getClientRects().length > 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === event.currentTarget)) {
          event.preventDefault(); first.focus();
        }
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/60 [&_button]:min-h-11 [&_a]:min-h-11 [&_input:not([type=hidden])]:min-h-11 [&_select]:min-h-11 [&_button]:min-w-11 [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-2 [&_:focus-visible]:outline-cyan-700">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200"
          >
            Fermer
          </button>
        </div>

        <div className="px-5 py-4">
          {open ? children : null}
        </div>
    </dialog>
  );
}

export default function BudgetPage() {
  const [retryCount, setRetryCount] = useState(0);
  const [statusPrev, setStatusPrev] = useState<Status>('loading');
  const [statusRefs, setStatusRefs] = useState<Status>('loading');
  const [notice, setNotice] = useState('');
  // ✅ Étape 4 : état global du prévisionnel (toutes saisons) + chargement au montage
  const [previsionnelAll, setPrevisionnelAll] = useState<PrevisionnelLigne[]>([]);

  useEffect(() => {
    const loadAllPrev = async () => {
      setStatusPrev('loading');
      try {
      const { data, error } = await supabase
        .from('budget_previsionnel')
        .select('*')
        .order('saison', { ascending: false })
        .order('categorie', { ascending: true });

      if (error) {
        console.error('Erreur chargement budget_previsionnel (all)', error);
        setPrevisionnelAll([]);
        setStatusPrev('error');
        return;
      }

      setPrevisionnelAll(
        (data || []).map((row: PrevisionnelRow) => ({
          id: row.id,
          saison: row.saison,
          type: row.type as BudgetType,
          categorie: row.categorie,
          designation: row.designation,
          montant_prevu: Number(row.montant_prevu || 0),
        }))
      );
      setStatusPrev('success');
      } catch { setStatusPrev('error'); }
    };

    loadAllPrev();
  }, [retryCount]);

  // UI tabs (UX only)
  const [activeTab, setActiveTab] = useState<TabKey>('moves');
  const [sortBy, setSortBy] = useState('date-desc');

  // Formulaire (mêmes states qu’avant)
  const [type, setType] = useState<BudgetType>('depense');
  const [date, setDate] = useState<string>('');
  const [saison, setSaison] = useState<string>('2025-2026');
  const [montant, setMontant] = useState<string>('');
  const [libelle, setLibelle] = useState<string>('');
  const [categorie, setCategorie] = useState<string>('');
  const [commentaire, setCommentaire] = useState<string>('');
  const [factureFile, setFactureFile] = useState<File | null>(null);

  const [selectedPrevId, setSelectedPrevId] = useState<string>('');

  // Données & filtres
  const [lignes, setLignes] = useState<BudgetLigne[]>([]);
  const [statusLoad, setStatusLoad] = useState<Status>('idle');
  const [statusForm, setStatusForm] = useState<Status>('idle');
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [errorUpload, setErrorUpload] = useState<string | null>(null);

  const [filterSeason, setFilterSeason] = useState<string>('toutes');
  const [filterType, setFilterType] = useState<'tous' | BudgetType>('tous');
  const [filterCategory, setFilterCategory] = useState<string>('toutes');
  const [search, setSearch] = useState<string>('');

  // ✅ UX filters (UI only)
  const [onlyMissingInvoices, setOnlyMissingInvoices] = useState<boolean>(false);
  const [displayLimit, setDisplayLimit] = useState<number>(100); // 30 / 100 / 300 / Infinity

  // ✅ Sélection + ajout facture sur un mouvement existant
  const [selectedLigneId, setSelectedLigneId] = useState<string | null>(null);
  const [factureFileEdit, setFactureFileEdit] = useState<File | null>(null);
  const [statusFactureEdit, setStatusFactureEdit] = useState<Status>('idle');
  const [errorFactureEdit, setErrorFactureEdit] = useState<string | null>(null);

  const selectedLigne = useMemo(
    () => (selectedLigneId ? lignes.find((l) => l.id === selectedLigneId) : null),
    [selectedLigneId, lignes]
  );

  // ✅ Popup édition (facture) au clic sur la ligne
  const [openEditModal, setOpenEditModal] = useState<boolean>(false);

  // ✅ Référentiels pour "non prévu"
  const [refCategories, setRefCategories] = useState<BudgetCategoryRow[]>([]);
  const [refDesignations, setRefDesignations] = useState<BudgetDesignationRow[]>([]);

  useEffect(() => {
    const loadRefs = async () => {
      setStatusRefs('loading');
      try {
      const { data: cats, error: errCats } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('actif', true)
        .order('ordre', { ascending: true });

      if (errCats) {
        console.error('Erreur chargement budget_categories', errCats);
        setRefCategories([]);
      } else {
        setRefCategories((cats || []) as BudgetCategoryRow[]);
      }

      const { data: des, error: errDes } = await supabase
        .from('budget_designations')
        .select('*')
        .eq('actif', true)
        .order('ordre', { ascending: true });

      if (errDes) {
        console.error('Erreur chargement budget_designations', errDes);
        setRefDesignations([]);
      } else {
        setRefDesignations((des || []) as BudgetDesignationRow[]);
      }
      setStatusRefs(errCats || errDes ? 'error' : 'success');
      } catch { setStatusRefs('error'); }
    };

    loadRefs();
  }, [retryCount]);

  // Chargement initial des mouvements
  useEffect(() => {
    const load = async () => {
      setStatusLoad('loading');
      try {
      const { data, error } = await supabase.from('budget_lignes').select('*').order('date', { ascending: false });

      if (error) {
        console.error('Erreur chargement budget_lignes', error);
        setStatusLoad('error');
        return;
      }
      setLignes((data || []) as BudgetLigne[]);
      setStatusLoad('success');
      } catch { setStatusLoad('error'); }
    };

    load();
  }, [retryCount]);

  // Listes pour filtres
  const saisonsDisponibles = useMemo(() => {
    const set = new Set<string>();
    lignes.forEach((l) => l.saison && set.add(l.saison));
    return Array.from(set).sort().reverse();
  }, [lignes]);

  const categoriesDisponibles = useMemo(() => {
    const set = new Set<string>();
    lignes.forEach((l) => l.categorie && set.add(l.categorie));
    return Array.from(set).sort();
  }, [lignes]);

  // Lignes filtrées pour l'affichage
  const lignesFiltrees = useMemo(() => {
    return lignes.filter((l) => {
      if (filterSeason !== 'toutes' && l.saison !== filterSeason) return false;
      if (filterType !== 'tous' && l.type !== filterType) return false;
      if (filterCategory !== 'toutes' && l.categorie !== filterCategory) return false;

      if (onlyMissingInvoices && !!l.facture_url) return false;

      if (search.trim()) {
        const s = search.toLowerCase();
        const texte = `${l.designation || ''} ${l.categorie || ''} ${l.commentaire || ''}`.toLowerCase();
        if (!texte.includes(s)) return false;
      }
      return true;
    }).sort((a, b) => {
      const direction = sortBy.endsWith('-desc') ? -1 : 1;
      const field = sortBy.split('-')[0];
      if (field === 'amount') return direction * (Number(a.montant) - Number(b.montant));
      const key = field === 'category' ? 'categorie' : field === 'designation' ? 'designation' : 'date';
      return direction * (a[key] || '').localeCompare(b[key] || '', 'fr');
    });
  }, [lignes, filterSeason, filterType, filterCategory, search, onlyMissingInvoices, sortBy]);

  // UX: pagination/limit côté UI
  const lignesAffichees = useMemo(() => {
    if (!Number.isFinite(displayLimit)) return lignesFiltrees;
    return lignesFiltrees.slice(0, Math.max(0, displayLimit));
  }, [lignesFiltrees, displayLimit]);

  // Totaux de la vue filtrée (sur lignesFiltrees, pas limitées)
  const { totalRecettes, totalDepenses, solde } = useMemo(() => {
    let recettes = 0;
    let depenses = 0;

    lignesFiltrees.forEach((l) => {
      if (l.type === 'recette') recettes += Number(l.montant || 0);
      if (l.type === 'depense') depenses += Number(l.montant || 0);
    });

    return {
      totalRecettes: recettes,
      totalDepenses: depenses,
      solde: recettes - depenses,
    };
  }, [lignesFiltrees]);

  // KPI UX
  const missingInvoicesCount = useMemo(() => lignesFiltrees.filter((l) => !l.facture_url).length, [lignesFiltrees]);

  // Reset formulaire (inchangé)
  const resetForm = () => {
    setType('depense');
    setDate('');
    setMontant('');
    setLibelle('');
    setCategorie('');
    setCommentaire('');
    setFactureFile(null);
    setErrorForm(null);
    setErrorUpload(null);
    setSelectedPrevId('');
  };

  // Soumission formulaire (inchangé)
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatusForm('loading');
    setErrorForm(null);
    setErrorUpload(null);

    const montantNumber = Number(montant.replace(',', '.'));
    if (!montant || Number.isNaN(montantNumber) || montantNumber <= 0) {
      setErrorForm('Merci de saisir un montant valide.');
      setStatusForm('error');
      return;
    }

    if (!date) {
      setErrorForm('Merci de saisir une date.');
      setStatusForm('error');
      return;
    }

    let factureUrl: string | null = null;

    try {
      // 1) Upload facture si présente
      if (factureFile) {
        const ext = factureFile.name.split('.').pop();
        const fileName = `facture_${Date.now()}.${ext}`;
        const filePath = `${saison}/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('factures-bw').upload(filePath, factureFile, {
          cacheControl: '3600',
          upsert: false,
        });

        if (uploadError) {
          console.error('Erreur upload facture', uploadError);
          setErrorUpload("Échec de l'upload de la facture.");
          setStatusForm('error');
          return;
        }

        const { data: publicUrlData } = supabase.storage.from('factures-bw').getPublicUrl(filePath);
        factureUrl = publicUrlData?.publicUrl ?? null;
      }

      // 2) Insertion dans budget_lignes
      const { data: inserted, error: insertError } = await supabase
        .from('budget_lignes')
        .insert({
          date,
          saison,
          type,
          montant: montantNumber,
          designation: libelle.trim() || null,
          categorie: categorie.trim() || null,
          commentaire: commentaire.trim() || null,
          facture_url: factureUrl,
          previsionnel_id: selectedPrevId ? selectedPrevId : null,
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('Erreur insertion budget_lignes', insertError);
        setErrorForm("Impossible d'enregistrer le mouvement. Merci de réessayer un peu plus tard.");
        setStatusForm('error');
        return;
      }

      setLignes((prev) => [inserted as BudgetLigne, ...prev]);
      setStatusForm('success');
      setNotice('Mouvement enregistré avec succès.');
      resetForm();

      // UX: bascule automatiquement sur Mouvements après succès + ouvre la popup d’édition facture
      setActiveTab('moves');
      setOpenPrevModal(false);
      setOpenFreeModal(false);
      setSelectedLigneId(inserted?.id ?? null);
      setOpenEditModal(true);
    } catch (err) {
      console.error('Erreur inattendue formulaire budget', err);
      setErrorForm("Une erreur inattendue s'est produite. Merci de réessayer un peu plus tard.");
      setStatusForm('error');
    }
  };

  // ✅ upload + update facture_url sur une ligne existante (inchangé)
  const handleUploadFactureForSelected = async () => {
    if (!selectedLigne) return;
    if (!factureFileEdit) {
      setErrorFactureEdit('Merci de choisir un fichier.');
      return;
    }

    setStatusFactureEdit('loading');
    setErrorFactureEdit(null);

    try {
      const ext = factureFileEdit.name.split('.').pop();
      const safeExt = ext ? ext.toLowerCase() : 'pdf';
      const fileName = `ligne_${selectedLigne.id}_${Date.now()}.${safeExt}`;
      const filePath = `${selectedLigne.saison}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('factures-bw').upload(filePath, factureFileEdit, {
        cacheControl: '3600',
        upsert: false,
      });

      if (uploadError) {
        console.error('Erreur upload facture (edit)', uploadError);
        setErrorFactureEdit("Échec de l'upload de la facture.");
        setStatusFactureEdit('error');
        return;
      }

      const { data: publicUrlData } = supabase.storage.from('factures-bw').getPublicUrl(filePath);

      const factureUrl = publicUrlData?.publicUrl ?? null;
      if (!factureUrl) {
        setErrorFactureEdit("Impossible de récupérer l'URL publique.");
        setStatusFactureEdit('error');
        return;
      }

      const { error: updateError } = await supabase.from('budget_lignes').update({ facture_url: factureUrl }).eq('id', selectedLigne.id);

      if (updateError) {
        console.error('Erreur update budget_lignes.facture_url', updateError);
        setErrorFactureEdit("Impossible d'enregistrer l'URL de la facture.");
        setStatusFactureEdit('error');
        return;
      }

      setLignes((prev) => prev.map((x) => (x.id === selectedLigne.id ? { ...x, facture_url: factureUrl } : x)));

      setStatusFactureEdit('success');
      setFactureFileEdit(null);
    } catch (err) {
      console.error('Erreur inattendue upload facture (edit)', err);
      setErrorFactureEdit("Une erreur inattendue s'est produite. Merci de réessayer.");
      setStatusFactureEdit('error');
    }
  };

  // ✅ Suppression : confirmation + archivage + delete
const handleDeleteLigne = async (ligne: BudgetLigne) => {
  const ok = window.confirm(
    'Confirmer la suppression de cette ligne ?\n\nElle sera conservée dans l’historique des lignes supprimées.'
  );
  if (!ok) return;

  try {
    // 1) archive (⚠️ on n’envoie QUE les colonnes qui existent dans budget_lignes_supprimees)
    const archivePayload = {
      id: ligne.id,
      date: ligne.date ?? null,
      saison: ligne.saison ?? null,
      type: ligne.type ?? null,
      montant: Number(ligne.montant || 0),
      designation: ligne.designation ?? null,
      categorie: ligne.categorie ?? null,
      commentaire: ligne.commentaire ?? null,
      facture_url: ligne.facture_url ?? null,
      previsionnel_id: ligne.previsionnel_id ?? null,
      created_at: ligne.created_at ?? null,
      deleted_at: new Date().toISOString(),
      deleted_by: null, // optionnel (si tu veux le user id plus tard)
      deleted_reason: 'suppression_ui',
    };

    const { error: archiveError } = await supabase
      .from('budget_lignes_supprimees')
      .upsert(archivePayload, { onConflict: 'id', ignoreDuplicates: true });

    if (archiveError) {
      console.error('Erreur archive budget_lignes_supprimees', archiveError);
      setNotice("Impossible d'archiver la ligne. Suppression annulée ; vous pouvez réessayer.");
      window.alert("Impossible d'archiver la ligne supprimée. Suppression annulée.");
      return;
    }


    // 2) delete
    const { error: delError } = await supabase
      .from('budget_lignes')
      .delete()
      .eq('id', ligne.id);

    if (delError) {
      console.error('Erreur suppression budget_lignes', delError);
      setNotice('Impossible de supprimer le mouvement. Réessayez.');
      window.alert("Impossible de supprimer la ligne. Merci de réessayer.");
      return;
    }

    // 3) UI state
    setLignes((prev) => prev.filter((x) => x.id !== ligne.id));
    setNotice('Mouvement supprimé et conservé dans l’historique.');
    if (selectedLigneId === ligne.id) {
      setSelectedLigneId(null);
      setOpenEditModal(false);
      setFactureFileEdit(null);
      setStatusFactureEdit('idle');
      setErrorFactureEdit(null);
    }
  } catch (e) {
    console.error('Erreur inattendue suppression', e);
    setNotice("La suppression a échoué. Réessayez.");
    window.alert("Une erreur inattendue s'est produite.");
  }
};


  const resetFilters = () => {
    setFilterSeason('toutes');
    setFilterType('tous');
    setFilterCategory('toutes');
    setSearch('');
    setOnlyMissingInvoices(false);
    setDisplayLimit(100);
    setSortBy('date-desc');
  };

  // -----------------------------
  // ✅ NOUVELLE UX SAISIE (POPUPS)
  // -----------------------------
  const [saisieSeason, setSaisieSeason] = useState<string>(saison);

  // ✅ filtre "Dépenses prévues" / "Recettes prévues" (Saisie guidée)
  const [saisieType, setSaisieType] = useState<BudgetType>('depense');
  const [saisieCategory, setSaisieCategory] = useState('toutes');

  // Liste des lignes prévisionnelles > 0 (selon saison + type)
  const prevPrevusPositifsSaison = useMemo(() => {
    return previsionnelAll
      .filter((p) => p.saison === saisieSeason && p.type === saisieType && (saisieCategory === 'toutes' || p.categorie === saisieCategory) && Number(p.montant_prevu || 0) > 0)
      .sort((a, b) => {
        const ca = (a.categorie || '').localeCompare(b.categorie || '');
        if (ca !== 0) return ca;
        return (a.designation || '').localeCompare(b.designation || '');
      });
  }, [previsionnelAll, saisieSeason, saisieType, saisieCategory]);

  const [saisieSearch, setSaisieSearch] = useState<string>('');
  const prevPrevusPositifsFiltered = useMemo(() => {
    if (!saisieSearch.trim()) return prevPrevusPositifsSaison;
    const s = saisieSearch.toLowerCase();
    return prevPrevusPositifsSaison.filter((p) => {
      const t = `${p.categorie || ''} ${p.designation || ''}`.toLowerCase();
      return t.includes(s);
    });
  }, [prevPrevusPositifsSaison, saisieSearch]);

    // ✅ Sommes déjà saisies par ligne prévisionnelle (clé = previsionnel_id)
  const sumByPrevId = useMemo(() => {
    const m = new Map<string, number>();

    lignes.forEach((l) => {
      if (!l.previsionnel_id) return;
      const k = String(l.previsionnel_id);
      const current = m.get(k) ?? 0;
      m.set(k, current + Number(l.montant || 0));
    });

    return m;
  }, [lignes]);

  const getDejaSaisiForPrev = (prevId: string | number) => {
    return sumByPrevId.get(String(prevId)) ?? 0;
  };

  const getResteForPrev = (prev: PrevisionnelLigne) => {
  const prevu = Number(prev.montant_prevu || 0);
  const saisi = getDejaSaisiForPrev(prev.id);
  return prevu - saisi;
  };

  const getPercentForPrev = (prev: PrevisionnelLigne) => {
    const prevu = Number(prev.montant_prevu || 0);
    if (prevu <= 0) return 0;

    const saisi = getDejaSaisiForPrev(prev.id);
    return Math.round((saisi / prevu) * 100);
  };




  // Modal "prévu"
  const [openPrevModal, setOpenPrevModal] = useState<boolean>(false);
  const [selectedPrevRow, setSelectedPrevRow] = useState<PrevisionnelLigne | null>(null);

  // Modal "non prévu"
  const [openFreeModal, setOpenFreeModal] = useState<boolean>(false);

  const fileInputUploadRef = useRef<HTMLInputElement | null>(null);
  const fileInputCameraRef = useRef<HTMLInputElement | null>(null);

  const openModalForPrev = (row: PrevisionnelLigne) => {
    setStatusForm('idle');
    setErrorForm(null);
    setErrorUpload(null);

    setSelectedPrevRow(row);
    setOpenPrevModal(true);

    // pré-remplissage via states EXISTANTS (donc handleSubmit reste inchangé)
    setSaison(row.saison);
    setType(row.type); // ✅ suit bien dépense/recette
    setSelectedPrevId(String(row.id));
    setCategorie(row.categorie || '');
    setLibelle(row.designation || '');

    if (!date) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);
    }

    setMontant('');
    setCommentaire('');
    setFactureFile(null);
  };

  const openModalFree = () => {
    setStatusForm('idle');
    setErrorForm(null);
    setErrorUpload(null);

    setOpenFreeModal(true);
    setType(saisieType);
    setSaison(saisieSeason);
    setSelectedPrevRow(null);

    setSelectedPrevId('');
    setFactureFile(null);
    setMontant('');
    setCommentaire('');

    if (!date) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);
    }
  };

  // Référentiels: catégories dispo selon type
  const refCatsForType = useMemo(() => {
    return refCategories
      .filter((c) => c.actif && c.type === type)
      .sort((a, b) => (a.ordre ?? 1000) - (b.ordre ?? 1000));
  }, [refCategories, type]);

  // Map label -> id (pour lier designations)
  const categoryLabelToId = useMemo(() => {
    const m = new Map<string, string>();
    refCategories.forEach((c) => {
      if (c.label) m.set(c.label, c.id);
    });
    return m;
  }, [refCategories]);

  // Designations dispo selon catégorie choisie (et saison NULL ou saison courante)
  const refDesignationsForCategorie = useMemo(() => {
    const catId = categorie ? categoryLabelToId.get(categorie) : null;
    if (!catId) return [];

    const list = refDesignations.filter((d) => {
      if (!d.actif) return false;
      if (d.category_id !== catId) return false;
      if (d.saison === null) return true;
      return d.saison === saison;
    });

    return list.sort((a, b) => (a.ordre ?? 1000) - (b.ordre ?? 1000));
  }, [refDesignations, categorie, categoryLabelToId, saison]);

  useEffect(() => {
    if (!openFreeModal) return;
    if (!libelle) return;
    const ok = refDesignationsForCategorie.some((d) => d.label === libelle);
    if (!ok) setLibelle('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorie]);

  const [uiReady, setUiReady] = useState(false);
  const pendingLine = useRef<string | null>(null);
  const pendingScroll = useRef<{ page: number; moves: number; planned: number } | null>(null);
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('bw-budget-ui-v2') || '{}');
      if (saved.tab === 'new' || saved.tab === 'moves') setActiveTab(saved.tab);
      if (typeof saved.season === 'string') setFilterSeason(saved.season);
      if (['tous', 'depense', 'recette'].includes(saved.type)) setFilterType(saved.type);
      if (typeof saved.category === 'string') setFilterCategory(saved.category);
      if (typeof saved.search === 'string') setSearch(saved.search);
      if (typeof saved.missing === 'boolean') setOnlyMissingInvoices(saved.missing);
      if (['30', '100', '300', 'Infinity'].includes(saved.limit)) setDisplayLimit(Number(saved.limit));
      if (['date-desc', 'date-asc', 'amount-desc', 'amount-asc', 'category-asc', 'category-desc', 'designation-asc', 'designation-desc'].includes(saved.sort)) setSortBy(saved.sort);
      if (typeof saved.saisieSeason === 'string') { setSaisieSeason(saved.saisieSeason); setSaison(saved.saisieSeason); }
      if (saved.saisieType === 'recette' || saved.saisieType === 'depense') setSaisieType(saved.saisieType);
      if (typeof saved.saisieSearch === 'string') setSaisieSearch(saved.saisieSearch);
      if (typeof saved.saisieCategory === 'string') setSaisieCategory(saved.saisieCategory);
      if (saved.scroll && typeof saved.scroll.page === 'number') pendingScroll.current = saved.scroll;
    } catch { /* Storage may be unavailable or stale; keep usable defaults. */ }
    const applyParams = () => {
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view');
      if (view === 'new' || view === 'moves') setActiveTab(view);
      if (params.has('season')) {
        const season = params.get('season') || 'toutes';
        setFilterSeason(season);
        if (season !== 'toutes') { setSaisieSeason(season); setSaison(season); }
      }
      if (params.has('category')) {
        setFilterCategory(params.get('category') || 'toutes');
        setSaisieCategory(params.get('category') || 'toutes');
      }
      if (params.has('type')) {
        const kind = params.get('type');
        setFilterType(kind === 'depense' || kind === 'recette' ? kind : 'tous');
        if (kind === 'depense' || kind === 'recette') { setSaisieType(kind); setType(kind); }
      }
      if (params.has('missing')) setOnlyMissingInvoices(params.get('missing') === '1');
      pendingLine.current = params.get('line');
      if (pendingLine.current) setActiveTab('moves');
      if (params.size) pendingScroll.current = null;
      setUiReady(true);
    };
    applyParams();
    window.addEventListener('popstate', applyParams);
    return () => window.removeEventListener('popstate', applyParams);
  }, []);

  useEffect(() => {
    if (!uiReady) return;
    const save = () => {
      try {
        sessionStorage.setItem('bw-budget-ui-v2', JSON.stringify({
          tab: activeTab, season: filterSeason, type: filterType, category: filterCategory, search,
          missing: onlyMissingInvoices, limit: String(displayLimit), sort: sortBy,
          saisieSeason, saisieType, saisieSearch, saisieCategory,
          scroll: pendingScroll.current || {
            page: window.scrollY,
            moves: document.getElementById('budget-moves-list')?.scrollTop || 0,
            planned: document.getElementById('budget-planned-list')?.scrollTop || 0,
          },
        }));
      } catch { /* The page also works without session storage. */ }
    };
    save();
    window.addEventListener('scroll', save, true);
    window.addEventListener('pagehide', save);
    return () => { window.removeEventListener('scroll', save, true); window.removeEventListener('pagehide', save); };
  }, [uiReady, activeTab, filterSeason, filterType, filterCategory, search, onlyMissingInvoices, displayLimit, sortBy, saisieSeason, saisieType, saisieSearch, saisieCategory]);

  useEffect(() => {
    if (!uiReady || statusLoad !== 'success') return;
    const id = pendingLine.current;
    if (id) {
      pendingLine.current = null;
      if (lignes.some((line) => line.id === id)) {
        setSelectedLigneId(id);
        setStatusFactureEdit('idle');
        setErrorFactureEdit(null);
        setFactureFileEdit(null);
        setOpenEditModal(true);
      } else setNotice('Le mouvement demandé est introuvable ou inaccessible.');
    }
    if (!pendingScroll.current || (activeTab === 'new' && statusPrev !== 'success')) return;
    const scroll = pendingScroll.current;
    const frame = requestAnimationFrame(() => {
      window.scrollTo(0, scroll.page);
      const moves = document.getElementById('budget-moves-list');
      const planned = document.getElementById('budget-planned-list');
      if (moves) moves.scrollTop = scroll.moves || 0;
      if (planned) planned.scrollTop = scroll.planned || 0;
      pendingScroll.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [uiReady, statusLoad, statusPrev, lignes, activeTab]);

  const openMovement = (line: BudgetLigne) => {
    setSelectedLigneId(line.id);
    setStatusFactureEdit('idle');
    setErrorFactureEdit(null);
    setFactureFileEdit(null);
    setOpenEditModal(true);
  };
  const displayTotal = (value: number) => statusLoad === 'success' ? formatCurrency(value) : '—';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 [&_button]:min-h-11 [&_button]:min-w-11 [&_a]:min-h-11 [&_input:not([type=hidden])]:min-h-11 [&_select]:min-h-11 [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-2 [&_:focus-visible]:outline-cyan-700">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-10">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-3 border-b border-slate-200 pb-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-950 md:text-4xl">Gestion du budget</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                Consultez les mouvements, retrouvez leurs justificatifs ou saisissez une dépense / recette.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                id="budget-add"
                type="button"
                onClick={() => setActiveTab('new')}
                className={[
                  'rounded-full px-4 py-2 text-xs font-semibold transition',
                  'bg-cyan-700 text-white hover:bg-cyan-800',
                ].join(' ')}
              >
                + Ajouter un mouvement
              </button>

              <Link href="/bureau/previsionnel" className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Voir le prévisionnel →</Link>
            </div>
          </div>
        </header>
        <div role="status" aria-live="polite" className="mb-4 text-sm text-slate-700">
          {notice || (statusLoad === 'loading' ? 'Chargement des mouvements…' : '')}
        </div>
        {(statusLoad === 'error' || statusPrev === 'error' || statusRefs === 'error') && (
          <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            {statusLoad === 'error' && <p>Impossible de charger les mouvements. Les totaux ne sont pas disponibles.</p>}
            {statusPrev === 'error' && <p>Impossible de charger le prévisionnel.</p>}
            {statusRefs === 'error' && <p>Impossible de charger les catégories ou désignations.</p>}
            <button type="button" onClick={() => setRetryCount((count) => count + 1)} className="mt-2 rounded-xl border border-rose-300 bg-white px-4 font-semibold">Réessayer</button>
          </div>
        )}

        {/* KPI cards */}
        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-emerald-700">Solde (filtré)</div>
            <div className="mt-2 text-2xl font-semibold">{displayTotal(solde)}</div>
            <p className="mt-1 text-xs text-emerald-700/70">Basé sur les filtres actifs.</p>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-sky-700">Recettes</div>
            <div className="mt-2 text-xl font-semibold">{displayTotal(totalRecettes)}</div>
            <p className="mt-1 text-xs text-sky-700/70">Somme des recettes filtrées.</p>
          </div>

          <div className="rounded-2xl border border-rose-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-rose-700">Dépenses</div>
            <div className="mt-2 text-xl font-semibold">{displayTotal(totalDepenses)}</div>
            <p className="mt-1 text-xs text-rose-700/70">Somme des dépenses filtrées.</p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-amber-700">Factures manquantes</div>
            <div className="mt-2 text-xl font-semibold">{statusLoad === 'success' ? missingInvoicesCount : '—'}</div>
            <p className="mt-1 text-xs text-amber-700/70">Dans la vue filtrée.</p>
          </div>
        </section>

        <nav aria-label="Vues du budget" className="mb-6 flex gap-2 border-b border-slate-200">
          {([{ key: 'moves', label: 'Mouvements' }, { key: 'new', label: 'Saisie guidée' }] as const).map((tab) => (
            <button key={tab.key} type="button" aria-current={activeTab === tab.key ? 'page' : undefined} onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === tab.key ? 'border-cyan-700 text-cyan-800' : 'border-transparent text-slate-600 hover:text-slate-900'}`}>{tab.label}</button>
          ))}
        </nav>

        {/* TAB 1 - NEW */}
        {activeTab === 'new' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl shadow-black/10">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Saisie guidée</h2>
                <p className="mt-1 text-xs text-slate-600">
                  Choisissez une ligne prévue pour préremplir la saisie, ou ajoutez un mouvement non prévu. Photo ou import de facture, sans lecture automatique.
                </p>
              </div>
              {statusRefs === 'loading' && <p role="status" className="mt-3 text-sm text-slate-600">Chargement des catégories et désignations pour la saisie libre…</p>}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openModalFree}
                  disabled={statusRefs !== 'success'}
                  className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-60"
                >
                  + Dépense / recette non prévue
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 md:grid-cols-[0.9fr_1.2fr]">
                <div className="space-y-1">
                  <label htmlFor="saisie-season" className="text-sm font-medium text-slate-600">Saison</label>
                  <select
                    id="saisie-season"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-500"
                    value={saisieSeason}
                    onChange={(e) => {
                      setSaisieSeason(e.target.value);
                      setSaison(e.target.value);
                    }}
                  >
                    {Array.from(new Set([...SAISONS, saisieSeason])).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="saisie-search" className="text-sm font-medium text-slate-600">Recherche</label>
                  <input
                    id="saisie-search"
                    type="text"
                    placeholder="Catégorie / désignation…"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-500"
                    value={saisieSearch}
                    onChange={(e) => setSaisieSearch(e.target.value)}
                  />
                </div>
                <div className="mt-3">
                  <label htmlFor="saisie-category" className="mb-1 block text-sm font-medium text-slate-600">Catégorie prévue</label>
                  <select id="saisie-category" value={saisieCategory} onChange={(event) => setSaisieCategory(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
                    <option value="toutes">Toutes les catégories</option>
                    {Array.from(new Set([...previsionnelAll.map((row) => row.categorie), ...(saisieCategory !== 'toutes' ? [saisieCategory] : [])])).sort().map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSaisieType('depense')}
                    aria-pressed={saisieType === 'depense'}
                    className={[
                      'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                      saisieType === 'depense' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    Dépenses prévues
                  </button>

                  <button
                    type="button"
                    onClick={() => setSaisieType('recette')}
                    aria-pressed={saisieType === 'recette'}
                    className={[
                      'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                      saisieType === 'recette' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    Recettes prévues
                  </button>

                  <span>{statusPrev === 'success' ? `${prevPrevusPositifsFiltered.length} lignes` : 'Prévisionnel indisponible'}</span>
                </div>
                <div className="text-[11px] text-slate-500">Clique une ligne → popup de saisie (pré-rempli).</div>
              </div>
            </div>

            {/* Liste prévisionnel */}
            {(statusPrev === 'loading' || statusLoad === 'loading') && <p role="status" className="mt-4 text-sm text-slate-600">Chargement du prévisionnel et du réalisé…</p>}
            {statusPrev === 'success' && statusLoad === 'success' && <>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div id="budget-planned-list" className="max-h-[520px] overflow-auto text-sm">
                <div className="divide-y divide-slate-200 md:hidden">
                  {prevPrevusPositifsFiltered.map((row) => (
                    <article key={String(row.id)} className="space-y-3 p-4">
                      <div><p className="text-xs font-medium text-slate-600">{row.categorie}</p><h3 className="font-semibold">{row.designation}</h3></div>
                      <dl className="grid grid-cols-3 gap-2 text-xs">
                        <div><dt className="text-slate-600">Prévu</dt><dd className="mt-1 font-semibold">{formatCurrency0(row.montant_prevu)}</dd></div>
                        <div><dt className="text-slate-600">Déjà saisi</dt><dd className="mt-1 font-semibold">{formatCurrency0(getDejaSaisiForPrev(row.id))}</dd></div>
                        <div><dt className="text-slate-600">Reste</dt><dd className={`mt-1 font-semibold ${getResteForPrev(row) < 0 ? 'text-rose-700' : 'text-slate-900'}`}>{formatCurrency0(getResteForPrev(row))}</dd></div>
                      </dl>
                      <div className="flex items-center justify-between gap-3"><span className="text-xs text-slate-600">{getPercentForPrev(row)} % saisi</span><button type="button" onClick={() => openModalForPrev(row)} className="rounded-xl bg-cyan-700 px-4 py-2 font-semibold text-white">Saisir →</button></div>
                    </article>
                  ))}
                  {!prevPrevusPositifsFiltered.length && <p className="p-4 text-slate-600">Aucune ligne prévue positive pour ces filtres.</p>}
                </div>
                <table className="hidden min-w-full border-collapse md:table">
                  <thead className="sticky top-0 z-10 bg-white text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Catégorie</th>
                      <th className="px-3 py-2 text-left">Désignation</th>
                      <th className="px-3 py-2 text-right">Budget prévu</th>
                      <th className="px-3 py-2 text-right">Déja saisi</th>
                      <th className="px-3 py-2 text-right">Reste</th>
                      <th className="px-3 py-2 text-right">%</th>
                      <th className="px-3 py-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prevPrevusPositifsFiltered.map((p, idx) => (
                      <tr key={String(p.id)} className={[idx % 2 === 0 ? 'bg-slate-50' : 'bg-white', 'transition hover:bg-slate-100'].join(' ')}>
                        <td className="px-3 py-2 text-slate-800">{p.categorie || '—'}</td>
                        <td className="px-3 py-2 text-slate-800">{p.designation || '—'}</td>
                        <td
                          className={[
                            'whitespace-nowrap px-3 py-2 text-right font-semibold',
                            saisieType === 'recette' ? 'text-emerald-700' : 'text-rose-700',
                          ].join(' ')}
                        >
                          {formatCurrency0(Number(p.montant_prevu || 0))}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-700">
                          {formatCurrency0(getDejaSaisiForPrev(p.id))}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-semibold">
                          {(() => {
                            const reste = getResteForPrev(p);
                            return (
                              <span className={reste < 0 ? 'text-rose-700' : 'text-slate-800'}>
                                {formatCurrency0(reste)}
                              </span>
                            );
                          })()}
                        </td>
                        
                        
                        <td className="px-3 py-2 text-center">
                            {(() => {
                              const percent = getPercentForPrev(p);
                              const clamped = Math.max(0, Math.min(100, percent)); // barre max 100%

                              const tone =
                                percent < 70
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : percent < 100
                                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                                  : 'bg-rose-100 text-rose-800 border-rose-200';

                              const bar =
                                percent < 70
                                  ? 'bg-emerald-500'
                                  : percent < 100
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500';

                              return (
                                <div className="flex flex-col items-center gap-1">
                                  <span
                                    className={[
                                      'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                                      tone,
                                    ].join(' ')}
                                  >
                                    {percent} %
                                  </span>

                                  {/* barre discrète */}
                                  <div className="h-1 w-[70px] overflow-hidden rounded-full bg-slate-200">
                                    <div className={['h-full rounded-full', bar].join(' ')} style={{ width: `${clamped}%` }} />
                                  </div>
                                </div>
                              );
                            })()}
                          </td>




                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => openModalForPrev(p)}
                            className={[
                              'rounded-full px-3 py-1.5 text-[11px] font-semibold text-white',
                              'bg-cyan-700 hover:bg-cyan-800',
                            ].join(' ')}
                          >
                            Saisir →
                          </button>
                        </td>
                      </tr>
                    ))}

                    {prevPrevusPositifsFiltered.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-500">
                          Aucune ligne prévisionnelle &gt; 0 trouvée pour cette saison et ce type.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            </>}

            {/* Modal PREVU (fond blanc) */}
            <Modal
              open={openPrevModal}
              title={selectedPrevRow?.type === 'recette' ? 'Saisir une recette prévue' : 'Saisir une dépense prévue'}
              subtitle={selectedPrevRow ? `${selectedPrevRow.categorie} — ${selectedPrevRow.designation}` : undefined}
              onClose={() => {
                setOpenPrevModal(false);
                setSelectedPrevRow(null);
              }}
              variant="white"
            >
              {selectedPrevRow && (
                <div className="space-y-4">
                  {/* Résumé */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">{selectedPrevRow.saison}</span>
                      <span
                        className={[
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                          selectedPrevRow.type === 'recette' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700',
                        ].join(' ')}
                      >
                        Prévu : {formatCurrency0(Number(selectedPrevRow.montant_prevu || 0))}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        Catégorie : {selectedPrevRow.categorie}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        Désignation : {selectedPrevRow.designation}
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-500">Le rattachement au prévisionnel est automatique (previsionnel_id).</div>
                  </div>

                  {statusForm === 'error' && (errorForm || errorUpload) && (
                    <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                      {errorForm || 'La facture n’a pas pu être importée. Réessayez.'}
                      {errorUpload && <div className="mt-1 text-xs text-rose-700">Détail : {errorUpload}</div>}
                    </div>
                  )}
                  {statusForm === 'success' && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Mouvement enregistré avec succès.</div>
                  )}

                  <form onSubmit={handleSubmit} aria-busy={statusForm === 'loading'} className="space-y-4">
                    <p role="status" className="sr-only">{statusForm === 'loading' ? 'Enregistrement du mouvement…' : statusForm === 'success' ? 'Mouvement enregistré.' : ''}</p>
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-1.5">
                        <label htmlFor="planned-date" className="text-sm font-medium text-slate-700">Date</label>
                        <input
                          id="planned-date"
                          type="date"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-500"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="planned-type" className="text-sm font-medium text-slate-700">Type</label>
                        <select
                          id="planned-type"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-500"
                          value={type}
                          onChange={(e) => { setType(e.target.value as BudgetType); setSelectedPrevId(''); }}
                        >
                          <option value="depense">Dépense</option>
                          <option value="recette">Recette</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="planned-amount" className="text-sm font-medium text-slate-700">Montant (€)</label>
                        <input
                          id="planned-amount"
                          type="number"
                          step="0.01"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-500"
                          value={montant}
                          onChange={(e) => setMontant(e.target.value)}
                          placeholder="0,00"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <label htmlFor="planned-category" className="text-sm font-medium text-slate-700">Catégorie</label>
                        <input id="planned-category" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none" value={categorie} readOnly />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="planned-designation" className="text-sm font-medium text-slate-700">Désignation</label>
                        <input id="planned-designation" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none" value={libelle} readOnly />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="planned-comment" className="text-sm font-medium text-slate-700">Commentaire (optionnel)</label>
                      <textarea
                        id="planned-comment"
                        className="min-h-[70px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-500"
                        value={commentaire}
                        onChange={(e) => setCommentaire(e.target.value)}
                        placeholder="Détails utiles, références, fournisseur…"
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-slate-700">Facture (optionnel)</p>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputUploadRef.current?.click()}
                          className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-200"
                        >
                          Charger un fichier
                        </button>

                        <button
                          type="button"
                          onClick={() => fileInputCameraRef.current?.click()}
                          className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-200"
                        >
                          Prendre en photo
                        </button>

                        <span className="flex items-center text-[11px] text-slate-500">{factureFile ? `Fichier : ${factureFile.name}` : 'Aucun fichier sélectionné'}</span>
                      </div>

                      <input aria-label="Importer une facture prévue" ref={fileInputUploadRef} type="file" className="hidden" onChange={(e) => setFactureFile(e.target.files?.[0] ?? null)} accept=".pdf,image/*" />
                      <input
                        aria-label="Photographier une facture prévue"
                        ref={fileInputCameraRef}
                        type="file"
                        className="hidden"
                        onChange={(e) => setFactureFile(e.target.files?.[0] ?? null)}
                        accept="image/*"
                        capture="environment"
                      />

                      {errorUpload && <p className="text-[11px] text-rose-600">{errorUpload}</p>}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <button
                        type="submit"
                        disabled={statusForm === 'loading'}
                        className="inline-flex items-center justify-center rounded-xl bg-cyan-700 px-5 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {statusForm === 'loading' ? 'Enregistrement…' : 'Enregistrer'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setOpenPrevModal(false);
                          setSelectedPrevRow(null);
                          resetForm();
                        }}
                        className="inline-flex items-center justify-center rounded-full bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200"
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </Modal>

            {/* Modal NON PREVU (fond blanc) */}
            <Modal
              open={openFreeModal}
              title="Ajouter une dépense / recette non prévue"
              subtitle="Choisis une catégorie et une désignation depuis les référentiels, puis saisis le mouvement."
              onClose={() => setOpenFreeModal(false)}
              variant="white"
            >
              <div className="space-y-4">
                {statusForm === 'error' && (errorForm || errorUpload) && (
                  <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    {errorForm || 'La facture n’a pas pu être importée. Réessayez.'}
                    {errorUpload && <div className="mt-1 text-xs text-rose-700">Détail : {errorUpload}</div>}
                  </div>
                )}
                {statusForm === 'success' && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Mouvement enregistré avec succès.</div>
                )}

                <form onSubmit={handleSubmit} aria-busy={statusForm === 'loading'} className="space-y-4">
                  <p role="status" className="sr-only">{statusForm === 'loading' ? 'Enregistrement du mouvement…' : statusForm === 'success' ? 'Mouvement enregistré.' : ''}</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1.5">
                      <label htmlFor="free-season" className="text-sm font-medium text-slate-700">Saison</label>
                      <select
                        id="free-season"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-500"
                        value={saison}
                        onChange={(e) => { setSaison(e.target.value); setSelectedPrevId(''); }}
                      >
                        {SAISONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="free-date" className="text-sm font-medium text-slate-700">Date</label>
                      <input
                        id="free-date"
                        type="date"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-500"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="free-type" className="text-sm font-medium text-slate-700">Type</label>
                      <select
                        id="free-type"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-500"
                        value={type}
                        onChange={(e) => { setType(e.target.value as BudgetType); setSelectedPrevId(''); }}
                      >
                        <option value="depense">Dépense</option>
                        <option value="recette">Recette</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor="free-category" className="text-sm font-medium text-slate-700">Catégorie</label>
                      <select
                        id="free-category"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-500"
                        value={categorie}
                        onChange={(e) => setCategorie(e.target.value)}
                      >
                        <option value="">— Choisir —</option>
                        {refCatsForType.map((c) => (
                          <option key={c.id} value={c.label}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500">Liste provenant de budget_categories (actifs) filtrée sur le type.</p>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="free-designation" className="text-sm font-medium text-slate-700">Désignation</label>
                      <select
                        id="free-designation"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-500"
                        value={libelle}
                        onChange={(e) => setLibelle(e.target.value)}
                        disabled={!categorie}
                      >
                        <option value="">{categorie ? '— Choisir —' : 'Choisir une catégorie d’abord'}</option>
                        {refDesignationsForCategorie.map((d) => (
                          <option key={d.id} value={d.label}>
                            {d.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500">Liste provenant de budget_designations (actifs), saison NULL ou saison courante.</p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor="free-amount" className="text-sm font-medium text-slate-700">Montant (€)</label>
                      <input
                        id="free-amount"
                        type="number"
                        step="0.01"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-500"
                        value={montant}
                        onChange={(e) => setMontant(e.target.value)}
                        placeholder="0,00"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="free-comment" className="text-sm font-medium text-slate-700">Commentaire (optionnel)</label>
                      <input
                        id="free-comment"
                        type="text"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-500"
                        value={commentaire}
                        onChange={(e) => setCommentaire(e.target.value)}
                        placeholder="Détails utiles…"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">Facture (optionnel)</p>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputUploadRef.current?.click()}
                        className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-200"
                      >
                        Charger un fichier
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputCameraRef.current?.click()}
                        className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-200"
                      >
                        Prendre en photo
                      </button>

                      <span className="flex items-center text-[11px] text-slate-500">{factureFile ? `Fichier : ${factureFile.name}` : 'Aucun fichier sélectionné'}</span>
                    </div>

                    <input aria-label="Importer une facture non prévue" ref={fileInputUploadRef} type="file" className="hidden" onChange={(e) => setFactureFile(e.target.files?.[0] ?? null)} accept=".pdf,image/*" />
                    <input
                      aria-label="Photographier une facture non prévue"
                      ref={fileInputCameraRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => setFactureFile(e.target.files?.[0] ?? null)}
                      accept="image/*"
                      capture="environment"
                    />

                    {errorUpload && <p className="text-[11px] text-rose-600">{errorUpload}</p>}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={statusForm === 'loading'}
                      className="inline-flex items-center justify-center rounded-xl bg-cyan-700 px-5 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {statusForm === 'loading' ? 'Enregistrement…' : 'Enregistrer'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOpenFreeModal(false);
                        resetForm();
                      }}
                      className="inline-flex items-center justify-center rounded-full bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200"
                    >
                      Annuler
                    </button>
                  </div>

                  <input type="hidden" value={selectedPrevId} readOnly />
                </form>
              </div>
            </Modal>
          </section>
        )}

        {/* TAB 2 - MOVES (full width + delete + popup edit facture) */}
        {activeTab === 'moves' && (
          <section className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Mouvements</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {statusLoad !== 'success' ? (statusLoad === 'error' ? 'Mouvements indisponibles' : 'Chargement…') : `${lignesFiltrees.length} mouvements (filtrés)`}
                  {statusLoad === 'success' && Number.isFinite(displayLimit) && (
                    <>
                      {' '}
                      · affichage : {lignesAffichees.length} / {lignesFiltrees.length}
                    </>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-sm text-slate-600">Détails / facture : consulter et ajouter ou remplacer le justificatif. La suppression est confirmée et archivée.</span>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="space-y-1">
                  <label htmlFor="moves-season" className="text-sm font-medium text-slate-700">Saison</label>
                  <select
                    id="moves-season"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={filterSeason}
                    onChange={(e) => setFilterSeason(e.target.value)}
                  >
                    <option value="toutes">Toutes</option>
                    {Array.from(new Set([...saisonsDisponibles, ...(filterSeason !== 'toutes' ? [filterSeason] : [])])).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="moves-type" className="text-sm font-medium text-slate-700">Type</label>
                  <select
                    id="moves-type"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as 'tous' | BudgetType)}
                  >
                    <option value="tous">Tous</option>
                    <option value="recette">Recettes</option>
                    <option value="depense">Dépenses</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="moves-category" className="text-sm font-medium text-slate-700">Catégorie</label>
                  <select
                    id="moves-category"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option value="toutes">Toutes</option>
                    {Array.from(new Set([...categoriesDisponibles, ...(filterCategory !== 'toutes' ? [filterCategory] : [])])).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label htmlFor="moves-search" className="text-sm font-medium text-slate-700">Recherche</label>
                  <input
                    id="moves-search"
                    type="text"
                    placeholder="Libellé, catégorie, commentaire…"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOnlyMissingInvoices((v) => !v)}
                    aria-pressed={onlyMissingInvoices}
                    className={[
                      'rounded-full px-4 py-2 text-xs font-semibold transition',
                      onlyMissingInvoices ? 'bg-amber-100 text-amber-900 ring-1 ring-amber-400' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100',
                    ].join(' ')}
                  >
                    {onlyMissingInvoices ? '✓ Factures manquantes' : 'Factures manquantes'}
                  </button>

                  <div className="flex items-center gap-2 text-sm">
                    <label htmlFor="moves-limit" className="text-slate-700">Afficher</label>
                    <select
                      id="moves-limit"
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                      value={String(displayLimit)}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === 'Infinity') setDisplayLimit(Number.POSITIVE_INFINITY);
                        else setDisplayLimit(Number(v));
                      }}
                    >
                      <option value="30">30</option>
                      <option value="100">100</option>
                      <option value="300">300</option>
                      <option value="Infinity">Tout</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <label htmlFor="moves-sort">Trier</label>
                    <select id="moves-sort" value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2">
                      <option value="date-desc">Date : récentes d’abord</option><option value="date-asc">Date : anciennes d’abord</option>
                      <option value="amount-desc">Montant décroissant</option><option value="amount-asc">Montant croissant</option>
                      <option value="category-asc">Catégorie A → Z</option><option value="category-desc">Catégorie Z → A</option>
                      <option value="designation-asc">Désignation A → Z</option><option value="designation-desc">Désignation Z → A</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="emerald">Recettes {displayTotal(totalRecettes)}</Pill>
                  <Pill tone="rose">Dépenses {displayTotal(totalDepenses)}</Pill>
                  <Pill tone="slate">Solde {displayTotal(solde)}</Pill>
                </div>
              </div>
            </div>

            {/* Table FULL WIDTH */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div id="budget-moves-list" className="max-h-[640px] overflow-auto text-sm">
                {statusLoad === 'success' && <div className="divide-y divide-slate-200 md:hidden">
                  {lignesAffichees.map((line) => (
                    <article key={line.id} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><p className="text-xs text-slate-600">{formatDate(line.date)} · {line.saison}</p><h3 className="mt-1 break-words font-semibold">{line.designation || 'Sans désignation'}</h3><p className="mt-1 break-words text-sm text-slate-600">{line.categorie || 'Sans catégorie'}</p></div>
                        <strong className={`shrink-0 ${line.type === 'recette' ? 'text-emerald-800' : 'text-rose-800'}`}>{formatCurrency(Number(line.montant))}</strong>
                      </div>
                      <div className="flex flex-wrap gap-2"><Pill tone={line.type === 'recette' ? 'emerald' : 'rose'}>{line.type === 'recette' ? 'Recette' : 'Dépense'}</Pill>{!line.facture_url && <Pill tone="amber">Facture manquante</Pill>}{line.commentaire && <Pill>Note</Pill>}</div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => openMovement(line)} className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 font-semibold text-cyan-800">Détails / facture</button>
                        {line.facture_url && <a href={line.facture_url} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-xl border border-slate-300 px-3 py-2 font-semibold">Ouvrir la facture ↗</a>}
                        <button type="button" onClick={() => handleDeleteLigne(line)} aria-label={`Supprimer ${line.designation || 'le mouvement'} du ${formatDate(line.date)}`} className="rounded-xl border border-rose-200 px-3 py-2 text-rose-800">Supprimer</button>
                      </div>
                    </article>
                  ))}
                  {!lignesAffichees.length && <p className="p-5 text-slate-600">Aucun mouvement ne correspond aux filtres sélectionnés.</p>}
                </div>}
                <table className="hidden min-w-full border-collapse md:table">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Saison</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Catégorie</th>
                      <th className="px-3 py-2 text-left">Désignation</th>
                      <th className="px-3 py-2 text-right">Montant</th>
                      <th className="px-3 py-2 text-center w-[90px]">Facture</th>
                      <th className="px-3 py-2 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statusLoad === 'success' && lignesAffichees.map((l, idx) => {
                      const hasInvoice = !!l.facture_url;

                      return (
                        <tr
                          key={l.id}
                          onClick={() => openMovement(l)}
                          className={[idx % 2 === 0 ? 'bg-white' : 'bg-slate-50', 'cursor-pointer transition hover:bg-cyan-50'].join(' ')}
                          title="Consulter les détails / gérer la facture"
                        >
                          <td className="whitespace-nowrap px-3 py-2 text-slate-800">{formatDate(l.date)}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-slate-600">{l.saison}</td>
                          <td className="px-3 py-2">
                            <Pill tone={l.type === 'recette' ? 'emerald' : 'rose'}>{l.type === 'recette' ? 'Recette' : 'Dépense'}</Pill>
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            <div className="flex items-center justify-between gap-2">
                              <span className="min-w-0 truncate">{l.categorie || '-'}</span>
                              {!hasInvoice && (
                                <span className="shrink-0">
                                  <Pill tone="amber">Facture ?</Pill>
                                </span>
                              )}
                            </div>
                          </td>              
                          <td className="px-3 py-2 text-slate-900">
                            <div className="flex items-center justify-between gap-2">
                              <span className="min-w-0 truncate">
                                {l.designation || '-'}
                              </span>

                              {l.commentaire && (
                                <span className="shrink-0">
                                  <Pill tone="slate">Note</Pill>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-right font-semibold">
                            <span className={l.type === 'recette' ? 'text-emerald-800' : 'text-rose-800'}>{formatCurrency(Number(l.montant || 0))}</span>
                          </td>
                          <td className="px-3 py-2 text-center w-[90px]">
                            {l.facture_url ? (
                              <a
                                href={l.facture_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Voir
                              </a>
                            ) : (
                              <span className="text-[11px] text-slate-500">—</span>
                            )}
                          </td>

                          {/* Corbeille */}
                          <td className="px-3 py-2 text-center">
                            <button type="button" onClick={(event) => { event.stopPropagation(); openMovement(l); }} className="rounded-xl px-3 py-2 font-semibold text-cyan-800">Détails / facture</button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLigne(l);
                              }}
                              className="inline-flex items-center justify-center rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100"
                              aria-label={`Supprimer ${l.designation || 'le mouvement'} du ${formatDate(l.date)}`}
                              title="Supprimer cette ligne"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {statusLoad === 'success' && lignesAffichees.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-xs text-slate-400">
                          Aucun mouvement ne correspond aux filtres sélectionnés.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {statusLoad === 'success' && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                <span>
                  {lignesAffichees.length} affichées · {lignesFiltrees.length} filtrées
                  {missingInvoicesCount > 0 && (
                    <>
                      {' '}
                      · <span className="text-amber-800">{missingInvoicesCount} sans facture</span>
                    </>
                  )}
                </span>

                <div className="flex flex-wrap gap-3 text-right">
                  <span>
                    Recettes : <span className="font-semibold text-emerald-800">{formatCurrency(totalRecettes)}</span>
                  </span>
                  <span>
                    Dépenses : <span className="font-semibold text-rose-800">{formatCurrency(totalDepenses)}</span>
                  </span>
                  <span>
                    Solde : <span className="font-semibold text-slate-900">{formatCurrency(solde)}</span>
                  </span>
                </div>
              </div>}
            </div>

            {/* Popup EDIT (fond blanc) */}
            <Modal
              open={openEditModal}
              title="Détails du mouvement · facture"
              subtitle={selectedLigne ? `${formatDate(selectedLigne.date)} • ${selectedLigne.saison} • ${selectedLigne.categorie || '—'} • ${selectedLigne.designation || '—'}` : undefined}
              onClose={() => {
                setOpenEditModal(false);
                setFactureFileEdit(null);
                setStatusFactureEdit('idle');
                setErrorFactureEdit(null);
              }}
              variant="white"
            >
              {selectedLigne ? (
                <div className="space-y-4">
                  {/* Détail (même disposition que le panneau actuel) */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        {formatDate(selectedLigne.date)}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        {selectedLigne.saison}
                      </span>
                      <span
                        className={[
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                          selectedLigne.type === 'recette' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700',
                        ].join(' ')}
                      >
                        {selectedLigne.type === 'recette' ? 'Recette' : 'Dépense'}
                      </span>
                      {!selectedLigne.facture_url ? (
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          Facture manquante
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700">
                          Facture OK
                        </span>
                      )}
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">Catégorie</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{selectedLigne.categorie || '—'}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">Désignation</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{selectedLigne.designation || '—'}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">Montant</div>
                        <div className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(Number(selectedLigne.montant || 0))}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide text-slate-500">Commentaire</div>
                        <div className="mt-1 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800">
                          {selectedLigne.commentaire?.trim() ? selectedLigne.commentaire : '—'}
                        </div>
                      </div>
                    </div>

                    {selectedLigne.facture_url && (
                      <a
                        href={selectedLigne.facture_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        Ouvrir la facture
                      </a>
                    )}
                  </div>

                  {/* Upload facture (même fonctionnement, même disposition, mais fond blanc) */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Facture sur ce mouvement</div>

                    <div className="mt-3 flex flex-col gap-2">
                      <label htmlFor="edit-invoice" className="text-sm font-medium text-slate-800">Importer une facture (PDF ou image)</label>
                      <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800">
                        <span className="max-w-[220px] truncate">{factureFileEdit ? factureFileEdit.name : 'Choisir une facture (PDF / image)'}</span>
                        <input id="edit-invoice" type="file" className="mt-2 block w-full min-w-0 text-sm file:mr-2 file:rounded-lg file:border-0 file:bg-cyan-50 file:p-3 file:text-cyan-800" onChange={(e) => setFactureFileEdit(e.target.files?.[0] ?? null)} accept=".pdf,image/*" />
                      </div>

                      <button
                        type="button"
                        disabled={!factureFileEdit || statusFactureEdit === 'loading'}
                        onClick={handleUploadFactureForSelected}
                        className="inline-flex items-center justify-center rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {statusFactureEdit === 'loading' ? 'Upload…' : selectedLigne?.facture_url ? 'Remplacer la facture' : 'Ajouter la facture'}
                      </button>

                      {statusFactureEdit === 'success' && (
                        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Facture enregistrée.</div>
                      )}
                      {statusFactureEdit === 'error' && errorFactureEdit && (
                        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{errorFactureEdit}</div>
                      )}
                      <p role="status" className="sr-only">{statusFactureEdit === 'loading' ? 'Import de la facture en cours…' : ''}</p>
                    </div>
                  </div>

                  {/* Actions bas de popup */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenEditModal(false);
                        setFactureFileEdit(null);
                        setStatusFactureEdit('idle');
                        setErrorFactureEdit(null);
                      }}
                      className="rounded-full bg-slate-100 px-5 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200"
                    >
                      Fermer
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteLigne(selectedLigne)}
                      className="rounded-full bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-500"
                      title="Supprimer (avec archivage)"
                    >
                      Supprimer 🗑️
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-600">Sélectionne une ligne.</div>
              )}
            </Modal>
          </section>
        )}
      </div>
    </div>
  );
}
