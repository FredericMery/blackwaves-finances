'use client';

import React, { useEffect, useMemo, useState, FormEvent, useRef } from 'react';
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

function TabButton({
  active,
  onClick,
  title,
  subtitle,
  tone = 'pink',
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  tone?: 'pink' | 'sky';
}) {
  const dot =
    tone === 'pink'
      ? active
        ? 'bg-pink-500'
        : 'bg-slate-600 group-hover:bg-slate-500'
      : active
      ? 'bg-sky-500'
      : 'bg-slate-600 group-hover:bg-slate-500';

  const border =
    tone === 'pink'
      ? active
        ? 'border-pink-500/40'
        : 'border-white/10'
      : active
      ? 'border-sky-500/40'
      : 'border-white/10';

  const glow =
    tone === 'pink'
      ? active
        ? 'shadow-pink-500/10'
        : 'shadow-black/0'
      : active
      ? 'shadow-sky-500/10'
      : 'shadow-black/0';

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group w-full rounded-2xl border p-4 text-left transition',
        active ? `bg-slate-950/50 shadow-lg ${glow}` : 'bg-slate-900/40 hover:bg-slate-900/60',
        border,
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={['text-sm font-semibold', active ? 'text-white' : 'text-slate-100'].join(' ')}>{title}</div>
          <div className="mt-1 text-xs text-slate-300">{subtitle}</div>
        </div>
        <div className={['mt-0.5 h-2.5 w-2.5 rounded-full transition', dot].join(' ')} />
      </div>
    </button>
  );
}

