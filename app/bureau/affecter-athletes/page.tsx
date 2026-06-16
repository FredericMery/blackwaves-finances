"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AthleteRow = {
  id: string;
  prenom: string;
  nom: string;
  date_naissance: string | null;
  saison: string;
  equipe: string | null;
  categorie?: string | null;
};

type TeamRow = {
  id: string;
  saison: string;
  type_code: string;
  niveau: number;
  label: string;
  max_athletes: number;
  actif: boolean;
  ordre: number;
};

type AssignmentRow = {
  athlete_id: string;
  equipe: string;
};

type TeamItem = {
  uid: string;
  athlete_id: string;
};

function cn(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function getSeasonFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const u = new URL(window.location.href);
  const s = (u.searchParams.get("saison") || "").trim();
  return s || null;
}

async function fetchPreparedSeason(): Promise<string | null> {
  try {
    const res = await fetch("/api/season-preparation/get", { cache: "no-store" });
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.ok) return null;
    return (j.current_saison as string) || null;
  } catch {
    return null;
  }
}

function teamCode(t: Pick<TeamRow, "type_code" | "niveau">) {
  return `${String(t.type_code || "").toUpperCase()}_N${Number(t.niveau || 1)}`;
}

function labelForCategory(typeCode: string) {
  const c = String(typeCode || "").toUpperCase();
  if (c === "TINYS") return "Tinys";
  if (c === "MINIMES") return "Minimes";
  if (c === "CADETS") return "Cadets";
  if (c === "JUNIORS") return "Juniors";
  if (c === "SENIORS") return "Seniors";
  return c || "Autres";
}

function makeUid(prefix = "it") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

