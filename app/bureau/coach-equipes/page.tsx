"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

function cn(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

type Equipe = {
  id: string;
  saison: string;
  code: string;
  label: string;
  categorie: string | null;
  type_equipe: string | null;
  actif: boolean;
  ordre: number;
  created_at: string;
};

type Coach = {
  id: string;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  role_label: string | null;
  bio: string | null;
  photo_url: string | null;
  actif: boolean;
  ordre: number;
  created_at: string;
};

type Assistant = {
  id: string;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  bio: string | null;
  actif: boolean;
  ordre: number;
  created_at: string;
};

type AthleteLite = {
  id: string;
  prenom: string | null;
  nom: string | null;
  saison: string;
};

type StaffRow = {
  id: string;
  saison: string;
  equipe_id: string;
  role: "head" | "coach" | "assist";
  coach_id: string | null;
  assistant_id: string | null;
  athlete_id: string | null;
  created_at: string;
};

type Competition = {
  id: string;
  saison: string;
  nom: string;
  niveau: string | null;
  date_debut: string | null;
  date_fin: string | null;
  lieu: string | null;
  notes: string | null;
  actif: boolean;
  ordre: number;
  created_at: string;
};

type EquipeCompetition = {
  id: string;
  saison: string;
  equipe_id: string;
  competition_id: string;
  created_at: string;
};

type EssaisEquipe = {
  id: number;
  saison: string;
  team_key: string;
  team_order: number;
  essai1_date: string | null;
  essai1_start: string | null;
  essai1_end: string | null;
  essai1_gymnase: string | null;
  essai2_date: string | null;
  essai2_start: string | null;
  essai2_end: string | null;
  essai2_gymnase: string | null;
  inserted_at: string | null;
};

async function apiGet(saison: string) {
  const r = await fetch(`/api/coach-equipes/get?saison=${encodeURIComponent(saison)}`, { cache: "no-store" });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error || "Erreur chargement");
  return j as {
    equipes: Equipe[];
    coachs: Coach[];
    assistants: Assistant[];
    athletes: AthleteLite[];
    staff: StaffRow[];
    competitions: Competition[];
    equipesCompetitions: EquipeCompetition[];
    essais: EssaisEquipe[];
  };
}