function Pill({
  children,
  tone = 'slate',
}: {
  children: React.ReactNode;
  tone?: 'slate' | 'emerald' | 'rose' | 'sky' | 'amber';
}) {
  const cls =
    tone === 'emerald'
      ? 'bg-emerald-900/60 text-emerald-200 border-emerald-500/20'
      : tone === 'rose'
      ? 'bg-rose-900/60 text-rose-200 border-rose-500/20'
      : tone === 'sky'
      ? 'bg-sky-900/60 text-sky-200 border-sky-500/20'
      : tone === 'amber'
      ? 'bg-amber-900/60 text-amber-200 border-amber-500/20'
      : 'bg-slate-800/60 text-slate-200 border-white/10';

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
  variant = 'dark',
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  variant?: 'dark' | 'white';
}) {
  if (!open) return null;

  const isWhite = variant === 'white';

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 p-4">
      <div
        className={[
          'w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border shadow-2xl shadow-black/60',
          isWhite ? 'border-slate-200 bg-white' : 'border-white/10 bg-slate-950',
        ].join(' ')}
      >
        <div
          className={[
            'flex items-start justify-between gap-4 border-b px-5 py-4',
            isWhite ? 'border-slate-200 bg-white' : 'border-white/10 bg-slate-900/40',
          ].join(' ')}
        >
          <div>
            <div className={['text-base font-semibold', isWhite ? 'text-slate-900' : 'text-white'].join(' ')}>{title}</div>
            {subtitle && <div className={['mt-1 text-xs', isWhite ? 'text-slate-600' : 'text-slate-300'].join(' ')}>{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={[
              'rounded-full px-3 py-1.5 text-xs font-semibold',
              isWhite ? 'bg-slate-100 text-slate-900 hover:bg-slate-200' : 'bg-slate-800/60 text-slate-100 hover:bg-slate-700/60',
            ].join(' ')}
          >
            Fermer
          </button>
        </div>

        <div className={['px-5 py-4 overflow-auto max-h-[calc(90vh-110px)]', isWhite ? 'bg-white' : ''].join(' ')}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function BudgetPage() {
  // ✅ Étape 4 : état global du prévisionnel (toutes saisons) + chargement au montage
  const [previsionnelAll, setPrevisionnelAll] = useState<PrevisionnelLigne[]>([]);

  useEffect(() => {
    const loadAllPrev = async () => {
      const { data, error } = await supabase
        .from('budget_previsionnel')
        .select('*')
        .order('saison', { ascending: false })
        .order('categorie', { ascending: true });

      if (error) {
        console.error('Erreur chargement budget_previsionnel (all)', error);
        setPrevisionnelAll([]);
        return;
      }

      setPrevisionnelAll(
        (data || []).map((row: any) => ({
          id: row.id,
          saison: row.saison,
          type: row.type as BudgetType,
          categorie: row.categorie,
          designation: row.designation,
          montant_prevu: Number(row.montant_prevu || 0),
        }))
      );
    };

    loadAllPrev();
  }, []);

  // UI tabs (UX only)
  const [activeTab, setActiveTab] = useState<TabKey>('new');

  // Formulaire (mêmes states qu’avant)
  const [type, setType] = useState<BudgetType>('depense');
  const [date, setDate] = useState<string>('');
  const [saison, setSaison] = useState<string>('2025-2026');
  const [montant, setMontant] = useState<string>('');
  const [libelle, setLibelle] = useState<string>('');
  const [categorie, setCategorie] = useState<string>('');
  const [commentaire, setCommentaire] = useState<string>('');
  const [factureFile, setFactureFile] = useState<File | null>(null);

  // Lignes de budget prévisionnel disponibles (filtrées sur saison sélectionnée)
  const [previsionnelLignes, setPrevisionnelLignes] = useState<PrevisionnelLigne[]>([]);
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
    };

    loadRefs();
  }, []);

  // Chargement initial des mouvements
  useEffect(() => {
    const load = async () => {
      setStatusLoad('loading');
      const { data, error } = await supabase.from('budget_lignes').select('*').order('date', { ascending: false });

      if (error) {
        console.error('Erreur chargement budget_lignes', error);
        setStatusLoad('error');
        return;
      }
      setLignes((data || []) as BudgetLigne[]);
      setStatusLoad('success');
    };

    load();
  }, []);

  // Chargement des lignes de prévisionnel pour la saison choisie
  useEffect(() => {
    const loadPrev = async () => {
      const { data, error } = await supabase
        .from('budget_previsionnel')
        .select('*')
        .eq('saison', saison)
        .order('categorie', { ascending: true });

      if (error) {
        console.error('Erreur chargement budget_previsionnel', error);
        setPrevisionnelLignes([]);
        return;
      }

      setPrevisionnelLignes(
        (data || []).map((row: any) => ({
          id: row.id,
          saison: row.saison,
          type: row.type as BudgetType,
          categorie: row.categorie,
          designation: row.designation,
          montant_prevu: Number(row.montant_prevu || 0),
        }))
      );
    };

    loadPrev();
    setSelectedPrevId('');
  }, [saison]);

  // Lignes de prévisionnel filtrées pour le formulaire (saison + type)
  const previsionnelPourFormulaire = useMemo(() => previsionnelLignes.filter((l) => l.type === type), [previsionnelLignes, type]);

  // Quand on change de type, on réinitialise la sélection prévisionnelle
  useEffect(() => {
    setSelectedPrevId('');
  }, [type]);

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
    });
  }, [lignes, filterSeason, filterType, filterCategory, search, onlyMissingInvoices]);

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

  // Sélection d'une ligne de prévisionnel → remplissage catégorie + libellé (inchangé)
  const handleSelectPrevisionnel = (idStr: string) => {
    setSelectedPrevId(idStr);
    const ligne = previsionnelPourFormulaire.find((l) => String(l.id) === idStr);
    if (ligne) {
      setCategorie(ligne.categorie || '');
      setLibelle(ligne.designation || '');
    }
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
      resetForm();

      // UX: bascule automatiquement sur Mouvements après succès + ouvre la popup d’édition facture
      setActiveTab('moves');
      setSelectedLigneId((inserted as any)?.id ?? null);
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
      created_at: (ligne as any).created_at ?? null, // si présent
      deleted_at: new Date().toISOString(),
      deleted_by: null, // optionnel (si tu veux le user id plus tard)
      deleted_reason: 'suppression_ui',
    };

    const { error: archiveError } = await supabase
      .from('budget_lignes_supprimees')
      .upsert(archivePayload, { onConflict: 'id', ignoreDuplicates: true });

    if (archiveError) {
      console.error('Erreur archive budget_lignes_supprimees', archiveError);
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
      window.alert("Impossible de supprimer la ligne. Merci de réessayer.");
      return;
    }

    // 3) UI state
    setLignes((prev) => prev.filter((x) => x.id !== ligne.id));
    if (selectedLigneId === ligne.id) {
      setSelectedLigneId(null);
      setOpenEditModal(false);
      setFactureFileEdit(null);
      setStatusFactureEdit('idle');
      setErrorFactureEdit(null);
    }
  } catch (e) {
    console.error('Erreur inattendue suppression', e);
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
  };

  // -----------------------------
  // ✅ NOUVELLE UX SAISIE (POPUPS)
  // -----------------------------
  const [saisieSeason, setSaisieSeason] = useState<string>(saison);
  useEffect(() => {
    setSaisieSeason(saison);
  }, [saison]);

  // ✅ filtre "Dépenses prévues" / "Recettes prévues" (Saisie guidée)
  const [saisieType, setSaisieType] = useState<BudgetType>('depense');

  // Liste des lignes prévisionnelles > 0 (selon saison + type)
  const prevPrevusPositifsSaison = useMemo(() => {
    return previsionnelAll
      .filter((p) => p.saison === saisieSeason && p.type === saisieType && Number(p.montant_prevu || 0) > 0)
      .sort((a, b) => {
        const ca = (a.categorie || '').localeCompare(b.categorie || '');
        if (ca !== 0) return ca;
        return (a.designation || '').localeCompare(b.designation || '');
      });
  }, [previsionnelAll, saisieSeason, saisieType]);

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-10">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-3 border-b border-white/5 pb-6">
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-400">Espace bureau • finances</div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white md:text-4xl">Gestion du budget</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Saisie guidée via budget prévisionnel + consultation avancée. Clique un mouvement pour gérer la facture.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('new')}
                className={[
                  'rounded-full px-4 py-2 text-xs font-semibold transition',
                  activeTab === 'new' ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30' : 'bg-slate-800/60 text-slate-200 hover:bg-slate-700/60',
                ].join(' ')}
              >
                + Saisie
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('moves')}
                className={[
                  'rounded-full px-4 py-2 text-xs font-semibold transition',
                  activeTab === 'moves' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30' : 'bg-slate-800/60 text-slate-200 hover:bg-slate-700/60',
                ].join(' ')}
              >
                Mouvements
              </button>

              {activeTab === 'moves' && (
                <button type="button" onClick={resetFilters} className="rounded-full bg-slate-800/60 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700/60">
                  Reset filtres
                </button>
              )}
            </div>
          </div>
        </header>

        {/* KPI cards */}
        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/40 via-emerald-900/10 to-slate-950/80 p-4 shadow-lg shadow-emerald-900/40">
            <div className="text-xs font-medium uppercase tracking-wide text-emerald-300">Solde (filtré)</div>
            <div className="mt-2 text-2xl font-semibold">{formatCurrency(solde)}</div>
            <p className="mt-1 text-xs text-emerald-100/80">Basé sur les filtres actifs.</p>
          </div>

          <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-900/40 via-sky-900/10 to-slate-950/80 p-4 shadow-lg shadow-sky-900/40">
            <div className="text-xs font-medium uppercase tracking-wide text-sky-300">Recettes</div>
            <div className="mt-2 text-xl font-semibold">{formatCurrency(totalRecettes)}</div>
            <p className="mt-1 text-xs text-sky-100/80">Somme des recettes filtrées.</p>
          </div>

          <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-900/40 via-rose-900/10 to-slate-950/80 p-4 shadow-lg shadow-rose-900/40">
            <div className="text-xs font-medium uppercase tracking-wide text-rose-300">Dépenses</div>
            <div className="mt-2 text-xl font-semibold">{formatCurrency(totalDepenses)}</div>
            <p className="mt-1 text-xs text-rose-100/80">Somme des dépenses filtrées.</p>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-900/40 via-amber-900/10 to-slate-950/80 p-4 shadow-lg shadow-amber-900/40">
            <div className="text-xs font-medium uppercase tracking-wide text-amber-300">Factures manquantes</div>
            <div className="mt-2 text-xl font-semibold">{missingInvoicesCount}</div>
            <p className="mt-1 text-xs text-amber-100/80">Dans la vue filtrée.</p>
          </div>
        </section>

        {/* Tabs cards */}
        <section className="mb-6 grid gap-3 md:grid-cols-2">
          <TabButton tone="pink" active={activeTab === 'new'} onClick={() => setActiveTab('new')} title="Saisie" subtitle="Sélectionne une dépense prévue ou ajoute une dépense non prévue." />
          <TabButton tone="sky" active={activeTab === 'moves'} onClick={() => setActiveTab('moves')} title="Mouvements" subtitle="Filtrer, consulter, cliquer une ligne → popup + facture." />
        </section>

        {/* TAB 1 - NEW */}
        {activeTab === 'new' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl shadow-black/10">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Saisie guidée</h2>
                <p className="mt-1 text-xs text-slate-600">
                  Clique une ligne prévue pour saisir un mouvement en 10 secondes. Sinon, ajoute un mouvement non prévu (catégories/désignations référentielles).
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openModalFree}
                  className="rounded-full bg-pink-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-pink-500/20 hover:bg-pink-400"
                >
                  + Ajouter une dépense non prévue
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('moves')}
                  className="rounded-full bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-400"
                >
                  Voir les mouvements →
                </button>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 md:grid-cols-[0.9fr_1.2fr]">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-600">Saison</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-500"
                    value={saisieSeason}
                    onChange={(e) => {
                      setSaisieSeason(e.target.value);
                      setSaison(e.target.value);
                    }}
                  >
                    {SAISONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-600">Recherche</label>
                  <input
                    type="text"
                    placeholder="Catégorie / désignation…"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-500"
                    value={saisieSearch}
                    onChange={(e) => setSaisieSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSaisieType('depense')}
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
                    className={[
                      'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                      saisieType === 'recette' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    Recettes prévues
                  </button>

                  <span>{prevPrevusPositifsFiltered.length} lignes</span>
                </div>
                <div className="text-[11px] text-slate-500">Clique une ligne → popup de saisie (pré-rempli).</div>
              </div>
            </div>

            {/* Liste prévisionnel */}
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="max-h-[520px] overflow-auto text-xs">
                <table className="min-w-full border-collapse">
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
                              saisieType === 'recette' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-pink-500 hover:bg-pink-400',
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

                  {statusForm === 'error' && errorForm && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                      {errorForm}
                      {errorUpload && <div className="mt-1 text-xs text-rose-700">Détail : {errorUpload}</div>}
                    </div>
                  )}
                  {statusForm === 'success' && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Mouvement enregistré avec succès.</div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-700">Date</label>
                        <input
                          type="date"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-500"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-700">Type</label>
                        <select
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-500"
                          value={type}
                          onChange={(e) => setType(e.target.value as BudgetType)}
                        >
                          <option value="depense">Dépense</option>
                          <option value="recette">Recette</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-700">Montant (€)</label>
                        <input
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
                        <label className="text-xs font-medium text-slate-700">Catégorie</label>
                        <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none" value={categorie} readOnly />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-700">Désignation</label>
                        <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none" value={libelle} readOnly />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700">Commentaire (optionnel)</label>
                      <textarea
                        className="min-h-[70px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-500"
                        value={commentaire}
                        onChange={(e) => setCommentaire(e.target.value)}
                        placeholder="Détails utiles, références, fournisseur…"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-700">Facture (optionnel)</label>

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

                      <input ref={fileInputUploadRef} type="file" className="hidden" onChange={(e) => setFactureFile(e.target.files?.[0] ?? null)} accept=".pdf,image/*" />
                      <input
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
                        className="inline-flex items-center justify-center rounded-full bg-pink-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-pink-500/20 hover:bg-pink-400 disabled:cursor-not-allowed disabled:opacity-60"
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
                {statusForm === 'error' && errorForm && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    {errorForm}
                    {errorUpload && <div className="mt-1 text-xs text-rose-700">Détail : {errorUpload}</div>}
                  </div>
                )}
                {statusForm === 'success' && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Mouvement enregistré avec succès.</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700">Saison</label>
                      <select
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-500"
                        value={saison}
                        onChange={(e) => setSaison(e.target.value)}
                      >
                        {SAISONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700">Date</label>
                      <input
                        type="date"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-500"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700">Type</label>
                      <select
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-500"
                        value={type}
                        onChange={(e) => setType(e.target.value as BudgetType)}
                      >
                        <option value="depense">Dépense</option>
                        <option value="recette">Recette</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700">Catégorie</label>
                      <select
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
                      <label className="text-xs font-medium text-slate-700">Désignation</label>
                      <select
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
                      <label className="text-xs font-medium text-slate-700">Montant (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-500"
                        value={montant}
                        onChange={(e) => setMontant(e.target.value)}
                        placeholder="0,00"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700">Commentaire (optionnel)</label>
                      <input
                        type="text"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-500"
                        value={commentaire}
                        onChange={(e) => setCommentaire(e.target.value)}
                        placeholder="Détails utiles…"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-700">Facture (optionnel)</label>

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

                    <input ref={fileInputUploadRef} type="file" className="hidden" onChange={(e) => setFactureFile(e.target.files?.[0] ?? null)} accept=".pdf,image/*" />
                    <input
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
                      className="inline-flex items-center justify-center rounded-full bg-pink-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-pink-500/20 hover:bg-pink-400 disabled:cursor-not-allowed disabled:opacity-60"
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
          <section className="w-full rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-black/40 backdrop-blur">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Mouvements</h2>
                <p className="mt-1 text-xs text-slate-300">
                  {statusLoad === 'loading' ? 'Chargement…' : `${lignesFiltrees.length} mouvements (filtrés)`}
                  {Number.isFinite(displayLimit) && (
                    <>
                      {' '}
                      · <span className="text-slate-200">affichage</span> : {lignesAffichees.length} / {lignesFiltrees.length}
                    </>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('new')}
                  className="rounded-full bg-pink-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-pink-500/20 hover:bg-pink-400"
                >
                  + Saisie
                </button>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="rounded-full bg-slate-800/60 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700/60"
                >
                  Reset filtres
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="mb-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Pill tone="sky">Astuces</Pill>
                <span className="text-[11px] text-slate-300">Clique une ligne → popup de modification + facture. Corbeille = supprimer (avec archivage).</span>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Saison</label>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-1.5 text-xs outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-500"
                    value={filterSeason}
                    onChange={(e) => setFilterSeason(e.target.value)}
                  >
                    <option value="toutes">Toutes</option>
                    {saisonsDisponibles.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Type</label>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-1.5 text-xs outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-500"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as 'tous' | BudgetType)}
                  >
                    <option value="tous">Tous</option>
                    <option value="recette">Recettes</option>
                    <option value="depense">Dépenses</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Catégorie</label>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-1.5 text-xs outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-500"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option value="toutes">Toutes</option>
                    {categoriesDisponibles.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Recherche</label>
                  <input
                    type="text"
                    placeholder="Libellé, catégorie, commentaire…"
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-1.5 text-xs outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-500"
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
                    className={[
                      'rounded-full px-4 py-2 text-xs font-semibold transition',
                      onlyMissingInvoices ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20' : 'bg-slate-800/60 text-slate-200 hover:bg-slate-700/60',
                    ].join(' ')}
                  >
                    {onlyMissingInvoices ? '✓ Factures manquantes' : 'Factures manquantes'}
                  </button>

                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/50 px-3 py-2 text-xs">
                    <span className="text-slate-300">Afficher</span>
                    <select
                      className="rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1 text-xs outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-500"
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
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="emerald">Recettes {formatCurrency(totalRecettes)}</Pill>
                  <Pill tone="rose">Dépenses {formatCurrency(totalDepenses)}</Pill>
                  <Pill tone="slate">Solde {formatCurrency(solde)}</Pill>
                </div>
              </div>
            </div>

            {/* Table FULL WIDTH */}
            <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-950/60">
              <div className="max-h-[640px] overflow-auto text-xs">
                <table className="min-w-full border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-900/90 text-[11px] uppercase tracking-wide text-slate-300">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Saison</th>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Catégorie</th>
                      <th className="px-3 py-2 text-left">Désignation</th>
                      <th className="px-3 py-2 text-right">Montant</th>
                      <th className="px-3 py-2 text-center w-[90px]">Facture</th>
                      <th className="px-3 py-2 text-center"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lignesAffichees.map((l, idx) => {
                      const hasInvoice = !!l.facture_url;

                      return (
                        <tr
                          key={l.id}
                          onClick={() => {
                            setSelectedLigneId(l.id);
                            setStatusFactureEdit('idle');
                            setErrorFactureEdit(null);
                            setFactureFileEdit(null);
                            setOpenEditModal(true);
                          }}
                          className={[idx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900/10', 'cursor-pointer transition hover:bg-slate-800/30'].join(' ')}
                          title="Cliquer pour modifier / ajouter la facture"
                        >
                          <td className="whitespace-nowrap px-3 py-2 text-slate-100">{formatDate(l.date)}</td>
                          <td className="whitespace-nowrap px-3 py-2 text-slate-200/80">{l.saison}</td>
                          <td className="px-3 py-2">
                            <Pill tone={l.type === 'recette' ? 'emerald' : 'rose'}>{l.type === 'recette' ? 'Recette' : 'Dépense'}</Pill>
                          </td>
                          <td className="px-3 py-2 text-slate-200/90">
                            <div className="flex items-center justify-between gap-2">
                              <span className="min-w-0 truncate">{l.categorie || '-'}</span>
                              {!hasInvoice && (
                                <span className="shrink-0">
                                  <Pill tone="amber">Facture ?</Pill>
                                </span>
                              )}
                            </div>
                          </td>              
                          <td className="px-3 py-2 text-slate-100">
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
                            <span className={l.type === 'recette' ? 'text-emerald-300' : 'text-rose-300'}>{formatCurrency(Number(l.montant || 0))}</span>
                          </td>
                          <td className="px-3 py-2 text-center w-[90px]">
                            {l.facture_url ? (
                              <a
                                href={l.facture_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-50 hover:bg-slate-700"
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
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteLigne(l);
                              }}
                              className="inline-flex items-center justify-center rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/25"
                              title="Supprimer cette ligne"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {lignesAffichees.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-xs text-slate-400">
                          Aucun mouvement ne correspond aux filtres sélectionnés.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 bg-slate-950/80 px-4 py-3 text-[11px] text-slate-300">
                <span>
                  {lignesAffichees.length} affichées · {lignesFiltrees.length} filtrées
                  {missingInvoicesCount > 0 && (
                    <>
                      {' '}
                      · <span className="text-amber-200">{missingInvoicesCount} sans facture</span>
                    </>
                  )}
                </span>

                <div className="flex flex-wrap gap-3 text-right">
                  <span>
                    Recettes : <span className="font-semibold text-emerald-300">{formatCurrency(totalRecettes)}</span>
                  </span>
                  <span>
                    Dépenses : <span className="font-semibold text-rose-300">{formatCurrency(totalDepenses)}</span>
                  </span>
                  <span>
                    Solde : <span className="font-semibold text-slate-50">{formatCurrency(solde)}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Popup EDIT (fond blanc) */}
            <Modal
              open={openEditModal}
              title={selectedLigne ? 'Modifier le mouvement' : 'Modifier le mouvement'}
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
                      <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800">
                        <span className="max-w-[220px] truncate">{factureFileEdit ? factureFileEdit.name : 'Choisir une facture (PDF / image)'}</span>
                        <span className="rounded-full bg-sky-500 px-3 py-1 text-[11px] font-semibold text-white">Parcourir</span>
                        <input type="file" className="hidden" onChange={(e) => setFactureFileEdit(e.target.files?.[0] ?? null)} accept=".pdf,image/*" />
                      </label>

                      <button
                        type="button"
                        disabled={!factureFileEdit || statusFactureEdit === 'loading'}
                        onClick={handleUploadFactureForSelected}
                        className="inline-flex items-center justify-center rounded-full bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-500/20 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {statusFactureEdit === 'loading' ? 'Upload…' : selectedLigne?.facture_url ? 'Remplacer la facture' : 'Ajouter la facture'}
                      </button>

                      {statusFactureEdit === 'success' && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">Facture enregistrée.</div>
                      )}
                      {statusFactureEdit === 'error' && errorFactureEdit && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">{errorFactureEdit}</div>
                      )}
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
