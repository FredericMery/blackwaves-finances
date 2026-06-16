"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ActionStatus = "a_lancer" | "en_cours" | "termine";

type ActionItem = {
  id: string;
  created_at: string | null;
  updated_at: string | null;
  titre: string;
  description?: string | null;
  responsable?: string | null;
  responsable_role?: string | null;
  echeance?: string | null;
  statut: ActionStatus;
  categorie?: string | null;
  priorite?: number | null;
  created_by?: string | null;
  terminee_le?: string | null;
};

const STATUT_LABELS: Record<ActionStatus, string> = {
  a_lancer: "À lancer",
  en_cours: "En cours",
  termine: "Terminé",
};

const ACTION_CATEGORIES = [
  "Général",
  "Budget",
  "Planning",
  "Compétitions",
  "Communication",
  "Matériel",
  "Gymnases",
  "RH",
  "Parents",
  "Administration",
];

function getStatutBadgeClasses(statut: ActionStatus) {
  switch (statut) {
    case "a_lancer":
      return "bg-rose-500/15 text-rose-200 border border-rose-500/40";
    case "en_cours":
      return "bg-amber-500/15 text-amber-200 border border-amber-500/40";
    case "termine":
      return "bg-emerald-500/15 text-emerald-200 border border-emerald-500/40";
    default:
      return "bg-slate-700/40 text-slate-100 border border-slate-600/60";
  }
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

/**
 * Calcule la saison en fonction d'une date :
 * saison = année-année+1, la saison change au 1er septembre.
 */
function computeSeasonFromDate(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const month = d.getMonth() + 1; // 1-12
  const year = d.getFullYear();
  const startYear = month >= 9 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

/**
 * Donne la classe Tailwind pour la pastille d'échéance
 * - Vert : échéance dans plus de 3 semaines (~21 jours)
 * - Orange : échéance <= 15 jours
 * - Rouge : échéance dépassée
 * - Gris : pas d’échéance
 */
function getDeadlineDotClasses(echeance?: string | null) {
  if (!echeance) {
    return "h-2.5 w-2.5 rounded-full bg-slate-600";
  }
  const due = new Date(echeance);
  if (Number.isNaN(due.getTime())) {
    return "h-2.5 w-2.5 rounded-full bg-slate-600";
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return "h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(248,113,113,0.8)]";
  }
  if (diffDays <= 15) {
    return "h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]";
  }
  if (diffDays >= 21) {
    return "h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.7)]";
  }
  return "h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.7)]";
}

export default function BureauActionsPage() {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtres (inchangés)
  const [statutFilter, setStatutFilter] = useState<"all" | ActionStatus>("all");
  const [categorieFilter, setCategorieFilter] = useState<string>("all");
  const [responsableFilter, setResponsableFilter] = useState<string>("all");
  const [saisonFilter, setSaisonFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  // Création (fonctionnement inchangé)
  const [creating, setCreating] = useState(false);
  const [creatingError, setCreatingError] = useState<string | null>(null);
  const [newTitre, setNewTitre] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newResponsable, setNewResponsable] = useState("");
  const [newCategorie, setNewCategorie] = useState("");
  const [newEcheance, setNewEcheance] = useState("");
  const [newPriorite, setNewPriorite] = useState<number | "">("");

  // Édition inline (inchangée)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<ActionItem>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Drawer détails (editable note)
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsAction, setDetailsAction] = useState<ActionItem | null>(null);
  const [detailsNote, setDetailsNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSavedPulse, setNoteSavedPulse] = useState(false);

  // Suppression
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchActions() {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("actions_club")
        .select("*")
        .order("echeance", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setActions((data || []) as ActionItem[]);
    } catch (err: any) {
      console.error("Erreur chargement actions :", err);
      setError("Impossible de charger les actions pour le moment.");
    } finally {
      setLoading(false);
    }
  }

  const categoriesDisponibles = useMemo(() => {
    const set = new Set<string>();
    actions.forEach((a) => {
      if (a.categorie && a.categorie.trim() !== "") set.add(a.categorie);
    });
    ACTION_CATEGORIES.forEach((c) => set.add(c));
    return Array.from(set).sort();
  }, [actions]);

  const responsablesDisponibles = useMemo(() => {
    const set = new Set<string>();
    actions.forEach((a) => {
      if (a.responsable && a.responsable.trim() !== "") set.add(a.responsable);
    });
    return Array.from(set).sort();
  }, [actions]);

  const saisonsDisponibles = useMemo(() => {
    const set = new Set<string>();
    actions.forEach((a) => {
      const season =
        computeSeasonFromDate(a.echeance || a.created_at || undefined) || null;
      if (season) set.add(season);
    });
    return Array.from(set).sort();
  }, [actions]);

  const filteredActions = useMemo(() => {
    return actions.filter((a) => {
      if (statutFilter !== "all" && a.statut !== statutFilter) return false;
      if (categorieFilter !== "all" && (a.categorie || "") !== categorieFilter)
        return false;
      if (
        responsableFilter !== "all" &&
        (a.responsable || "") !== responsableFilter
      )
        return false;

      if (saisonFilter !== "all") {
        const season =
          computeSeasonFromDate(a.echeance || a.created_at || undefined) || null;
        if (season !== saisonFilter) return false;
      }

      if (search.trim() !== "") {
        const q = search.toLowerCase();
        const blob =
          (a.titre || "") +
          " " +
          (a.description || "") +
          " " +
          (a.categorie || "") +
          " " +
          (a.responsable || "");
        if (!blob.toLowerCase().includes(q)) return false;
      }

      return true;
    });
  }, [
    actions,
    statutFilter,
    categorieFilter,
    responsableFilter,
    saisonFilter,
    search,
  ]);

  async function handleChangeStatut(id: string, newStatut: ActionStatus) {
    try {
      const { error } = await supabase
        .from("actions_club")
        .update({
          statut: newStatut,
          terminee_le:
            newStatut === "termine"
              ? new Date().toISOString().slice(0, 10)
              : null,
        })
        .eq("id", id);

      if (error) throw error;

      setActions((prev) =>
        prev.map((a) => (a.id === id ? { ...a, statut: newStatut } : a)),
      );

      // Si la modale est ouverte sur cette action, on sync aussi
      setDetailsAction((prev) =>
        prev?.id === id ? { ...prev, statut: newStatut } : prev,
      );
    } catch (err) {
      console.error("Erreur changement statut :", err);
      alert("Impossible de mettre à jour le statut de cette action.");
    }
  }

  async function handleCreateAction(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitre.trim()) {
      setCreatingError("Merci d’indiquer un titre d’action.");
      return;
    }
    setCreating(true);
    setCreatingError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("actions_club").insert({
        titre: newTitre.trim(),
        description: newDescription.trim() || null,
        responsable: newResponsable.trim() || null,
        categorie: newCategorie.trim() || null,
        priorite: newPriorite === "" ? null : Number(newPriorite),
        echeance: newEcheance || null,
        statut: "a_lancer",
        created_by: user?.id ?? null,
      });

      if (error) throw error;

      setNewTitre("");
      setNewDescription("");
      setNewResponsable("");
      setNewCategorie("");
      setNewPriorite("");
      setNewEcheance("");

      await fetchActions();
    } catch (err) {
      console.error("Erreur création action :", err);
      setCreatingError("Impossible de créer l’action. Réessaie dans un instant.");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(action: ActionItem) {
    setEditingId(action.id);
    setEditValues({
      titre: action.titre,
      // on garde, même si non affiché en colonne : utile si tu ouvres modale puis "Modifier"
      description: action.description ?? "",
      responsable: action.responsable ?? "",
      categorie: action.categorie ?? "",
      echeance: action.echeance ?? "",
      priorite: action.priorite ?? undefined,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValues({});
    setSavingEdit(false);
  }

  function handleEditChange<K extends keyof ActionItem>(
    key: K,
    value: ActionItem[K] | string,
  ) {
    setEditValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function saveEdit() {
    if (!editingId) return;
    setSavingEdit(true);
    try {
      const payload: Partial<ActionItem> = {
        titre:
          typeof editValues.titre === "string"
            ? editValues.titre.trim()
            : undefined,
        description:
          typeof editValues.description === "string"
            ? editValues.description.trim()
            : undefined,
        responsable:
          typeof editValues.responsable === "string"
            ? editValues.responsable.trim()
            : undefined,
        categorie:
          typeof editValues.categorie === "string"
            ? editValues.categorie.trim()
            : undefined,
        echeance:
          typeof editValues.echeance === "string" && editValues.echeance !== ""
            ? editValues.echeance
            : null,
        priorite:
          typeof editValues.priorite === "number"
            ? editValues.priorite
            : editValues.priorite === null
              ? null
              : undefined,
      };

      const { error } = await supabase
        .from("actions_club")
        .update(payload)
        .eq("id", editingId);

      if (error) throw error;

      await fetchActions();
      cancelEdit();
    } catch (err) {
      console.error("Erreur sauvegarde édition :", err);
      alert("Impossible de sauvegarder les modifications.");
      setSavingEdit(false);
    }
  }

  function openDetails(action: ActionItem) {
    setDetailsAction(action);
    setDetailsNote(action.description ?? "");
    setDetailsOpen(true);
    setNoteSavedPulse(false);
  }

  function closeDetails() {
    setDetailsOpen(false);
    setDetailsAction(null);
    setDetailsNote("");
    setSavingNote(false);
    setNoteSavedPulse(false);
  }

  async function saveDetailsNote() {
    if (!detailsAction) return;

    setSavingNote(true);
    try {
      const newDesc = detailsNote.trim() || null;

      const { error } = await supabase
        .from("actions_club")
        .update({ description: newDesc })
        .eq("id", detailsAction.id);

      if (error) throw error;

      // sync locale (sans re-fetch obligatoire)
      setActions((prev) =>
        prev.map((a) =>
          a.id === detailsAction.id ? { ...a, description: newDesc } : a,
        ),
      );
      setDetailsAction((prev) =>
        prev ? { ...prev, description: newDesc } : prev,
      );

      setNoteSavedPulse(true);
      window.setTimeout(() => setNoteSavedPulse(false), 900);
    } catch (err) {
      console.error("Erreur sauvegarde note :", err);
      alert("Impossible d’enregistrer la note.");
    } finally {
      setSavingNote(false);
    }
  }

  async function handleDeleteAction(action: ActionItem) {
    const ok = window.confirm(
      `Supprimer définitivement cette action ?\n\n"${action.titre}"`,
    );
    if (!ok) return;

    setDeletingId(action.id);
    try {
      const { error } = await supabase
        .from("actions_club")
        .delete()
        .eq("id", action.id);

      if (error) throw error;

      setActions((prev) => prev.filter((a) => a.id !== action.id));

      if (editingId === action.id) cancelEdit();
      if (detailsAction?.id === action.id) closeDetails();

      // Safe: on resync la vue réelle
      await fetchActions();
    } catch (err) {
      console.error("Erreur suppression action :", err);
      alert("Impossible de supprimer cette action.");
    } finally {
      setDeletingId(null);
    }
  }

  const nbALancer = actions.filter((a) => a.statut === "a_lancer").length;
  const nbEnCours = actions.filter((a) => a.statut === "en_cours").length;
  const nbTerminees = actions.filter((a) => a.statut === "termine").length;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-24 pb-16 text-slate-50">
      <div className="mx-auto max-w-6xl px-4">
        {/* Header + KPI */}
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-pink-400">
              Espace bureau
            </p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">
              Suivi des actions du club
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Vue tableau des actions du bureau : ce qu’il reste à lancer, ce qui
              est en cours, ce qui est terminé.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-rose-200/80">
                À lancer
              </div>
              <div className="text-lg font-semibold text-rose-100">
                {nbALancer}
              </div>
            </div>
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-amber-200/80">
                En cours
              </div>
              <div className="text-lg font-semibold text-amber-100">
                {nbEnCours}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-emerald-200/80">
                Terminé
              </div>
              <div className="text-lg font-semibold text-emerald-100">
                {nbTerminees}
              </div>
            </div>
          </div>
        </header>

        {/* Filtres */}
        <section className="mb-6 rounded-2xl border border-slate-700/80 bg-slate-900/80 p-4 shadow-lg shadow-black/40">
          <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-sm font-semibold text-slate-100">Filtres</h2>
            <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:justify-end">
              <input
                type="text"
                placeholder="Rechercher une action, une catégorie, un responsable…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-600 bg-slate-950/60 px-3 py-2 text-xs outline-none placeholder:text-slate-500 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 md:max-w-xs"
              />
              <div className="flex flex-wrap gap-2">
                <select
                  value={statutFilter}
                  onChange={(e) =>
                    setStatutFilter(
                      e.target.value === "all"
                        ? "all"
                        : (e.target.value as ActionStatus),
                    )
                  }
                  className="rounded-xl border border-slate-600 bg-slate-950/80 px-3 py-2 text-xs outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="a_lancer">À lancer</option>
                  <option value="en_cours">En cours</option>
                  <option value="termine">Terminé</option>
                </select>

                <select
                  value={categorieFilter}
                  onChange={(e) => setCategorieFilter(e.target.value)}
                  className="rounded-xl border border-slate-600 bg-slate-950/80 px-3 py-2 text-xs outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                >
                  <option value="all">Toutes catégories</option>
                  {categoriesDisponibles.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <select
                  value={responsableFilter}
                  onChange={(e) => setResponsableFilter(e.target.value)}
                  className="rounded-xl border border-slate-600 bg-slate-950/80 px-3 py-2 text-xs outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                >
                  <option value="all">Tous responsables</option>
                  {responsablesDisponibles.map((resp) => (
                    <option key={resp} value={resp}>
                      {resp}
                    </option>
                  ))}
                </select>

                <select
                  value={saisonFilter}
                  onChange={(e) => setSaisonFilter(e.target.value)}
                  className="rounded-xl border border-slate-600 bg-slate-950/80 px-3 py-2 text-xs outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                >
                  <option value="all">Toutes saisons</option>
                  {saisonsDisponibles.map((saison) => (
                    <option key={saison} value={saison}>
                      Saison {saison}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Formulaire d'ajout – Catégorie + Description masquées mais conservées */}
        <section className="mb-4 rounded-2xl border border-pink-500/40 bg-gradient-to-r from-pink-500/10 via-slate-900/90 to-slate-900/90 p-4 shadow-lg shadow-black/40">
          <h2 className="mb-3 text-sm font-semibold text-pink-100">
            Ajouter une action
          </h2>

          <div className="overflow-x-auto">
            <form onSubmit={handleCreateAction}>
              <table className="min-w-full border-separate border-spacing-y-2 text-xs table-fixed">
                <thead className="text-[11px] text-slate-300">
                  <tr>
                    <th className="px-2 pb-1 text-left w-[120px]">
                      Date création
                    </th>
                    <th className="px-2 pb-1 text-left w-[560px]">Titre</th>
                    <th className="px-2 pb-1 text-left w-[240px]">
                      Responsable
                    </th>
                    <th className="px-2 pb-1 text-left w-[160px]">Échéance</th>
                    <th className="px-2 pb-1 text-left w-[140px]">Priorité</th>
                    <th className="px-2 pb-1 text-left w-[110px]">Créer</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="rounded-xl border border-pink-500/40 bg-slate-950/70 align-top">
                    <td className="px-2 py-2 text-slate-400 text-[11px] whitespace-nowrap">
                      Auto (aujourd’hui)
                    </td>

                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={newTitre}
                        onChange={(e) => setNewTitre(e.target.value)}
                        placeholder="Titre (obligatoire)"
                        className="w-full rounded-lg border border-pink-500/60 bg-slate-950/80 px-2 py-1 text-[11px] outline-none placeholder:text-slate-500 focus:border-pink-300 focus:ring-1 focus:ring-pink-300"
                      />

                      {/* Champs conservés (fonctionnement inchangé), simplement non affichés */}
                      <input
                        type="hidden"
                        value={newCategorie}
                        onChange={(e) => setNewCategorie(e.target.value)}
                      />
                      <input
                        type="hidden"
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                      />
                    </td>

                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={newResponsable}
                        onChange={(e) => setNewResponsable(e.target.value)}
                        placeholder="Bureau, Coachs…"
                        className="w-full rounded-lg border border-slate-600 bg-slate-950/80 px-2 py-1 text-[11px] outline-none placeholder:text-slate-500 focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
                      />
                    </td>

                    <td className="px-2 py-2">
                      <input
                        type="date"
                        value={newEcheance}
                        onChange={(e) => setNewEcheance(e.target.value)}
                        className="w-full rounded-lg border border-slate-600 bg-slate-950/80 px-2 py-1 text-[11px] outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
                      />
                    </td>

                    <td className="px-2 py-2">
                      <select
                        value={newPriorite === "" ? "" : String(newPriorite)}
                        onChange={(e) =>
                          setNewPriorite(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        className="w-full rounded-lg border border-slate-600 bg-slate-950/80 px-2 py-1 text-[11px] outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
                      >
                        <option value="">—</option>
                        <option value="1">1 (basse)</option>
                        <option value="2">2</option>
                        <option value="3">3 (normale)</option>
                        <option value="4">4</option>
                        <option value="5">5 (haute)</option>
                      </select>
                    </td>

                    <td className="px-2 py-2">
                      <button
                        type="submit"
                        disabled={creating}
                        className="rounded-full bg-pink-500 px-3 py-1 text-[11px] font-semibold text-slate-950 shadow-md shadow-pink-900/50 transition hover:bg-pink-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {creating ? "…" : "Créer"}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </form>
          </div>

          {creatingError && (
            <p className="mt-2 text-xs text-rose-200">{creatingError}</p>
          )}
        </section>

        {/* Tableau des actions */}
        <section>
          {error && (
            <div className="mb-4 rounded-xl border border-rose-500/50 bg-rose-900/40 px-4 py-3 text-xs text-rose-50">
              {error}
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl border border-slate-700/80 bg-slate-900/80 px-4 py-10 text-center text-sm text-slate-300">
              Chargement des actions…
            </div>
          ) : filteredActions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-900/70 px-4 py-8 text-center text-sm text-slate-300">
              Aucune action ne correspond aux filtres actuels.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-700/80 bg-slate-950/80 shadow-lg shadow-black/40">
              <table className="min-w-full border-separate border-spacing-y-[4px] text-xs table-fixed">
                <thead className="bg-slate-900/90 text-[11px] uppercase tracking-wide text-slate-300">
                  <tr>
                    <th className="px-3 py-2 text-left w-[120px]">
                      Date création
                    </th>
                    <th className="px-3 py-2 text-left w-[560px]">Titre</th>
                    <th className="px-3 py-2 text-left w-[240px]">
                      Responsable
                    </th>
                    <th className="px-3 py-2 text-left w-[150px]">Statut</th>
                    <th className="px-3 py-2 text-left w-[190px]">Échéance</th>
                    <th className="px-3 py-2 text-left w-[260px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActions.map((action) => {
                    const isEditing = editingId === action.id;

                    const handleCellClick = () => {
                      if (!isEditing) startEdit(action);
                    };

                    const hasNote =
                      (action.description ?? "").trim().length > 0;

                    return (
                      <tr
                        key={action.id}
                        className="rounded-xl border border-slate-700/70 bg-slate-900/90 align-middle"
                      >
                        {/* Date création */}
                        <td className="px-3 py-2 align-middle text-[11px] text-slate-300 whitespace-nowrap">
                          {formatDate(action.created_at)}
                        </td>

                        {/* Titre (large) + bouton détails */}
                        <td
                          className={`px-3 py-2 align-middle ${
                            isEditing ? "" : "cursor-pointer"
                          }`}
                          onClick={handleCellClick}
                        >
                          <div className="flex items-center gap-2">
                            {isEditing ? (
                              <input
                                type="text"
                                value={
                                  (editValues.titre as string) ??
                                  action.titre ??
                                  ""
                                }
                                onChange={(e) =>
                                  handleEditChange("titre", e.target.value)
                                }
                                className="w-full rounded-lg border border-slate-600 bg-slate-950/80 px-2 py-1 text-[11px] outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
                              />
                            ) : (
                              <>
                                <span className="block flex-1 text-[11px] font-semibold text-slate-50 truncate">
                                  {action.titre}
                                </span>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDetails(action);
                                  }}
                                  className={`rounded-full border px-2 py-1 text-[11px] hover:text-pink-200 ${
                                    hasNote
                                      ? "border-pink-500/50 bg-pink-500/10 text-pink-200"
                                      : "border-slate-600 bg-slate-950/60 text-slate-200 hover:border-pink-500/60"
                                  }`}
                                  title={
                                    hasNote
                                      ? "Notes présentes"
                                      : "Voir / ajouter des notes"
                                  }
                                >
                                  + détails
                                </button>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Responsable */}
                        <td
                          className={`px-3 py-2 align-middle ${
                            isEditing ? "" : "cursor-pointer"
                          }`}
                          onClick={handleCellClick}
                        >
                          {isEditing ? (
                            <input
                              type="text"
                              value={
                                (editValues.responsable as string) ??
                                action.responsable ??
                                ""
                              }
                              onChange={(e) =>
                                handleEditChange("responsable", e.target.value)
                              }
                              className="w-full rounded-lg border border-slate-600 bg-slate-950/80 px-2 py-1 text-[11px] outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
                            />
                          ) : (
                            <span className="block text-[11px] text-slate-200 truncate">
                              {action.responsable || "—"}
                            </span>
                          )}
                        </td>

                        {/* Statut (badge) */}
                        <td className="px-3 py-2 align-middle whitespace-nowrap">
                          <span
                            className={
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold " +
                              getStatutBadgeClasses(action.statut)
                            }
                          >
                            {STATUT_LABELS[action.statut]}
                          </span>
                        </td>

                        {/* Échéance */}
                        <td className="px-3 py-2 align-middle whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={getDeadlineDotClasses(action.echeance)}
                              title={
                                action.echeance
                                  ? `Échéance : ${formatDate(action.echeance)}`
                                  : "Aucune échéance définie"
                              }
                            />
                            <span className="text-[11px] text-slate-200">
                              {formatDate(action.echeance)}
                            </span>
                          </div>
                        </td>

                        {/* Actions : statut + édition + corbeille */}
                        <td className="px-3 py-2 align-middle whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <select
                              value={action.statut}
                              onChange={(e) =>
                                handleChangeStatut(
                                  action.id,
                                  e.target.value as ActionStatus,
                                )
                              }
                              className="rounded-full border border-slate-600 bg-slate-950/80 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
                            >
                              <option value="a_lancer">À lancer</option>
                              <option value="en_cours">En cours</option>
                              <option value="termine">Terminé</option>
                            </select>

                            {isEditing && (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={saveEdit}
                                  disabled={savingEdit}
                                  className="rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-semibold text-slate-950 shadow-md shadow-emerald-900/50 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {savingEdit ? "…" : "Enregistrer"}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  className="rounded-full bg-slate-700 px-3 py-1 text-[11px] font-semibold text-slate-100 hover:bg-slate-600"
                                >
                                  Annuler
                                </button>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAction(action);
                              }}
                              disabled={deletingId === action.id}
                              className="inline-flex items-center justify-center rounded-full border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-200 hover:bg-rose-500/20 disabled:opacity-60"
                              title="Supprimer cette action"
                            >
                              {deletingId === action.id ? "…" : "🗑️"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Drawer / Modal détails (notes éditables) */}
      {detailsOpen && detailsAction && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 md:items-center"
          onClick={closeDetails}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-700/80 bg-slate-950/95 shadow-2xl shadow-black/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-pink-400">
                  Détails & notes
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-50">
                  {detailsAction.titre}
                </div>
                <div className="mt-1 text-[11px] text-slate-300">
                  Créée le {formatDate(detailsAction.created_at)} · Responsable :{" "}
                  {detailsAction.responsable || "—"}
                </div>
              </div>

              <button
                type="button"
                onClick={closeDetails}
                className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs text-slate-200 hover:border-pink-500/60 hover:text-pink-200"
              >
                Fermer
              </button>
            </div>

            <div className="px-4 py-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-xs font-semibold text-slate-200">
                  Notes (enregistrées dans la table actions_club.description)
                </div>
                {noteSavedPulse && (
                  <span className="text-[11px] text-emerald-300">
                    ✅ Enregistré
                  </span>
                )}
              </div>

              <textarea
                value={detailsNote}
                onChange={(e) => setDetailsNote(e.target.value)}
                placeholder="Ajouter des notes : décisions, infos, suivi…"
                className="h-44 w-full resize-none rounded-xl border border-slate-800 bg-slate-900/40 p-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
              />

              <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-300">
                <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1">
                  Statut : {STATUT_LABELS[detailsAction.statut]}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1">
                  Échéance : {formatDate(detailsAction.echeance)}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1">
                  Catégorie : {detailsAction.categorie || "—"}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1">
                  Priorité : {detailsAction.priorite ?? "—"}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={saveDetailsNote}
                  disabled={savingNote}
                  className="rounded-full bg-pink-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-pink-900/40 transition hover:bg-pink-400 disabled:opacity-60"
                >
                  {savingNote ? "Enregistrement…" : "Enregistrer la note"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    closeDetails();
                    startEdit(detailsAction);
                  }}
                  className="rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-100 hover:border-pink-500/60 hover:text-pink-200"
                >
                  Modifier
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteAction(detailsAction)}
                  disabled={deletingId === detailsAction.id}
                  className="rounded-full bg-rose-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-rose-900/40 transition hover:bg-rose-400 disabled:opacity-60"
                >
                  {deletingId === detailsAction.id ? "Suppression…" : "Supprimer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