function norm(s: string) {
  return String(s || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/–/g, "-")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildTeamResolver(teams: TeamRow[]) {
  const byCode = new Map<string, string>();
  const byLabel = new Map<string, string>();
  const byId = new Map<string, string>();

  for (const t of teams) {
    const canon = teamCode(t);
    byCode.set(norm(canon), canon);
    byLabel.set(norm(t.label), canon);
    byId.set(String(t.id), canon);

    byCode.set(norm(`${t.type_code} N${t.niveau}`), canon);
    byCode.set(norm(`${t.type_code} ${t.niveau}`), canon);
    byCode.set(norm(`${t.type_code}_N${t.niveau}`), canon);
  }

  function resolve(raw: string | null | undefined): string | null {
    const v = String(raw || "").trim();
    if (!v) return null;

    if (byId.has(v)) return byId.get(v)!;

    const n = norm(v);
    if (byCode.has(n)) return byCode.get(n)!;
    if (byLabel.has(n)) return byLabel.get(n)!;

    const m1 = n.match(/^([A-Z]+)\s+N?(\d+)$/);
    if (m1) {
      const maybe = norm(`${m1[1]}_N${m1[2]}`);
      if (byCode.has(maybe)) return byCode.get(maybe)!;
    }
    return null;
  }

  return { resolve };
}

/** 🎨 Accent couleur par équipe (sans dépendance à Tailwind dynamique) */
function accentClasses(teamLabelOrCode: string) {
  const s = String(teamLabelOrCode || "").toUpperCase();
  if (s.includes("TINYS")) return "border-pink-400/25 bg-pink-500/5";
  if (s.includes("MINIMES")) return "border-sky-400/25 bg-sky-500/5";
  if (s.includes("CADETS")) return "border-violet-400/25 bg-violet-500/5";
  if (s.includes("JUNIORS")) return "border-amber-400/25 bg-amber-500/5";
  if (s.includes("SENIORS")) return "border-emerald-400/25 bg-emerald-500/5";
  return "border-slate-400/20 bg-slate-500/5";
}

export default function BureauAffecterAthletesPage() {
  const router = useRouter();

  const [preparedSeason, setPreparedSeason] = useState<string>("");
  const [isSynced, setIsSynced] = useState(true);
  const [targetSeason, setTargetSeason] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);

  const [athletes, setAthletes] = useState<AthleteRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [teamStaff, setTeamStaff] = useState<Record<string, string[]>>({});
  const [itemsByTeam, setItemsByTeam] = useState<Record<string, TeamItem[]>>({});

  useEffect(() => {
    (async () => {
      setErr(null);

      const fromUrl = getSeasonFromUrl();
      const fromDb = await fetchPreparedSeason();

      const chosen = (fromUrl || fromDb || "").trim();
      setPreparedSeason((fromDb || chosen).trim());
      setTargetSeason(chosen);

      if (fromDb && fromUrl && fromUrl !== fromDb) setIsSynced(false);
      else setIsSynced(true);
    })();
  }, []);

  useEffect(() => {
    if (!preparedSeason) return;
    const url = new URL(window.location.href);
    const sInUrl = url.searchParams.get("saison");
    if (!sInUrl || sInUrl !== preparedSeason) {
      router.replace(`/bureau/affecter-athletes?saison=${encodeURIComponent(preparedSeason)}`);
    }
  }, [preparedSeason, router]);

  const teamsOrdered = useMemo(() => {
    return [...teams].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
  }, [teams]);

  const athleteById = useMemo(() => {
    const m: Record<string, AthleteRow> = {};
    for (const a of athletes) m[a.id] = a;
    return m;
  }, [athletes]);

  async function load(seasonToLoad?: string) {
    const saison = (seasonToLoad || targetSeason || preparedSeason || "").trim();
    if (!saison) return;

    setLoading(true);
    setErr(null);
    setWarn(null);

    try {
      const qs = new URLSearchParams({ saison });
      const res = await fetch(`/api/affecter-athletes/get?${qs.toString()}`, {
        method: "GET",
        cache: "no-store",
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Impossible de charger les données.");

      const aList: AthleteRow[] = j.athletes || [];
      const tList: TeamRow[] = j.teams || [];
      const assignments: AssignmentRow[] = j.assignments || [];

      setAthletes(aList);
      setTeams(tList);
      setTeamStaff((j.teamStaff as Record<string, string[]>) || {});

      const ordered = [...tList].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
      const resolver = buildTeamResolver(ordered);

      const init: Record<string, TeamItem[]> = {};
      for (const t of ordered) init[teamCode(t)] = [];

      let unresolved = 0;

      if (assignments.length > 0) {
        for (const asg of assignments) {
          const canon = resolver.resolve(asg.equipe);
          if (!canon) {
            unresolved++;
            continue;
          }
          init[canon] = init[canon] || [];
          init[canon].push({ uid: makeUid("db"), athlete_id: asg.athlete_id });
        }
      } else {
        for (const a of aList) {
          const canon = resolver.resolve(a.equipe);
          if (!canon) continue;
          init[canon] = init[canon] || [];
          init[canon].push({ uid: makeUid("db"), athlete_id: a.id });
        }
      }

      for (const code of Object.keys(init)) {
        init[code].sort((x, y) => {
          const ax = aList.find((aa) => aa.id === x.athlete_id);
          const ay = aList.find((aa) => aa.id === y.athlete_id);
          const lx = ax ? `${ax.nom} ${ax.prenom}` : x.athlete_id;
          const ly = ay ? `${ay.nom} ${ay.prenom}` : y.athlete_id;
          return lx.localeCompare(ly);
        });
      }

      if (unresolved > 0) {
        setWarn(
          `⚠️ ${unresolved} affectation(s) en base n'ont pas pu être reliées à une équipe de la saison (codes/labels inattendus).`
        );
      }

      setItemsByTeam(init);
    } catch (e: any) {
      setErr(e?.message || "Erreur chargement.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!targetSeason) return;
    load(targetSeason);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetSeason]);

  async function resyncToPrepared() {
    setErr(null);
    const fromDb = await fetchPreparedSeason();
    const season = (fromDb || preparedSeason || "").trim();
    if (!season) return;

    setPreparedSeason(fromDb || season);
    setTargetSeason(season);
    setIsSynced(true);
  }

  const athleteAssignedCount = useMemo(() => {
    const c: Record<string, number> = {};
    for (const code of Object.keys(itemsByTeam)) {
      for (const it of itemsByTeam[code] || []) {
        c[it.athlete_id] = (c[it.athlete_id] || 0) + 1;
      }
    }
    return c;
  }, [itemsByTeam]);

  const unassignedAthletes = useMemo(() => {
    return athletes.filter((a) => (athleteAssignedCount[a.id] || 0) === 0);
  }, [athletes, athleteAssignedCount]);

  const unassignedByCategory = useMemo(() => {
    const out: Record<string, AthleteRow[]> = {};
    for (const a of unassignedAthletes) {
      const catRaw = (a.categorie || "").toUpperCase().trim();
      const key =
        catRaw && ["TINYS", "MINIMES", "CADETS", "JUNIORS", "SENIORS"].includes(catRaw) ? catRaw : "AUTRES";
      out[key] = out[key] || [];
      out[key].push(a);
    }
    for (const k of Object.keys(out)) {
      out[k].sort((x, y) => `${x.nom} ${x.prenom}`.localeCompare(`${y.nom} ${y.prenom}`));
    }
    return out;
  }, [unassignedAthletes]);

  const orderedCategoryKeys = useMemo<(string)[]>(() => {
    const wanted = ["TINYS", "MINIMES", "CADETS", "JUNIORS", "SENIORS"];
    const keys = Object.keys(unassignedByCategory);
    const ordered = [
      ...wanted.filter((k) => keys.includes(k)),
      ...keys.filter((k) => !wanted.includes(k) && k !== "AUTRES"),
    ];
    if (keys.includes("AUTRES")) ordered.push("AUTRES");
    return ordered;
  }, [unassignedByCategory]);

  function allowDrop(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  function onDragStartFromPool(e: React.DragEvent, athleteId: string) {
    e.dataTransfer.setData("text/source", "pool");
    e.dataTransfer.setData("text/athlete_id", athleteId);
    e.dataTransfer.effectAllowed = "copyMove";
  }

  function onDragStartFromTeam(e: React.DragEvent, teamCodeKey: string, itemUid: string, athleteId: string) {
    e.dataTransfer.setData("text/source", "team");
    e.dataTransfer.setData("text/from_team", teamCodeKey);
    e.dataTransfer.setData("text/item_uid", itemUid);
    e.dataTransfer.setData("text/athlete_id", athleteId);
    e.dataTransfer.effectAllowed = "move";
  }

  function dropOnTeam(e: React.DragEvent, toTeamCode: string) {
    e.preventDefault();

    const source = e.dataTransfer.getData("text/source");
    const athleteId = e.dataTransfer.getData("text/athlete_id");
    if (!athleteId) return;

    if (source === "pool") {
      const newItem: TeamItem = { uid: makeUid("it"), athlete_id: athleteId };
      setItemsByTeam((prev) => {
        const next = { ...prev };
        next[toTeamCode] = [...(next[toTeamCode] || []), newItem];
        return next;
      });
      return;
    }

    if (source === "team") {
      const fromTeam = e.dataTransfer.getData("text/from_team");
      const itemUid = e.dataTransfer.getData("text/item_uid");
      if (!fromTeam || !itemUid) return;

      setItemsByTeam((prev) => {
        if (fromTeam === toTeamCode) return prev;

        const next = { ...prev };
        const fromList = [...(next[fromTeam] || [])];
        const idx = fromList.findIndex((x) => x.uid === itemUid);
        if (idx === -1) return prev;

        const [moved] = fromList.splice(idx, 1);
        const toList = [...(next[toTeamCode] || [])];
        toList.push(moved);

        next[fromTeam] = fromList;
        next[toTeamCode] = toList;
        return next;
      });
    }
  }

  function dropOnUnassigned(e: React.DragEvent) {
    e.preventDefault();
    const source = e.dataTransfer.getData("text/source");
    if (source !== "team") return;

    const fromTeam = e.dataTransfer.getData("text/from_team");
    const itemUid = e.dataTransfer.getData("text/item_uid");
    if (!fromTeam || !itemUid) return;

    setItemsByTeam((prev) => {
      const next = { ...prev };
      const list = [...(next[fromTeam] || [])];
      const idx = list.findIndex((x) => x.uid === itemUid);
      if (idx === -1) return prev;
      list.splice(idx, 1);
      next[fromTeam] = list;
      return next;
    });
  }

  function duplicateItemInTeam(teamCodeKey: string, item: TeamItem) {
    const clone: TeamItem = { uid: makeUid("dup"), athlete_id: item.athlete_id };
    setItemsByTeam((prev) => {
      const next = { ...prev };
      next[teamCodeKey] = [...(next[teamCodeKey] || []), clone];
      return next;
    });
  }

  function remainingPlacesForTeam(t: TeamRow) {
    const code = teamCode(t);
    const used = (itemsByTeam[code] || []).length;
    const cap = Number(t.max_athletes || 0);
    return Math.max(0, cap - used);
  }

  async function save() {
    setSaving(true);
    setErr(null);

    try {
      const assignments: AssignmentRow[] = [];
      for (const code of Object.keys(itemsByTeam)) {
        for (const it of itemsByTeam[code] || []) {
          assignments.push({ athlete_id: it.athlete_id, equipe: code });
        }
      }

      const res = await fetch("/api/affecter-athletes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saison: targetSeason || preparedSeason,
          assignments,
        }),
      });

      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Enregistrement impossible.");

      await load(targetSeason || preparedSeason);
    } catch (e: any) {
      setErr(e?.message || "Erreur enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  const preparedSeasonBadge = preparedSeason || "—";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-10">
        <header className="mb-6 border-b border-white/5 pb-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-400">
                Espace bureau · Préparer la saison
              </div>
              <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">
                Étape 3-bis — Affecter les athlètes à leur équipe
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                À gauche : athlètes non affectés. À droite : équipes de la saison + athlètes déjà affectés en base.
                Duplication “+” = surclassement.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/bureau/preparer-saison?saison=${encodeURIComponent(preparedSeason || "")}`}
                className="inline-flex items-center rounded-full border border-slate-600 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-100 hover:border-slate-400"
              >
                ← Retour préparation saison
              </Link>

              <button
                onClick={save}
                disabled={saving || loading}
                className={cn(
                  "inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold shadow-md transition",
                  saving || loading
                    ? "bg-slate-700/40 text-slate-300 cursor-not-allowed"
                    : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-900/40"
                )}
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </header>

        <section className="mb-6 rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-lg shadow-black/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-300">
                Saison préparée (commune)
              </div>
              <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                {preparedSeasonBadge}
              </span>

              {!isSynced && (
                <span className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
                  Saison “forcée” sur cette page
                </span>
              )}
            </div>

            <button
              onClick={resyncToPrepared}
              className="inline-flex items-center rounded-full border border-slate-600 bg-slate-950/40 px-4 py-2 text-xs font-semibold text-slate-100 hover:border-slate-400"
              disabled={saving}
            >
              Se resynchroniser
            </button>
          </div>
        </section>

        {err && (
          <div className="mb-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {err}
          </div>
        )}

        {warn && (
          <div className="mb-5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            {warn}
          </div>
        )}

        <section className="grid gap-4 lg:grid-cols-12">
          {/* Gauche */}
          <div className="lg:col-span-4">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 shadow-lg shadow-black/30">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold text-white">Athlètes non affectés</div>
                  <div className="text-xs text-slate-400">
                    Restants : <span className="text-slate-200 font-semibold">{unassignedAthletes.length}</span>
                  </div>
                </div>

                <div
                  onDragOver={allowDrop}
                  onDrop={dropOnUnassigned}
                  className="rounded-xl border border-dashed border-slate-600 bg-slate-950/30 px-3 py-2 text-[11px] text-slate-300"
                  title="Dépose ici une instance pour désaffecter"
                >
                  Zone “Non affectés”
                </div>
              </div>

              <div className="p-3 space-y-3">
                {loading ? (
                  <div className="text-sm text-slate-300 px-2 py-3">Chargement…</div>
                ) : unassignedAthletes.length === 0 ? (
                  <div className="text-sm text-emerald-200 px-2 py-3">
                    ✅ Tous les athlètes ont au moins une affectation.
                  </div>
                ) : (
                  orderedCategoryKeys.map((cat) => {
                    const list = unassignedByCategory[cat] || [];
                    if (!list.length) return null;

                    return (
                      <div key={cat} className="rounded-2xl border border-white/10 bg-slate-950/30">
                        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-200">
                            {cat === "AUTRES" ? "Autres" : labelForCategory(cat)}
                          </div>
                          <span className="text-[11px] text-slate-400">{list.length}</span>
                        </div>

                        <div className="p-2 space-y-2">
                          {list.map((a) => (
                            <div
                              key={a.id}
                              draggable
                              onDragStart={(e) => onDragStartFromPool(e, a.id)}
                              className={cn(
                                "cursor-grab active:cursor-grabbing rounded-xl",
                                "border border-dashed border-white/20",
                                "bg-slate-950/35 px-3 py-2 hover:bg-white/5"
                              )}
                              title="Glisse vers une équipe à droite"
                            >
                              <div className="text-[11px] leading-4 text-slate-100 font-semibold">
                                {a.nom} {a.prenom}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {a.date_naissance ? new Date(a.date_naissance).toLocaleDateString("fr-FR") : "—"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Droite */}
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 shadow-lg shadow-black/30">
              <div className="border-b border-white/10 px-4 py-3">
                <div className="text-sm font-semibold text-white">Équipes de la saison</div>
                <div className="text-xs text-slate-400">
                  Drag & drop pour affecter. “+” duplique une instance (surclassement).
                </div>
              </div>

              <div className="p-3 grid gap-3 md:grid-cols-2">
                {teamsOrdered.map((t) => {
                  const code = teamCode(t);
                  const members = itemsByTeam[code] || [];
                  const remaining = remainingPlacesForTeam(t);
                  const staffNames = teamStaff[code] || [];
                  const accent = accentClasses(code);

                  return (
                    <div
                      key={t.id}
                      onDragOver={allowDrop}
                      onDrop={(e) => dropOnTeam(e, code)}
                      className={cn(
                        "rounded-2xl border bg-slate-950/30 p-3 hover:border-white/20 transition",
                        accent
                      )}
                      title="Dépose ici un athlète"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-white">{t.label}</div>
                          <div className="mt-1 text-[11px] text-slate-400">
                            {labelForCategory(t.type_code)} · N{t.niveau} · Capacité{" "}
                            <span className="text-slate-200">{t.max_athletes}</span> · Restant{" "}
                            <span className={cn("font-semibold", remaining === 0 ? "text-red-200" : "text-emerald-200")}>
                              {remaining}
                            </span>
                          </div>

                          {staffNames.length > 0 && (
                            <div className="mt-2 text-[11px] text-slate-300">
                              <span className="text-slate-400">Staff :</span> {staffNames.slice(0, 3).join(" · ")}
                              {staffNames.length > 3 ? " …" : ""}
                            </div>
                          )}
                        </div>

                        <span className="inline-flex items-center rounded-full border border-slate-600 bg-slate-900 px-3 py-1 text-[11px] text-slate-200">
                          {members.length} / {t.max_athletes}
                        </span>
                      </div>

                      <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/40 p-2 min-h-[90px]">
                        {members.length === 0 ? (
                          <div className="text-xs text-slate-400 px-2 py-2">Dépose des athlètes ici</div>
                        ) : (
                          <div className="space-y-2">
                            {members.map((it) => {
                              const a = athleteById[it.athlete_id];
                              if (!a) return null;

                              return (
                                <div
                                  key={it.uid}
                                  draggable
                                  onDragStart={(e) => onDragStartFromTeam(e, code, it.uid, it.athlete_id)}
                                  className={cn(
                                    "cursor-grab active:cursor-grabbing rounded-xl",
                                    "border border-dashed border-white/25",
                                    "bg-slate-950/45 px-3 py-2 hover:bg-white/5"
                                  )}
                                  title="Glisse vers une autre équipe, ou vers “Non affectés”"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="text-[11px] leading-4 text-slate-100 font-semibold">
                                        {a.nom} {a.prenom}
                                      </div>
                                      <div className="text-[10px] text-slate-400">
                                        {a.date_naissance
                                          ? new Date(a.date_naissance).toLocaleDateString("fr-FR")
                                          : "—"}
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => duplicateItemInTeam(code, it)}
                                      className={cn(
                                        "shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full border",
                                        "bg-slate-900/60 text-slate-100 hover:border-slate-300",
                                        accent.includes("border-pink") ? "border-pink-400/40" : null,
                                        accent.includes("border-sky") ? "border-sky-400/40" : null,
                                        accent.includes("border-violet") ? "border-violet-400/40" : null,
                                        accent.includes("border-amber") ? "border-amber-400/40" : null,
                                        accent.includes("border-emerald") ? "border-emerald-400/40" : null,
                                        accent.includes("border-slate") ? "border-slate-400/30" : null
                                      )}
                                      title="Dupliquer cet athlète (surclassement) puis glisser le clone dans une autre équipe"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-4 pb-4 text-xs text-slate-400">
                Astuce : déplace une instance d’une équipe à une autre par drag & drop. Pour le surclassement, clique “+”
                puis glisse le clone.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