async function apiSave(action: any) {
  const r = await fetch("/api/coach-equipes/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error || "Erreur sauvegarde");
  return j;
}

function SectionTitle({ kicker, title, desc }: { kicker: string; title: string; desc?: string }) {
  return (
    <div className="mb-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-400">{kicker}</div>
      <div className="mt-1 text-xl font-bold text-white">{title}</div>
      {desc ? <div className="mt-1 text-sm text-slate-300">{desc}</div> : null}
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

function Btn({
  children,
  onClick,
  tone = "slate",
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "slate" | "sky" | "emerald" | "pink";
}) {
  const cls =
    tone === "emerald"
      ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-900/30"
      : tone === "sky"
      ? "bg-sky-500 hover:bg-sky-600 shadow-sky-900/30"
      : tone === "pink"
      ? "bg-pink-500 hover:bg-pink-600 shadow-pink-900/30"
      : "bg-white/5 hover:bg-white/10 shadow-black/30";
  return (
    <button
      onClick={onClick}
      className={cn("h-9 rounded-xl px-4 text-xs font-semibold text-white shadow-md", cls)}
      type="button"
    >
      {children}
    </button>
  );
}

function Chip({
  label,
  tone = "slate",
}: {
  label: string;
  tone?: "slate" | "sky" | "emerald" | "pink";
}) {
  const cls =
    tone === "emerald"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
      : tone === "sky"
      ? "border-sky-500/30 bg-sky-500/10 text-sky-100"
      : tone === "pink"
      ? "border-pink-500/30 bg-pink-500/10 text-pink-100"
      : "border-white/10 bg-white/5 text-slate-200";
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs", cls)}>{label}</span>;
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

export default function BureauCoachEquipesPage() {
  const [saison, setSaison] = useState("2025-2026");
  const [selectedEquipeId, setSelectedEquipeId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [coachs, setCoachs] = useState<Coach[]>([]);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [athletes, setAthletes] = useState<AthleteLite[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [equipesCompetitions, setEquipesCompetitions] = useState<EquipeCompetition[]>([]);
  const [essais, setEssais] = useState<EssaisEquipe[]>([]);

  // UI state (local edits)
  const [headCoachId, setHeadCoachId] = useState<string>("");
  const [coachIds, setCoachIds] = useState<string[]>([]);
  const [assistantIds, setAssistantIds] = useState<string[]>([]);
  const [athleteAssistIds, setAthleteAssistIds] = useState<string[]>([]);
  const [teamCompetitionIds, setTeamCompetitionIds] = useState<string[]>([]);

  // ✅ MULTI-SELECTION (pour ajout en série)
  const [addCoachSelect, setAddCoachSelect] = useState<string[]>([]);
  const [addAssistantSelect, setAddAssistantSelect] = useState<string[]>([]);
  const [addAthleteAssistSelect, setAddAthleteAssistSelect] = useState<string[]>([]);
  const [addCompetitionSelect, setAddCompetitionSelect] = useState<string[]>([]);

  // modals
  const [openCoachModal, setOpenCoachModal] = useState(false);
  const [openAssistantModal, setOpenAssistantModal] = useState(false);
  const [openCompetitionModal, setOpenCompetitionModal] = useState(false);

  const [newCoach, setNewCoach] = useState({
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    role_label: "Coach",
    bio: "",
  });
  const [newAssistant, setNewAssistant] = useState({ prenom: "", nom: "", email: "", telephone: "", bio: "" });
  const [newCompetition, setNewCompetition] = useState({ nom: "", niveau: "", date_debut: "", date_fin: "", lieu: "" });

  function toast(msg: string) {
    setInfo(msg);
    window.clearTimeout((toast as any)._t);
    (toast as any)._t = window.setTimeout(() => setInfo(null), 2500);
  }

  async function reload(keepSelection = true) {
    setLoading(true);
    setErr(null);
    try {
      const data = await apiGet(saison);

      setEquipes(data.equipes ?? []);
      setCoachs(data.coachs ?? []);
      setAssistants(data.assistants ?? []);
      setAthletes(data.athletes ?? []);
      setStaff(data.staff ?? []);
      setCompetitions(data.competitions ?? []);
      setEquipesCompetitions(data.equipesCompetitions ?? []);
      setEssais(data.essais ?? []);

      if (!keepSelection || !selectedEquipeId) {
        const firstTeam = (data.equipes?.[0]?.id ?? "") as string;
        setSelectedEquipeId(firstTeam);
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

  const teamList = useMemo(() => equipes.slice().sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)), [equipes]);
  const selectedEquipe = useMemo(() => teamList.find((t) => t.id === selectedEquipeId) ?? null, [teamList, selectedEquipeId]);

  const coachOptions = useMemo(() => coachs.filter((c) => c.actif).sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)), [coachs]);
  const assistantOptions = useMemo(() => assistants.filter((a) => a.actif).sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)), [assistants]);

  const athleteOptions = useMemo(() => {
    return athletes
      .map((a) => ({
        id: a.id,
        label: `${(a.prenom ?? "").trim()} ${(a.nom ?? "").trim()}`.trim() || a.id,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [athletes]);

  const competitionOptions = useMemo(() => competitions.filter((c) => c.actif).sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)), [competitions]);

  const labelCoach = useMemo(() => {
    const m = new Map(coachOptions.map((c) => [c.id, `${c.prenom} ${c.nom}`]));
    return (id: string) => m.get(id) || id;
  }, [coachOptions]);

  const labelAssistant = useMemo(() => {
    const m = new Map(assistantOptions.map((a) => [a.id, `${a.prenom} ${a.nom}`]));
    return (id: string) => m.get(id) || id;
  }, [assistantOptions]);

  const labelAthlete = useMemo(() => {
    const m = new Map(athleteOptions.map((a) => [a.id, a.label]));
    return (id: string) => m.get(id) || id;
  }, [athleteOptions]);

  const labelCompetition = useMemo(() => {
    const m = new Map(competitionOptions.map((c) => [c.id, `${c.nom}${c.niveau ? ` — ${c.niveau}` : ""}`]));
    return (id: string) => m.get(id) || id;
  }, [competitionOptions]);

  // hydrate local state from DB when team changes
  useEffect(() => {
    if (!selectedEquipe) return;

    const rows = staff.filter((s) => s.saison === saison && s.equipe_id === selectedEquipe.id);

    const head = rows.find((r) => r.role === "head" && r.coach_id);
    const coachesIds = rows.filter((r) => r.role === "coach" && r.coach_id).map((r) => r.coach_id!) ?? [];
    const assistsAssistants = rows.filter((r) => r.role === "assist" && r.assistant_id).map((r) => r.assistant_id!) ?? [];
    const assistsAthletes = rows.filter((r) => r.role === "assist" && r.athlete_id).map((r) => r.athlete_id!) ?? [];

    setHeadCoachId(head?.coach_id ?? "");
    setCoachIds(coachesIds);
    setAssistantIds(assistsAssistants);
    setAthleteAssistIds(assistsAthletes);

    const comps = equipesCompetitions
      .filter((x) => x.saison === saison && x.equipe_id === selectedEquipe.id)
      .map((x) => x.competition_id);

    setTeamCompetitionIds(comps);

    // reset selects
    setAddCoachSelect([]);
    setAddAssistantSelect([]);
    setAddAthleteAssistSelect([]);
    setAddCompetitionSelect([]);
  }, [selectedEquipeId, saison, staff, equipesCompetitions, selectedEquipe]);

  // live summary
  const liveEncadrement = useMemo(() => {
    const head = headCoachId ? labelCoach(headCoachId) : null;
    const others = coachIds.map(labelCoach);
    const assistsA = assistantIds.map(labelAssistant);
    const assistsAth = athleteAssistIds.map(labelAthlete);

    return { head, others, assistsA, assistsAth };
  }, [headCoachId, coachIds, assistantIds, athleteAssistIds, labelCoach, labelAssistant, labelAthlete]);

  // actions
  async function saveStaff() {
    if (!selectedEquipe) return;
    setErr(null);
    try {
      await apiSave({
        type: "SET_TEAM_STAFF",
        payload: {
          saison,
          equipe_id: selectedEquipe.id,
          head_coach_id: headCoachId || null,
          coach_ids: coachIds,
          assistant_ids: assistantIds,
          athlete_ids: athleteAssistIds,
        },
      });
      toast("✅ Encadrement enregistré");
      await reload(true);
    } catch (e: any) {
      setErr(e?.message || "Erreur sauvegarde");
    }
  }

  async function saveCompetitions() {
    if (!selectedEquipe) return;
    setErr(null);
    try {
      await apiSave({
        type: "SET_TEAM_COMPETITIONS",
        payload: {
          saison,
          equipe_id: selectedEquipe.id,
          competition_ids: teamCompetitionIds,
        },
      });
      toast("✅ Compétitions enregistrées");
      await reload(true);
    } catch (e: any) {
      setErr(e?.message || "Erreur sauvegarde");
    }
  }

  async function createCoach() {
    setErr(null);
    const res = await apiSave({
      type: "COACH_CREATE",
      payload: {
        prenom: newCoach.prenom.trim(),
        nom: newCoach.nom.trim(),
        email: newCoach.email.trim() || null,
        telephone: newCoach.telephone.trim() || null,
        role_label: newCoach.role_label.trim() || null,
        bio: newCoach.bio.trim() || null,
      },
    });
    setOpenCoachModal(false);
    setNewCoach({ prenom: "", nom: "", email: "", telephone: "", role_label: "Coach", bio: "" });

    if (res?.item?.id) {
      setCoachIds((prev) => Array.from(new Set([...prev, res.item.id])));
      toast("➕ Coach créé et ajouté à l’encadrement");
    }
    await reload(true);
  }

  async function createAssistant() {
    setErr(null);
    const res = await apiSave({
      type: "ASSISTANT_CREATE",
      payload: {
        prenom: newAssistant.prenom.trim(),
        nom: newAssistant.nom.trim(),
        email: newAssistant.email.trim() || null,
        telephone: newAssistant.telephone.trim() || null,
        bio: newAssistant.bio.trim() || null,
      },
    });
    setOpenAssistantModal(false);
    setNewAssistant({ prenom: "", nom: "", email: "", telephone: "", bio: "" });

    if (res?.item?.id) {
      setAssistantIds((prev) => Array.from(new Set([...prev, res.item.id])));
      toast("➕ Assist créé et ajouté à l’encadrement");
    }
    await reload(true);
  }

  async function createCompetition() {
    if (!selectedEquipe) return;
    setErr(null);
    const res = await apiSave({
      type: "COMPETITION_CREATE",
      payload: {
        saison,
        nom: newCompetition.nom.trim(),
        niveau: newCompetition.niveau.trim() || null,
        date_debut: newCompetition.date_debut || null,
        date_fin: newCompetition.date_fin || null,
        lieu: newCompetition.lieu.trim() || null,
      },
    });
    setOpenCompetitionModal(false);
    setNewCompetition({ nom: "", niveau: "", date_debut: "", date_fin: "", lieu: "" });

    if (res?.item?.id) {
      setTeamCompetitionIds((prev) => Array.from(new Set([...prev, res.item.id])));
      toast("➕ Compétition créée et ajoutée à l’équipe");
    }
    await reload(true);
  }

  // helpers: get selected values from <select multiple>
  function selectedValues(e: React.ChangeEvent<HTMLSelectElement>) {
    return Array.from(e.target.selectedOptions).map((o) => o.value).filter(Boolean);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10">
        <header className="mb-8 border-b border-white/5 pb-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-400">Espace bureau</div>
              <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">Coachs & Équipes</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                1) Choisis la saison 2) Choisis l’équipe 3) Configure encadrement et compétitions.
                <br />
                <span className="text-slate-400">(Les coachs/assistants sont globaux : un actif est sélectionnable pour toutes les équipes.)</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-300">Saison</span>
                <input
                  value={saison}
                  onChange={(e) => setSaison(e.target.value)}
                  placeholder="ex: 2025-2026"
                  className="h-9 w-36 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-sky-500/60"
                />
              </label>

              <Link
                href="/bureau/preparer-saison"
                className="inline-flex items-center rounded-full border border-slate-600 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-100 hover:border-slate-400"
              >
                ← Retour préparation saison
              </Link>

              <Btn tone="slate" onClick={() => reload(true)}>Rafraîchir</Btn>
            </div>
          </div>
        </header>

        {info ? (
          <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
            {info}
          </div>
        ) : null}

        {err ? (
          <div className="mb-6 rounded-2xl border border-pink-500/30 bg-pink-500/10 p-4 text-sm text-pink-100">{err}</div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-sm text-slate-300">Chargement…</div>
        ) : (
          <>
            <div className="mb-6 rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-lg shadow-black/30">
              <SectionTitle kicker="Filtres" title="Saison & Équipe" desc="La saison pilote les équipes / essais / compétitions. L’encadrement est enregistré par saison + équipe." />
              <div className="flex flex-wrap items-end gap-3">
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-slate-300">Équipe</span>
                  <select
                    value={selectedEquipeId}
                    onChange={(e) => setSelectedEquipeId(e.target.value)}
                    className="h-9 min-w-[280px] rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-sky-500/60"
                  >
                    <option value="">— Sélectionner —</option>
                    {teamList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label} ({t.code})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {!selectedEquipe ? (
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-sm text-slate-300">
                Sélectionne une équipe pour afficher l’encadrement et les compétitions.
              </div>
            ) : (
              <div className="grid gap-6">
                {/* STEP 1: Encadrement */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg shadow-black/30">
                  <SectionTitle
                    kicker="Étape 1"
                    title={`Encadrement — ${selectedEquipe.label}`}
                    desc="Coach principal + coachs + assist coachs (assistants ou athlètes)."
                  />

                  <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-100">Encadrement actuel (en cours)</div>
                      <div className="text-[11px] text-slate-400">(Se met à jour immédiatement sur tes ajouts/retraits.)</div>
                    </div>

                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                        <div className="text-xs font-semibold text-slate-200">Coach principal</div>
                        <div className="mt-2">
                          {liveEncadrement.head ? <Chip tone="sky" label={liveEncadrement.head} /> : <span className="text-sm text-slate-400">— Aucun —</span>}
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                        <div className="text-xs font-semibold text-slate-200">Coachs (équipe)</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {liveEncadrement.others.length ? liveEncadrement.others.map((x) => <Chip key={x} label={x} />) : <span className="text-sm text-slate-400">— Aucun —</span>}
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                        <div className="text-xs font-semibold text-slate-200">Assist (assistants)</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {liveEncadrement.assistsA.length ? liveEncadrement.assistsA.map((x) => <Chip key={x} tone="emerald" label={x} />) : <span className="text-sm text-slate-400">— Aucun —</span>}
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                        <div className="text-xs font-semibold text-slate-200">Assist (athlètes)</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {liveEncadrement.assistsAth.length ? liveEncadrement.assistsAth.map((x) => <Chip key={x} tone="emerald" label={x} />) : <span className="text-sm text-slate-400">— Aucun —</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Left: head coach + create buttons */}
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-2 text-xs font-semibold text-slate-200">Coach principal</div>
                      <select
                        value={headCoachId}
                        onChange={(e) => {
                          setHeadCoachId(e.target.value);
                          toast(e.target.value ? "✅ Coach principal sélectionné" : "ℹ️ Coach principal retiré");
                        }}
                        className="h-9 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none focus:border-sky-500/60"
                      >
                        <option value="">— Sélectionner —</option>
                        {coachOptions.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.prenom} {c.nom}
                          </option>
                        ))}
                      </select>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Btn tone="sky" onClick={() => setOpenCoachModal(true)}>+ Créer un coach</Btn>
                        <Btn tone="sky" onClick={() => setOpenAssistantModal(true)}>+ Créer un assist</Btn>
                      </div>

                      <div className="mt-4 border-t border-white/10 pt-4">
                        <div className="text-xs font-semibold text-slate-200">Sauvegarde</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Btn tone="emerald" onClick={saveStaff}>Enregistrer l’encadrement</Btn>
                        </div>
                        <div className="mt-2 text-[11px] text-slate-400">
                          Astuce : tu peux ajouter/retirer autant que tu veux, puis “Enregistrer”.
                        </div>
                      </div>
                    </div>

                    {/* Right: lists */}
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-2 text-xs font-semibold text-slate-200">Autres coachs</div>

                      <div className="flex flex-wrap items-end gap-2">
                        <label className="grid flex-1 gap-1">
                          <span className="text-xs font-semibold text-slate-300">Ajouter des coachs (multi)</span>
                          <select
                            multiple
                            size={6}
                            value={addCoachSelect}
                            onChange={(e) => setAddCoachSelect(selectedValues(e))}
                            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/60"
                          >
                            {coachOptions
                              .filter((c) => c.id !== headCoachId && !coachIds.includes(c.id))
                              .map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.prenom} {c.nom}
                                </option>
                              ))}
                          </select>
                          <div className="text-[11px] text-slate-400">Tip : Cmd+clic pour sélectionner plusieurs.</div>
                        </label>

                        <Btn
                          tone="emerald"
                          onClick={() => {
                            if (!addCoachSelect.length) return;
                            setCoachIds((prev) => Array.from(new Set([...prev, ...addCoachSelect])));
                            toast(`➕ ${addCoachSelect.length} coach(s) ajouté(s)`);
                            setAddCoachSelect([]);
                          }}
                        >
                          Ajouter
                        </Btn>
                      </div>

                      <div className="mt-3 space-y-2">
                        {coachIds.length === 0 ? (
                          <div className="text-sm text-slate-400">Aucun coach ajouté.</div>
                        ) : (
                          coachIds.map((id) => (
                            <div key={id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-950/40 p-3">
                              <div className="text-sm text-white">{labelCoach(id)}</div>
                              <Btn
                                tone="pink"
                                onClick={() => {
                                  setCoachIds((prev) => prev.filter((x) => x !== id));
                                  toast("➖ Coach retiré");
                                }}
                              >
                                Retirer
                              </Btn>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="mt-5 border-t border-white/10 pt-4">
                        <div className="mb-2 text-xs font-semibold text-slate-200">Assist coachs (assistants)</div>

                        <div className="flex flex-wrap items-end gap-2">
                          <label className="grid flex-1 gap-1">
                            <span className="text-xs font-semibold text-slate-300">Ajouter des assists (multi)</span>
                            <select
                              multiple
                              size={6}
                              value={addAssistantSelect}
                              onChange={(e) => setAddAssistantSelect(selectedValues(e))}
                              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/60"
                            >
                              {assistantOptions
                                .filter((a) => !assistantIds.includes(a.id))
                                .map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.prenom} {a.nom}
                                  </option>
                                ))}
                            </select>
                            <div className="text-[11px] text-slate-400">Tip : Cmd+clic pour sélectionner plusieurs.</div>
                          </label>

                          <Btn
                            tone="emerald"
                            onClick={() => {
                              if (!addAssistantSelect.length) return;
                              setAssistantIds((prev) => Array.from(new Set([...prev, ...addAssistantSelect])));
                              toast(`➕ ${addAssistantSelect.length} assist(s) ajouté(s)`);
                              setAddAssistantSelect([]);
                            }}
                          >
                            Ajouter
                          </Btn>
                        </div>

                        <div className="mt-3 space-y-2">
                          {assistantIds.length === 0 ? (
                            <div className="text-sm text-slate-400">Aucun assist (assistant) ajouté.</div>
                          ) : (
                            assistantIds.map((id) => (
                              <div key={id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-950/40 p-3">
                                <div className="text-sm text-white">{labelAssistant(id)}</div>
                                <Btn
                                  tone="pink"
                                  onClick={() => {
                                    setAssistantIds((prev) => prev.filter((x) => x !== id));
                                    toast("➖ Assist (assistant) retiré");
                                  }}
                                >
                                  Retirer
                                </Btn>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="mt-5 border-t border-white/10 pt-4">
                        <div className="mb-2 text-xs font-semibold text-slate-200">Assist coachs (athlètes)</div>

                        <div className="flex flex-wrap items-end gap-2">
                          <label className="grid flex-1 gap-1">
                            <span className="text-xs font-semibold text-slate-300">Ajouter des athlètes (multi)</span>
                            <select
                              multiple
                              size={6}
                              value={addAthleteAssistSelect}
                              onChange={(e) => setAddAthleteAssistSelect(selectedValues(e))}
                              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/60"
                            >
                              {athleteOptions
                                .filter((a) => !athleteAssistIds.includes(a.id))
                                .map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.label}
                                  </option>
                                ))}
                            </select>
                            <div className="text-[11px] text-slate-400">Tip : Cmd+clic pour sélectionner plusieurs.</div>
                          </label>

                          <Btn
                            tone="emerald"
                            onClick={() => {
                              if (!addAthleteAssistSelect.length) return;
                              setAthleteAssistIds((prev) => Array.from(new Set([...prev, ...addAthleteAssistSelect])));
                              toast(`➕ ${addAthleteAssistSelect.length} athlète(s) ajouté(s)`);
                              setAddAthleteAssistSelect([]);
                            }}
                          >
                            Ajouter
                          </Btn>
                        </div>

                        <div className="mt-3 space-y-2">
                          {athleteAssistIds.length === 0 ? (
                            <div className="text-sm text-slate-400">Aucun assist (athlète) ajouté.</div>
                          ) : (
                            athleteAssistIds.map((id) => (
                              <div key={id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-950/40 p-3">
                                <div className="text-sm text-white">{labelAthlete(id)}</div>
                                <Btn
                                  tone="pink"
                                  onClick={() => {
                                    setAthleteAssistIds((prev) => prev.filter((x) => x !== id));
                                    toast("➖ Assist (athlète) retiré");
                                  }}
                                >
                                  Retirer
                                </Btn>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* STEP 2: Competitions */}
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg shadow-black/30">
                  <SectionTitle kicker="Étape 2" title="Compétitions" desc="Crée des compétitions puis rattache-les à l’équipe. Sauvegarde en un clic." />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-2 text-xs font-semibold text-slate-200">Ajouter des compétitions (multi)</div>

                      <div className="flex flex-wrap items-end gap-2">
                        <label className="grid flex-1 gap-1">
                          <span className="text-xs font-semibold text-slate-300">Compétitions</span>
                          <select
                            multiple
                            size={6}
                            value={addCompetitionSelect}
                            onChange={(e) => setAddCompetitionSelect(selectedValues(e))}
                            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/60"
                          >
                            {competitionOptions
                              .filter((c) => !teamCompetitionIds.includes(c.id))
                              .map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.nom}{c.niveau ? ` — ${c.niveau}` : ""}
                                </option>
                              ))}
                          </select>
                          <div className="text-[11px] text-slate-400">Tip : Cmd+clic pour sélectionner plusieurs.</div>
                        </label>

                        <Btn
                          tone="emerald"
                          onClick={() => {
                            if (!addCompetitionSelect.length) return;
                            setTeamCompetitionIds((prev) => Array.from(new Set([...prev, ...addCompetitionSelect])));
                            toast(`➕ ${addCompetitionSelect.length} compétition(s) ajoutée(s)`);
                            setAddCompetitionSelect([]);
                          }}
                        >
                          Ajouter
                        </Btn>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Btn tone="sky" onClick={() => setOpenCompetitionModal(true)}>+ Créer une compétition</Btn>
                        <Btn tone="emerald" onClick={saveCompetitions}>Enregistrer les compétitions</Btn>
                      </div>

                      <div className="mt-3 text-[11px] text-slate-400">Tu peux en ajouter plusieurs puis “Enregistrer”.</div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-2 text-xs font-semibold text-slate-200">Compétitions sélectionnées</div>
                      {teamCompetitionIds.length === 0 ? (
                        <div className="text-sm text-slate-400">Aucune compétition.</div>
                      ) : (
                        <div className="space-y-2">
                          {teamCompetitionIds.map((id) => (
                            <div key={id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-950/40 p-3">
                              <div className="text-sm text-white">{labelCompetition(id)}</div>
                              <Btn
                                tone="pink"
                                onClick={() => {
                                  setTeamCompetitionIds((prev) => prev.filter((x) => x !== id));
                                  toast("➖ Compétition retirée");
                                }}
                              >
                                Retirer
                              </Btn>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* MODAL: create coach */}
        <Modal open={openCoachModal} title="Créer un coach (global)" onClose={() => setOpenCoachModal(false)}>
          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Prénom" value={newCoach.prenom} onChange={(v) => setNewCoach((s) => ({ ...s, prenom: v }))} />
              <Field label="Nom" value={newCoach.nom} onChange={(v) => setNewCoach((s) => ({ ...s, nom: v }))} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Email" value={newCoach.email} onChange={(v) => setNewCoach((s) => ({ ...s, email: v }))} />
              <Field label="Téléphone" value={newCoach.telephone} onChange={(v) => setNewCoach((s) => ({ ...s, telephone: v }))} />
            </div>
            <Field label="Rôle (texte)" value={newCoach.role_label} onChange={(v) => setNewCoach((s) => ({ ...s, role_label: v }))} />
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-300">Bio (optionnel)</span>
              <textarea
                value={newCoach.bio}
                onChange={(e) => setNewCoach((s) => ({ ...s, bio: e.target.value }))}
                rows={3}
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/60"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Btn tone="slate" onClick={() => setOpenCoachModal(false)}>Annuler</Btn>
              <Btn tone="emerald" onClick={createCoach}>Créer</Btn>
            </div>
          </div>
        </Modal>

        {/* MODAL: create assistant */}
        <Modal open={openAssistantModal} title="Créer un assist coach (global)" onClose={() => setOpenAssistantModal(false)}>
          <div className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Prénom" value={newAssistant.prenom} onChange={(v) => setNewAssistant((s) => ({ ...s, prenom: v }))} />
              <Field label="Nom" value={newAssistant.nom} onChange={(v) => setNewAssistant((s) => ({ ...s, nom: v }))} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Email" value={newAssistant.email} onChange={(v) => setNewAssistant((s) => ({ ...s, email: v }))} />
              <Field label="Téléphone" value={newAssistant.telephone} onChange={(v) => setNewAssistant((s) => ({ ...s, telephone: v }))} />
            </div>
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-300">Bio (optionnel)</span>
              <textarea
                value={newAssistant.bio}
                onChange={(e) => setNewAssistant((s) => ({ ...s, bio: e.target.value }))}
                rows={3}
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/60"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Btn tone="slate" onClick={() => setOpenAssistantModal(false)}>Annuler</Btn>
              <Btn tone="emerald" onClick={createAssistant}>Créer</Btn>
            </div>
          </div>
        </Modal>

        {/* MODAL: create competition */}
        <Modal open={openCompetitionModal} title={`Créer une compétition (${saison})`} onClose={() => setOpenCompetitionModal(false)}>
          <div className="grid gap-3">
            <Field
              label="Nom"
              value={newCompetition.nom}
              onChange={(v) => setNewCompetition((s) => ({ ...s, nom: v }))}
              placeholder="ex: Championnat de France"
            />
            <Field
              label="Niveau (optionnel)"
              value={newCompetition.niveau}
              onChange={(v) => setNewCompetition((s) => ({ ...s, niveau: v }))}
              placeholder="Régional / National / Open..."
            />
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Date début" type="date" value={newCompetition.date_debut} onChange={(v) => setNewCompetition((s) => ({ ...s, date_debut: v }))} />
              <Field label="Date fin" type="date" value={newCompetition.date_fin} onChange={(v) => setNewCompetition((s) => ({ ...s, date_fin: v }))} />
            </div>
            <Field
              label="Lieu (optionnel)"
              value={newCompetition.lieu}
              onChange={(v) => setNewCompetition((s) => ({ ...s, lieu: v }))}
              placeholder="Ville / gymnase"
            />
            <div className="flex justify-end gap-2">
              <Btn tone="slate" onClick={() => setOpenCompetitionModal(false)}>Annuler</Btn>
              <Btn tone="emerald" onClick={createCompetition}>Créer</Btn>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
