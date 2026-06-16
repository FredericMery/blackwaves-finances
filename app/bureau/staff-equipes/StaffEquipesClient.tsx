"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

/* =======================
   Utils
======================= */

function cn(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function guessSeasons() {
  const y = new Date().getFullYear();
  const mk = (start: number) => `${start}-${start + 1}`;
  return [mk(y - 1), mk(y), mk(y + 1), mk(y + 2), mk(y + 3)];
}

function nextSeason() {
  const y = new Date().getFullYear();
  return `${y + 1}-${y + 2}`;
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

/* =======================
   Types
======================= */

type TeamRow = {
  id: string;
  saison: string;
  type_code: string;
  niveau: number;
  label: string;
  max_athletes: number;
  actif: boolean;
  ordre: number;
  created_at: string;
  athlete_count: number;
};

type StaffPerson = {
  id: string;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  actif: boolean;
  ordre: number;
  coaching_level: number; // 1..4
  formation_level: number; // 1..4
  formations: string[]; // optionnel
};

type StaffAff = {
  id: string;
  saison: string;
  equipe_saison_id: string;
  staff_kind: "coach" | "assist";
  coach_id: string | null;
  assist_coach_id: string | null;
};

/* =======================
   API helpers
======================= */

async function apiGet(saison: string) {
  const r = await fetch(`/api/staff-equipes/get?saison=${encodeURIComponent(saison)}`, {
    cache: "no-store",
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error || "Erreur chargement");
  return j as {
    equipes: TeamRow[];
    coachs: StaffPerson[];
    assistCoachs: StaffPerson[];
    staff: StaffAff[];
  };
}

async function apiSave(action: any) {
  const r = await fetch("/api/staff-equipes/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error || "Erreur sauvegarde");
  return j;
}

/* =======================
   UI components
======================= */

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-200">
      {children}
    </span>
  );
}

function Btn({
  children,
  onClick,
  tone = "slate",
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "slate" | "emerald" | "sky" | "rose";
  disabled?: boolean;
}) {
  const cls =
    tone === "emerald"
      ? "bg-emerald-500 hover:bg-emerald-600"
      : tone === "sky"
      ? "bg-sky-500 hover:bg-sky-600"
      : tone === "rose"
      ? "bg-rose-500 hover:bg-rose-600"
      : "bg-white/5 hover:bg-white/10";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-9 rounded-xl px-4 text-xs font-semibold text-white shadow-md shadow-black/30 transition",
        disabled ? "opacity-50 cursor-not-allowed" : "",
        cls
      )}
    >
      {children}
    </button>
  );
}

function TinyBtn({
  children,
  onClick,
  tone = "slate",
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "slate" | "sky" | "emerald" | "rose";
}) {
  const cls =
    tone === "emerald"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
      : tone === "sky"
      ? "border-sky-400/30 bg-sky-500/10 text-sky-100 hover:bg-sky-500/15"
      : tone === "rose"
      ? "border-rose-400/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15"
      : "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition",
        cls
      )}
    >
      {children}
    </button>
  );
}

function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="text-sm font-semibold text-white">{title}</div>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 hover:bg-white/10"
            type="button"
          >
            Fermer
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold text-slate-300">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-sky-500/60"
      />
    </label>
  );
}

function LevelSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold text-slate-300">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-sky-500/60"
      >
        <option value={1}>Niveau 1</option>
        <option value={2}>Niveau 2</option>
        <option value={3}>Niveau 3</option>
        <option value={4}>Niveau 4</option>
      </select>
    </label>
  );
}

/* =======================
   Page
======================= */

export default function StaffEquipesClient() {
  const router = useRouter();
  const sp = useSearchParams();

  // Saison via URL
  const seasons = useMemo(() => guessSeasons(), []);
  const defaultSeason = useMemo(() => {
    const ns = nextSeason();
    return seasons.includes(ns) ? ns : seasons[0] || ns;
  }, [seasons]);

  const saisonFromUrl = sp.get("saison") || "";
  const [saison, setSaison] = useState<string>(saisonFromUrl || defaultSeason);

  // Data
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [equipes, setEquipes] = useState<TeamRow[]>([]);
  const [coachs, setCoachs] = useState<StaffPerson[]>([]);
  const [assistCoachs, setAssistCoachs] = useState<StaffPerson[]>([]);
  const [staff, setStaff] = useState<StaffAff[]>([]);

  // Selection équipe + affectations
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [coachIds, setCoachIds] = useState<string[]>([]);
  const [assistIds, setAssistIds] = useState<string[]>([]);

  // Recherche (évite les énormes select multiples)
  const [qCoach, setQCoach] = useState("");
  const [qAssist, setQAssist] = useState("");

  // Modals : edit levels / create
  const [openEdit, setOpenEdit] = useState(false);
  const [editKind, setEditKind] = useState<"coach" | "assist">("coach");
  const [editPersonId, setEditPersonId] = useState<string>("");

  const [editCoachingLevel, setEditCoachingLevel] = useState<number>(1);
  const [editFormationLevel, setEditFormationLevel] = useState<number>(1);

  const [openCreateCoach, setOpenCreateCoach] = useState(false);
  const [openCreateAssist, setOpenCreateAssist] = useState(false);

  const [newCoach, setNewCoach] = useState({
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    coaching_level: 1,
    formation_level: 1,
  });

  const [newAssist, setNewAssist] = useState({
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    coaching_level: 1,
    formation_level: 1,
  });

  function toast(msg: string) {
    setInfo(msg);
    window.clearTimeout((toast as any)._t);
    (toast as any)._t = window.setTimeout(() => setInfo(null), 2200);
  }

  // URL sync
  useEffect(() => {
    if (saisonFromUrl && saisonFromUrl !== saison) setSaison(saisonFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saisonFromUrl]);

  function setSeasonAndUrl(newSeason: string) {
    setSaison(newSeason);
    const qs = new URLSearchParams(Array.from(sp.entries()));
    qs.set("saison", newSeason);
    router.replace(`/bureau/staff-equipes?${qs.toString()}`);

  }

  // Load
  async function reload(keepTeam = true) {
    setLoading(true);
    setErr(null);
    try {
      const data = await apiGet(saison);
      setEquipes(data.equipes || []);
      setCoachs(data.coachs || []);
      setAssistCoachs(data.assistCoachs || []);
      setStaff(data.staff || []);

      if (!keepTeam || !selectedTeamId) {
        setSelectedTeamId(data.equipes?.[0]?.id || "");
      }
    } catch (e: any) {
      setErr(e?.message || "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    reload(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saison]);

  // Derived
  const teamList = useMemo(
    () => (equipes || []).filter((t) => t.actif).slice().sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)),
    [equipes]
  );

  const selectedTeam = useMemo(
    () => teamList.find((t) => t.id === selectedTeamId) || null,
    [teamList, selectedTeamId]
  );

  const coachMap = useMemo(() => new Map(coachs.map((c) => [c.id, c])), [coachs]);
  const assistMap = useMemo(() => new Map(assistCoachs.map((a) => [a.id, a])), [assistCoachs]);

  const coachOptions = useMemo(() => {
    const q = qCoach.trim().toLowerCase();
    return coachs
      .filter((c) => c.actif)
      .filter((c) => {
        if (!q) return true;
        const s = `${c.prenom} ${c.nom} ${c.email ?? ""}`.toLowerCase();
        return s.includes(q);
      })
      .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
  }, [coachs, qCoach]);

  const assistOptions = useMemo(() => {
    const q = qAssist.trim().toLowerCase();
    return assistCoachs
      .filter((c) => c.actif)
      .filter((c) => {
        if (!q) return true;
        const s = `${c.prenom} ${c.nom} ${c.email ?? ""}`.toLowerCase();
        return s.includes(q);
      })
      .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
  }, [assistCoachs, qAssist]);

  // Hydrate staff when team changes
  useEffect(() => {
    if (!selectedTeam) return;
    const rows = staff.filter((s) => s.saison === saison && s.equipe_saison_id === selectedTeam.id);

    setCoachIds(
      rows.filter((r) => r.staff_kind === "coach" && r.coach_id).map((r) => r.coach_id!) || []
    );
    setAssistIds(
      rows.filter((r) => r.staff_kind === "assist" && r.assist_coach_id).map((r) => r.assist_coach_id!) || []
    );
  }, [selectedTeamId, saison, staff, selectedTeam]);

  // Save team aff
  async function saveTeam() {
    if (!selectedTeam) return;
    setSaving(true);
    setErr(null);
    try {
      await apiSave({
        type: "SET_TEAM_STAFF",
        payload: {
          saison,
          equipe_saison_id: selectedTeam.id,
          coach_ids: uniq(coachIds),
          assist_ids: uniq(assistIds),
        },
      });
      toast("✅ Encadrement enregistré");
      await reload(true);
    } catch (e: any) {
      setErr(e?.message || "Erreur sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  // Open edit modal for one person
  function openEditLevels(kind: "coach" | "assist", id: string) {
    setEditKind(kind);
    setEditPersonId(id);
    const p = kind === "coach" ? coachMap.get(id) : assistMap.get(id);
    setEditCoachingLevel(p?.coaching_level ?? 1);
    setEditFormationLevel(p?.formation_level ?? 1);
    setOpenEdit(true);
  }

  // Save levels (API action to implement)
  async function saveLevels() {
    if (!editPersonId) return;
    setErr(null);
    try {
      await apiSave({
        type: "STAFF_PERSON_UPDATE_LEVELS",
        payload: {
          kind: editKind, // "coach" | "assist"
          id: editPersonId,
          coaching_level: editCoachingLevel,
          formation_level: editFormationLevel,
        },
      });
      setOpenEdit(false);
      toast("✅ Niveaux mis à jour");
      await reload(true);
    } catch (e: any) {
      setErr(e?.message || "Erreur mise à jour niveaux");
    }
  }

  // Create coach / assist (API action to implement if not existing)
  async function createCoach() {
    setErr(null);
    try {
      const res = await apiSave({
        type: "COACH_CREATE",
        payload: {
          prenom: newCoach.prenom.trim(),
          nom: newCoach.nom.trim(),
          email: newCoach.email.trim() || null,
          telephone: newCoach.telephone.trim() || null,
          coaching_level: newCoach.coaching_level,
          formation_level: newCoach.formation_level,
          formations: [],
          actif: true,
        },
      });

      setOpenCreateCoach(false);
      setNewCoach({ prenom: "", nom: "", email: "", telephone: "", coaching_level: 1, formation_level: 1 });

      const createdId = res?.item?.id as string | undefined;
      if (createdId) {
        setCoachIds((prev) => uniq([...prev, createdId]));
        toast("➕ Coach créé et ajouté à l’équipe");
      } else {
        toast("➕ Coach créé");
      }

      await reload(true);
    } catch (e: any) {
      setErr(e?.message || "Erreur création coach");
    }
  }

  async function createAssist() {
    setErr(null);
    try {
      const res = await apiSave({
        type: "ASSIST_CREATE",
        payload: {
          prenom: newAssist.prenom.trim(),
          nom: newAssist.nom.trim(),
          email: newAssist.email.trim() || null,
          telephone: newAssist.telephone.trim() || null,
          coaching_level: newAssist.coaching_level,
          formation_level: newAssist.formation_level,
          formations: [],
          actif: true,
        },
      });

      setOpenCreateAssist(false);
      setNewAssist({ prenom: "", nom: "", email: "", telephone: "", coaching_level: 1, formation_level: 1 });

      const createdId = res?.item?.id as string | undefined;
      if (createdId) {
        setAssistIds((prev) => uniq([...prev, createdId]));
        toast("➕ Assist coach créé et ajouté à l’équipe");
      } else {
        toast("➕ Assist coach créé");
      }

      await reload(true);
    } catch (e: any) {
      setErr(e?.message || "Erreur création assist coach");
    }
  }

  // Helpers rendering person row
  function personLabel(p: StaffPerson) {
    return `${p.prenom} ${p.nom}`.trim();
  }

  function personMeta(p: StaffPerson, prefix: "Coach" | "Assist") {
    return `${prefix} L${p.coaching_level} • Form L${p.formation_level}`;
  }

  const selectedCoachs = useMemo(
    () => coachIds.map((id) => coachMap.get(id)).filter(Boolean) as StaffPerson[],
    [coachIds, coachMap]
  );

  const selectedAssists = useMemo(
    () => assistIds.map((id) => assistMap.get(id)).filter(Boolean) as StaffPerson[],
    [assistIds, assistMap]
  );

  const selectedCoachSet = useMemo(() => new Set(coachIds), [coachIds]);
  const selectedAssistSet = useMemo(() => new Set(assistIds), [assistIds]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10">
        <header className="mb-6 border-b border-white/5 pb-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-400">Espace bureau</div>
              <h1 className="mt-2 text-3xl font-bold text-white">Staff & Équipes</h1>
              <p className="mt-2 text-sm text-slate-300">
                Associer les coachs et assist coachs aux équipes de la saison.
                <span className="text-slate-400"> (UI optimisée pour éviter les gros selects qui font ramer Chrome)</span>
              </p>
            </div>

            <Link
              href={`/bureau/preparer-saison?saison=${encodeURIComponent(saison)}`}
              className="inline-flex items-center rounded-full border border-slate-600 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-100 hover:border-slate-400"
            >
              ← Retour préparation saison
            </Link>
          </div>
        </header>

        {/* Saison */}
        <section className="mb-6 rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-lg shadow-black/40">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-300">Saison transmise via l’URL</div>
              <div className="mt-1 text-sm text-slate-300">
                Paramètre : <span className="font-semibold text-slate-100">?saison=…</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={saison}
                onChange={(e) => setSeasonAndUrl(e.target.value)}
                className="min-w-[180px] rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-pink-500/60"
              >
                {seasons.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                {saison}
              </span>
            </div>
          </div>
        </section>

        {info ? (
          <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
            {info}
          </div>
        ) : null}

        {err ? (
          <div className="mb-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
            {err}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-sm text-slate-300">
            Chargement…
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-[320px_1fr]">
            {/* Teams */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-lg shadow-black/30">
              <div className="mb-3 text-sm font-semibold text-white">Équipes</div>

              <div className="space-y-2">
                {teamList.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTeamId(t.id)}
                    className={cn(
                      "w-full rounded-xl border p-3 text-left transition",
                      selectedTeamId === t.id
                        ? "border-sky-500/40 bg-sky-500/10"
                        : "border-white/10 bg-slate-950/30 hover:bg-white/5"
                    )}
                  >
                    <div className="text-sm font-semibold text-white">{t.label}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-400">
                      <Badge>
                        {t.athlete_count}/{t.max_athletes} athlètes
                      </Badge>
                      <Badge>Niv {t.niveau}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Staff */}
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg shadow-black/30">
              {!selectedTeam ? (
                <div className="text-sm text-slate-300">Sélectionne une équipe.</div>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-white">{selectedTeam.label}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        {selectedTeam.athlete_count} athlètes • Capacité {selectedTeam.max_athletes} • Niveau {selectedTeam.niveau}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Btn tone="sky" onClick={() => setOpenCreateCoach(true)}>
                        + Ajouter un coach
                      </Btn>
                      <Btn tone="sky" onClick={() => setOpenCreateAssist(true)}>
                        + Ajouter un assist coach
                      </Btn>
                      <Btn tone="emerald" onClick={saveTeam} disabled={saving}>
                        {saving ? "Enregistrement…" : "Enregistrer"}
                      </Btn>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    {/* Coaches panel */}
                    <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-sm font-semibold text-white">Coachs</div>
                        <Badge>{selectedCoachs.length} sélectionné(s)</Badge>
                      </div>

                      <div className="mb-3">
                        <input
                          value={qCoach}
                          onChange={(e) => setQCoach(e.target.value)}
                          placeholder="Rechercher un coach…"
                          className="h-9 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-sky-500/60"
                        />
                      </div>

                      {/* Selected list */}
                      <div className="mb-4">
                        <div className="mb-2 text-xs font-semibold text-slate-300">Sélection (équipe)</div>
                        {selectedCoachs.length === 0 ? (
                          <div className="text-sm text-slate-400">Aucun coach affecté.</div>
                        ) : (
                          <div className="space-y-2">
                            {selectedCoachs.map((p) => (
                              <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-slate-100">{personLabel(p)}</div>
                                  <div className="mt-0.5 text-xs text-slate-400">{personMeta(p, "Coach")}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <TinyBtn tone="sky" onClick={() => openEditLevels("coach", p.id)}>Modifier</TinyBtn>
                                  <TinyBtn
                                    tone="rose"
                                    onClick={() => setCoachIds((prev) => prev.filter((x) => x !== p.id))}
                                  >
                                    Retirer
                                  </TinyBtn>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Available list (lighter than select multiple) */}
                      <div>
                        <div className="mb-2 text-xs font-semibold text-slate-300">Liste (ajout rapide)</div>
                        <div className="max-h-[320px] overflow-auto rounded-xl border border-white/10 bg-slate-950/30">
                          {coachOptions.map((p) => {
                            const selected = selectedCoachSet.has(p.id);
                            return (
                              <div
                                key={p.id}
                                className={cn(
                                  "flex items-center justify-between gap-3 border-b border-white/5 px-3 py-2",
                                  selected ? "bg-sky-500/10" : "hover:bg-white/5"
                                )}
                              >
                                <div className="min-w-0">
                                  <div className="truncate text-sm text-slate-100">{personLabel(p)}</div>
                                  <div className="mt-0.5 text-xs text-slate-400">{personMeta(p, "Coach")}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <TinyBtn tone="sky" onClick={() => openEditLevels("coach", p.id)}>Modifier</TinyBtn>
                                  {selected ? (
                                    <TinyBtn tone="rose" onClick={() => setCoachIds((prev) => prev.filter((x) => x !== p.id))}>
                                      Retirer
                                    </TinyBtn>
                                  ) : (
                                    <TinyBtn tone="emerald" onClick={() => setCoachIds((prev) => uniq([...prev, p.id]))}>
                                      Ajouter
                                    </TinyBtn>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {!coachOptions.length ? (
                            <div className="p-3 text-sm text-slate-400">Aucun résultat.</div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Assists panel */}
                    <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-sm font-semibold text-white">Assist coachs</div>
                        <Badge>{selectedAssists.length} sélectionné(s)</Badge>
                      </div>

                      <div className="mb-3">
                        <input
                          value={qAssist}
                          onChange={(e) => setQAssist(e.target.value)}
                          placeholder="Rechercher un assist coach…"
                          className="h-9 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-sky-500/60"
                        />
                      </div>

                      {/* Selected list */}
                      <div className="mb-4">
                        <div className="mb-2 text-xs font-semibold text-slate-300">Sélection (équipe)</div>
                        {selectedAssists.length === 0 ? (
                          <div className="text-sm text-slate-400">Aucun assist coach affecté.</div>
                        ) : (
                          <div className="space-y-2">
                            {selectedAssists.map((p) => (
                              <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-slate-100">{personLabel(p)}</div>
                                  <div className="mt-0.5 text-xs text-slate-400">{personMeta(p, "Assist")}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <TinyBtn tone="sky" onClick={() => openEditLevels("assist", p.id)}>Modifier</TinyBtn>
                                  <TinyBtn
                                    tone="rose"
                                    onClick={() => setAssistIds((prev) => prev.filter((x) => x !== p.id))}
                                  >
                                    Retirer
                                  </TinyBtn>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Available list */}
                      <div>
                        <div className="mb-2 text-xs font-semibold text-slate-300">Liste (ajout rapide)</div>
                        <div className="max-h-[320px] overflow-auto rounded-xl border border-white/10 bg-slate-950/30">
                          {assistOptions.map((p) => {
                            const selected = selectedAssistSet.has(p.id);
                            return (
                              <div
                                key={p.id}
                                className={cn(
                                  "flex items-center justify-between gap-3 border-b border-white/5 px-3 py-2",
                                  selected ? "bg-emerald-500/10" : "hover:bg-white/5"
                                )}
                              >
                                <div className="min-w-0">
                                  <div className="truncate text-sm text-slate-100">{personLabel(p)}</div>
                                  <div className="mt-0.5 text-xs text-slate-400">{personMeta(p, "Assist")}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <TinyBtn tone="sky" onClick={() => openEditLevels("assist", p.id)}>Modifier</TinyBtn>
                                  {selected ? (
                                    <TinyBtn tone="rose" onClick={() => setAssistIds((prev) => prev.filter((x) => x !== p.id))}>
                                      Retirer
                                    </TinyBtn>
                                  ) : (
                                    <TinyBtn tone="emerald" onClick={() => setAssistIds((prev) => uniq([...prev, p.id]))}>
                                      Ajouter
                                    </TinyBtn>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          {!assistOptions.length ? (
                            <div className="p-3 text-sm text-slate-400">Aucun résultat.</div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-[11px] text-slate-400">
                    Astuce : clique sur <span className="text-slate-200">Modifier</span> pour changer les niveaux d’un coach/assist
                    (coaching + formation).
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Modal edit levels */}
        <Modal
          open={openEdit}
          title={`Modifier niveaux — ${editKind === "coach" ? "Coach" : "Assist coach"}`}
          onClose={() => setOpenEdit(false)}
        >
          <div className="grid gap-3">
            <LevelSelect label="Niveau coaching (1–4)" value={editCoachingLevel} onChange={setEditCoachingLevel} />
            <LevelSelect label="Niveau formation (1–4)" value={editFormationLevel} onChange={setEditFormationLevel} />

            <div className="flex justify-end gap-2 pt-2">
              <Btn tone="slate" onClick={() => setOpenEdit(false)}>Annuler</Btn>
              <Btn tone="emerald" onClick={saveLevels}>Enregistrer</Btn>
            </div>

            <div className="text-[11px] text-slate-400">
              Requiert l’action API <span className="text-slate-200">STAFF_PERSON_UPDATE_LEVELS</span> côté backend.
            </div>
          </div>
        </Modal>

        {/* Modal create coach */}
        <Modal open={openCreateCoach} title="Créer un coach" onClose={() => setOpenCreateCoach(false)}>
          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Prénom" value={newCoach.prenom} onChange={(v) => setNewCoach((s) => ({ ...s, prenom: v }))} />
              <Field label="Nom" value={newCoach.nom} onChange={(v) => setNewCoach((s) => ({ ...s, nom: v }))} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Email" value={newCoach.email} onChange={(v) => setNewCoach((s) => ({ ...s, email: v }))} />
              <Field label="Téléphone" value={newCoach.telephone} onChange={(v) => setNewCoach((s) => ({ ...s, telephone: v }))} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <LevelSelect label="Niveau coaching" value={newCoach.coaching_level} onChange={(v) => setNewCoach((s) => ({ ...s, coaching_level: v }))} />
              <LevelSelect label="Niveau formation" value={newCoach.formation_level} onChange={(v) => setNewCoach((s) => ({ ...s, formation_level: v }))} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Btn tone="slate" onClick={() => setOpenCreateCoach(false)}>Annuler</Btn>
              <Btn tone="emerald" onClick={createCoach}>Créer</Btn>
            </div>

            <div className="text-[11px] text-slate-400">
              Requiert l’action API <span className="text-slate-200">COACH_CREATE</span> côté backend.
            </div>
          </div>
        </Modal>

        {/* Modal create assist */}
        <Modal open={openCreateAssist} title="Créer un assist coach" onClose={() => setOpenCreateAssist(false)}>
          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Prénom" value={newAssist.prenom} onChange={(v) => setNewAssist((s) => ({ ...s, prenom: v }))} />
              <Field label="Nom" value={newAssist.nom} onChange={(v) => setNewAssist((s) => ({ ...s, nom: v }))} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Email" value={newAssist.email} onChange={(v) => setNewAssist((s) => ({ ...s, email: v }))} />
              <Field label="Téléphone" value={newAssist.telephone} onChange={(v) => setNewAssist((s) => ({ ...s, telephone: v }))} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <LevelSelect label="Niveau coaching" value={newAssist.coaching_level} onChange={(v) => setNewAssist((s) => ({ ...s, coaching_level: v }))} />
              <LevelSelect label="Niveau formation" value={newAssist.formation_level} onChange={(v) => setNewAssist((s) => ({ ...s, formation_level: v }))} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Btn tone="slate" onClick={() => setOpenCreateAssist(false)}>Annuler</Btn>
              <Btn tone="emerald" onClick={createAssist}>Créer</Btn>
            </div>

            <div className="text-[11px] text-slate-400">
              Requiert l’action API <span className="text-slate-200">ASSIST_CREATE</span> côté backend.
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
