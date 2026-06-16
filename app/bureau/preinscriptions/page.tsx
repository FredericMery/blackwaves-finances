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
  email_parent: string | null;
  telephone_parent: string | null;
};

type TeamRow = {
  code: string;
  label: string;
};

type PropositionRow = {
  athlete_id: string;
  saison_cible: string;
  equipe_future: string | null;
  status_parent: "none" | "yes" | "no" | "maybe";
  mail_sent_at: string | null;
  responded_at: string | null;
};

type AgeRuleRow = {
  id: string;
  saison: string;
  type_code: string; // "TINYS" | "MINIMES" | "CADETS" | "JUNIORS" | "SENIORS" ...
  annee_naissance_min: number;
  annee_naissance_max: number;
  created_at: string;
};

function cn(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function guessSeasons() {
  const y = new Date().getFullYear();
  const mk = (start: number) => `${start}-${start + 1}`;
  return [mk(y - 1), mk(y), mk(y + 1), mk(y + 2), mk(y + 3)];
}

function previousSeason(season: string) {
  const m = season.match(/^(\d{4})-(\d{4})$/);
  if (!m) return season;
  const a = parseInt(m[1], 10);
  return `${a - 1}-${a}`;
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

function getSeasonFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const u = new URL(window.location.href);
  const s = (u.searchParams.get("saison") || "").trim();
  return s || null;
}

/** ---------- Auto-calc helpers ---------- */

const ALLOWED_TYPES = ["TINYS", "MINIMES", "CADETS", "JUNIORS", "SENIORS"] as const;
type AllowedType = (typeof ALLOWED_TYPES)[number];
const ALLOWED_SET = new Set<string>(ALLOWED_TYPES);

const CATEGORY_LABEL: Record<AllowedType, string> = {
  TINYS: "Tinys",
  MINIMES: "Minimes",
  CADETS: "Cadets",
  JUNIORS: "Juniors",
  SENIORS: "Seniors",
};

function parseBirthYear(dateIso: string | null): number | null {
  if (!dateIso) return null;
  // ISO YYYY-MM-DD
  const m = String(dateIso).match(/^(\d{4})-/);
  if (m) return parseInt(m[1], 10);
  // fallback
  const d = new Date(dateIso);
  if (!Number.isFinite(d.getTime())) return null;
  return d.getFullYear();
}

async function fetchLatestAgeRules(): Promise<{ saison: string; rules: AgeRuleRow[] } | null> {
  try {
    const res = await fetch("/api/def-equipe-ages/latest", { cache: "no-store" });
    const j = await res.json().catch(() => null);
    if (!res.ok || !j?.ok) return null;
    const rules = Array.isArray(j.rules) ? (j.rules as AgeRuleRow[]) : [];
    return { saison: String(j.saison || ""), rules };
  } catch {
    return null;
  }
}

function normalizeTypeCode(x: string): AllowedType | null {
  const t = String(x || "").trim().toUpperCase();
  if (!ALLOWED_SET.has(t)) return null;
  return t as AllowedType;
}

function findCategoryForBirthYear(rules: AgeRuleRow[], year: number): AllowedType | null {
  for (const r of rules) {
    const type = normalizeTypeCode(r.type_code);
    if (!type) continue;
    if (year >= Number(r.annee_naissance_min) && year <= Number(r.annee_naissance_max)) return type;
  }
  return null;
}

/** -------------------------------------- */

export default function BureauPreinscriptionsPage() {
  const seasons = useMemo(() => guessSeasons(), []);

  // saison "préparée" (source de vérité)
  const [preparedSeason, setPreparedSeason] = useState<string>("");

  // saison utilisée par cette page (par défaut = preparedSeason, mais on laisse la main si besoin)
  const [targetSeason, setTargetSeason] = useState<string>("");

  // indique si on est aligné sur la saison préparée
  const [isSynced, setIsSynced] = useState(true);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [err, setErr] = useState<string | null>(null);

  const [athletes, setAthletes] = useState<AthleteRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]); // on laisse (mécanique inchangée)
  const [propsByAthlete, setPropsByAthlete] = useState<Record<string, PropositionRow>>({});
  const [futureTeamByAthlete, setFutureTeamByAthlete] = useState<Record<string, string>>({});

  // ✅ sélection multiple
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkReport, setBulkReport] = useState<{
    total: number;
    ok: number;
    ko: number;
    failures: Array<{ athlete_id: string; name: string; error: string }>;
  } | null>(null);

  // ✅ règles ages (dernière saison trouvée dans def_equipe_ages)
  const [ageRulesSeason, setAgeRulesSeason] = useState<string>("");
  const [ageRules, setAgeRules] = useState<AgeRuleRow[]>([]);

  const sourceSeason = useMemo(
    () => previousSeason(targetSeason || preparedSeason || ""),
    [targetSeason, preparedSeason]
  );

  const router = useRouter();

  // 1) init saison (URL ?saison=... sinon DB)
  useEffect(() => {
    (async () => {
      setErr(null);
      const fromUrl = getSeasonFromUrl();
      const fromDb = await fetchPreparedSeason();

      const chosen = fromUrl || fromDb || seasons[1] || seasons[0] || "";
      setPreparedSeason(fromDb || chosen);
      setTargetSeason(chosen);

      if (fromDb && fromUrl && fromUrl !== fromDb) setIsSynced(false);
      else setIsSynced(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ force URL explicite saison
  useEffect(() => {
    if (!preparedSeason) return;

    const url = new URL(window.location.href);
    const saisonInUrl = url.searchParams.get("saison");

    if (!saisonInUrl || saisonInUrl !== preparedSeason) {
      router.replace(`/bureau/preinscriptions?saison=${encodeURIComponent(preparedSeason)}`);
    }
  }, [preparedSeason, router]);

  // ✅ charge age rules (une fois)
  useEffect(() => {
    (async () => {
      const r = await fetchLatestAgeRules();
      if (!r) return;
      const filtered = (r.rules || []).filter((x) => normalizeTypeCode(x.type_code));
      setAgeRulesSeason(r.saison || "");
      setAgeRules(filtered);
    })();
  }, []);

  async function load(seasonToLoad?: string) {
    const season = seasonToLoad || targetSeason;
    if (!season) return;

    setLoading(true);
    setErr(null);

    try {
      const qs = new URLSearchParams({ targetSeason: season });
      const res = await fetch(`/api/preinscriptions/list?${qs.toString()}`, {
        method: "GET",
        cache: "no-store",
      });
      const j = await res.json().catch(() => null);

      if (!res.ok || !j?.ok) throw new Error(j?.error || "Impossible de charger les données.");

      const athletesList: AthleteRow[] = j.athletes || [];
      setAthletes(athletesList);
      setTeams(j.teams || []); // on garde

      const map: Record<string, PropositionRow> = {};
      for (const p of j.propositions || []) map[p.athlete_id] = p;
      setPropsByAthlete(map);

      // ✅ init équipe future (catégorie)
      const init: Record<string, string> = {};
      for (const a of athletesList) {
        const existing = map[a.id]?.equipe_future;
        if (existing) {
          // si déjà en base, on respecte
          init[a.id] = existing;
          continue;
        }

        const year = parseBirthYear(a.date_naissance);
        if (!year || ageRules.length === 0) {
          init[a.id] = "";
          continue;
        }

        const cat = findCategoryForBirthYear(ageRules, year);
        init[a.id] = cat ? cat : "";
      }
      setFutureTeamByAthlete(init);

      // init sélection
      const sel: Record<string, boolean> = {};
      for (const a of athletesList) sel[a.id] = false;
      setSelectedIds(sel);
    } catch (e: any) {
      setErr(e?.message || "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  // 2) charge données quand targetSeason est prête
  useEffect(() => {
    if (!targetSeason) return;
    load(targetSeason);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetSeason, ageRulesSeason]);

  async function resyncToPrepared() {
    setErr(null);
    const fromDb = await fetchPreparedSeason();
    const season = fromDb || preparedSeason || seasons[1] || seasons[0] || "";
    setPreparedSeason(fromDb || season);
    setTargetSeason(season);
    setIsSynced(true);
    setBulkReport(null);
  }

  async function sendProposal(athleteId: string) {
    setSending((s) => ({ ...s, [athleteId]: true }));
    setErr(null);
    setBulkReport(null);

    try {
      const equipe_future = futureTeamByAthlete[athleteId] || null;

      const res = await fetch("/api/preinscriptions/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athlete_id: athleteId,
          targetSeason,
          equipe_future,
        }),
      });

      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Envoi impossible.");

      await load(targetSeason);
    } catch (e: any) {
      setErr(e?.message || "Erreur envoi.");
    } finally {
      setSending((s) => ({ ...s, [athleteId]: false }));
    }
  }

  // ✅ helpers sélection
  const selectableList = useMemo(() => athletes.filter((a) => !!a.email_parent), [athletes]);
  const selectedList = useMemo(() => athletes.filter((a) => selectedIds[a.id]), [athletes, selectedIds]);

  const allSelectableChecked = useMemo(() => {
    if (selectableList.length === 0) return false;
    return selectableList.every((a) => !!selectedIds[a.id]);
  }, [selectableList, selectedIds]);

  const someSelectableChecked = useMemo(() => {
    return selectableList.some((a) => !!selectedIds[a.id]);
  }, [selectableList, selectedIds]);

  function toggleAllSelectable() {
    const next = { ...selectedIds };
    const value = !allSelectableChecked;
    for (const a of selectableList) next[a.id] = value;
    setSelectedIds(next);
  }

  function toggleOne(id: string) {
    setSelectedIds((m) => ({ ...m, [id]: !m[id] }));
  }

  function selectOnlyNotSent() {
    const next: Record<string, boolean> = {};
    for (const a of athletes) next[a.id] = false;
    for (const a of selectableList) {
      const p = propsByAthlete[a.id];
      const isSent = !!p?.mail_sent_at;
      if (!isSent) next[a.id] = true;
    }
    setSelectedIds(next);
  }

  async function sendBulk() {
    const ids = selectedList.map((a) => a.id);
    if (ids.length === 0) return;

    setBulkSending(true);
    setErr(null);
    setBulkReport(null);

    try {
      const equipe_future_by_athlete: Record<string, string | null> = {};
      for (const id of ids) {
        equipe_future_by_athlete[id] = futureTeamByAthlete[id] ? futureTeamByAthlete[id] : null;
      }

      const res = await fetch("/api/preinscriptions/send-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athlete_ids: ids,
          targetSeason,
          equipe_future_by_athlete,
        }),
      });

      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Envoi groupé impossible.");

      const resultById: Record<string, { ok: boolean; error?: string }> = {};
      for (const r of j.results || []) resultById[r.athlete_id] = r;

      const failures: Array<{ athlete_id: string; name: string; error: string }> = [];
      for (const a of athletes) {
        const r = resultById[a.id];
        if (r && r.ok === false) {
          failures.push({
            athlete_id: a.id,
            name: `${a.prenom} ${a.nom}`,
            error: r.error || "Erreur",
          });
        }
      }

      setBulkReport({
        total: j.summary?.total ?? ids.length,
        ok: j.summary?.ok ?? 0,
        ko: j.summary?.ko ?? failures.length,
        failures,
      });

      await load(targetSeason);

      const cleared: Record<string, boolean> = {};
      for (const a of athletes) cleared[a.id] = false;
      setSelectedIds(cleared);
    } catch (e: any) {
      setErr(e?.message || "Erreur envoi groupé.");
    } finally {
      setBulkSending(false);
    }
  }

  const countYes = useMemo(
    () => Object.values(propsByAthlete).filter((p) => p.status_parent === "yes").length,
    [propsByAthlete]
  );

  const preparedSeasonBadge = preparedSeason || "—";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-10">
        <header className="mb-6 border-b border-white/5 pb-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-400">
                Espace bureau · Pré-inscriptions
              </div>
              <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">
                Étape 1 — Pré-inscrire les athlètes
              </h1>
              <p className="mt-2 max-w-4xl text-sm text-slate-300">
                Saison cible → athlètes de la saison précédente ({sourceSeason}).<br />
                Auto-calcul <span className="text-slate-100 font-semibold">catégorie</span> (Tinys/Minimes/Cadets/Juniors/Seniors)
                basé sur <span className="text-slate-100 font-semibold">année de naissance</span> via DEF_EQUIPE_AGES
                (dernière saison : <span className="text-slate-100 font-semibold">{ageRulesSeason || "—"}</span>).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/bureau/preparer-saison"
                className="inline-flex items-center rounded-full border border-slate-600 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-100 hover:border-slate-400"
              >
                ← Retour étapes
              </Link>
            </div>
          </div>
        </header>

        {/* ✅ Bandeau saison préparée */}
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

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={resyncToPrepared}
                className="inline-flex items-center rounded-full border border-slate-600 bg-slate-950/40 px-4 py-2 text-xs font-semibold text-slate-100 hover:border-slate-400"
                disabled={bulkSending}
                title="Recharge la saison préparée depuis la base"
              >
                Se resynchroniser
              </button>
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Saison cible</div>
            <div className="mt-2 flex items-center gap-3">
              <select
                value={targetSeason}
                onChange={(e) => {
                  setTargetSeason(e.target.value);
                  setIsSynced(e.target.value === preparedSeason);
                  setBulkReport(null);
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                disabled={bulkSending}
              >
                {seasons.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Source auto : <span className="text-slate-200">{sourceSeason}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Synthèse</div>
            <div className="mt-2 text-2xl font-bold text-white">{athletes.length}</div>
            <div className="text-xs text-slate-400">Athlètes trouvés sur {sourceSeason}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Réponses “Oui”</div>
            <div className="mt-2 text-2xl font-bold text-emerald-200">{countYes}</div>
            <div className="text-xs text-slate-400">Réinscriptions validées (workflow relancé)</div>
          </div>
        </section>

        {/* ✅ Barre actions bulk */}
        <section className="mb-5 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-slate-200">
              <span className="font-semibold">{selectedList.length}</span> sélectionné(s){" "}
              <span className="text-slate-400">/ {selectableList.length} envoyables</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={toggleAllSelectable}
                disabled={bulkSending || loading}
                className={cn(
                  "inline-flex items-center rounded-full border px-4 py-2 text-xs font-semibold",
                  bulkSending || loading
                    ? "border-slate-700 bg-slate-900/30 text-slate-400 cursor-not-allowed"
                    : "border-slate-600 bg-slate-950/40 text-slate-100 hover:border-slate-400"
                )}
              >
                {allSelectableChecked ? "Tout désélectionner" : "Tout sélectionner"}
              </button>

              <button
                onClick={selectOnlyNotSent}
                disabled={bulkSending || loading}
                className={cn(
                  "inline-flex items-center rounded-full border px-4 py-2 text-xs font-semibold",
                  bulkSending || loading
                    ? "border-slate-700 bg-slate-900/30 text-slate-400 cursor-not-allowed"
                    : "border-slate-600 bg-slate-950/40 text-slate-100 hover:border-slate-400"
                )}
                title="Sélectionne uniquement les athlètes dont le mail n’a pas encore été envoyé"
              >
                Sélectionner “non envoyés”
              </button>

              <button
                onClick={sendBulk}
                disabled={bulkSending || selectedList.length === 0}
                className={cn(
                  "inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold shadow-md transition",
                  bulkSending || selectedList.length === 0
                    ? "bg-slate-700/40 text-slate-300 cursor-not-allowed"
                    : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-900/40"
                )}
              >
                {bulkSending ? "Envoi groupé…" : `Envoyer aux ${selectedList.length}`}
              </button>

              <button
                onClick={() => load(targetSeason)}
                disabled={bulkSending || loading}
                className={cn(
                  "inline-flex items-center rounded-full border px-4 py-2 text-xs font-semibold",
                  bulkSending || loading
                    ? "border-slate-700 bg-slate-900/30 text-slate-400 cursor-not-allowed"
                    : "border-slate-600 bg-slate-950/40 text-slate-100 hover:border-slate-400"
                )}
              >
                Rafraîchir
              </button>
            </div>
          </div>

          {bulkReport && (
            <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/30 p-3">
              <div className="text-sm text-slate-100 font-semibold">
                Bilan envoi :{" "}
                <span className="text-emerald-200">{bulkReport.ok} OK</span>{" "}
                · <span className="text-red-200">{bulkReport.ko} KO</span>{" "}
                <span className="text-slate-400">(total {bulkReport.total})</span>
              </div>

              {bulkReport.failures.length > 0 && (
                <div className="mt-2 text-xs text-slate-300">
                  <div className="mb-1 text-slate-200 font-semibold">Échecs :</div>
                  <ul className="list-disc pl-5 space-y-1">
                    {bulkReport.failures.slice(0, 12).map((f) => (
                      <li key={f.athlete_id}>
                        <span className="text-slate-100">{f.name}</span> —{" "}
                        <span className="text-red-200">{f.error}</span>
                      </li>
                    ))}
                    {bulkReport.failures.length > 12 && (
                      <li className="text-slate-400">… +{bulkReport.failures.length - 12} autres</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        {err && (
          <div className="mb-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {err}
          </div>
        )}

        <section className="rounded-2xl border border-white/10 bg-slate-900/40 shadow-lg shadow-black/30">
          <div className="border-b border-white/10 px-4 py-3">
            <div className="text-sm font-semibold text-white">Athlètes de {sourceSeason}</div>
            <div className="text-xs text-slate-400">
              Colonnes : Sélection · Nom · Prénom · Naissance · Équipe actuelle · Catégorie future · Mail · Réponse parent
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full text-left">
              <thead className="bg-slate-950/40 text-xs uppercase tracking-wide text-slate-300">
                <tr>
                  <th className="px-4 py-3 w-[70px]">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allSelectableChecked}
                        ref={(el) => {
                          if (!el) return;
                          el.indeterminate = !allSelectableChecked && someSelectableChecked;
                        }}
                        onChange={toggleAllSelectable}
                        disabled={bulkSending || loading}
                        className="h-4 w-4 rounded border-slate-500 bg-slate-900"
                        title="Tout sélectionner (emails uniquement)"
                      />
                      <span className="text-[10px] text-slate-400">Tous</span>
                    </div>
                  </th>
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Prénom</th>
                  <th className="px-4 py-3">Naissance</th>
                  <th className="px-4 py-3">Équipe actuelle</th>
                  <th className="px-4 py-3">Catégorie future</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Réponse parent</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-300" colSpan={8}>
                      Chargement…
                    </td>
                  </tr>
                ) : athletes.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-300" colSpan={8}>
                      Aucun athlète trouvé pour {sourceSeason}.
                    </td>
                  </tr>
                ) : (
                  athletes.map((a) => {
                    const p = propsByAthlete[a.id];
                    const status = p?.status_parent || "none";
                    const disabledSelect = !a.email_parent;

                    return (
                      <tr key={a.id} className="hover:bg-white/5">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={!!selectedIds[a.id]}
                            onChange={() => toggleOne(a.id)}
                            disabled={disabledSelect || bulkSending}
                            className={cn(
                              "h-4 w-4 rounded border-slate-500 bg-slate-900",
                              (disabledSelect || bulkSending) && "opacity-40 cursor-not-allowed"
                            )}
                            title={disabledSelect ? "Email parent manquant" : "Sélectionner"}
                          />
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-100 font-semibold">{a.nom}</td>
                        <td className="px-4 py-3 text-sm text-slate-100">{a.prenom}</td>
                        <td className="px-4 py-3 text-sm text-slate-200">
                          {a.date_naissance ? new Date(a.date_naissance).toLocaleDateString("fr-FR") : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-200">{a.equipe || "—"}</td>

                        {/* ✅ catégorie future */}
                        <td className="px-4 py-3">
                          <select
                            value={futureTeamByAthlete[a.id] ?? ""}
                            onChange={(e) =>
                              setFutureTeamByAthlete((m) => ({ ...m, [a.id]: e.target.value }))
                            }
                            className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                            disabled={bulkSending}
                          >
                            <option value="">— Choisir —</option>
                            {ALLOWED_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {CATEGORY_LABEL[t]}
                              </option>
                            ))}
                          </select>
                          <div className="mt-1 text-[11px] text-slate-400">
                            (Auto-calcul sur {ageRulesSeason || "—"} · basé sur l’année de naissance)
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <button
                            onClick={() => sendProposal(a.id)}
                            disabled={bulkSending || sending[a.id] || !a.email_parent}
                            className={cn(
                              "inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold shadow-md transition",
                              !a.email_parent
                                ? "bg-slate-700/40 text-slate-300 cursor-not-allowed"
                                : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-900/40",
                              (sending[a.id] || bulkSending) && "opacity-70"
                            )}
                            title={!a.email_parent ? "Email parent manquant dans la fiche athlète" : ""}
                          >
                            {sending[a.id] ? "Envoi…" : "Envoyer le mail"}
                          </button>

                          {p?.mail_sent_at && (
                            <div className="mt-1 text-[11px] text-slate-400">
                              Envoyé : {new Date(p.mail_sent_at).toLocaleString("fr-FR")}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
                              status === "yes" && "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
                              status === "no" && "border-red-400/40 bg-red-500/10 text-red-200",
                              status === "maybe" && "border-amber-400/40 bg-amber-500/10 text-amber-200",
                              status === "none" && "border-slate-500/40 bg-slate-500/10 text-slate-200"
                            )}
                          >
                            {status === "yes"
                              ? "Oui"
                              : status === "no"
                              ? "Non"
                              : status === "maybe"
                              ? "Pas certain"
                              : "En attente"}
                          </span>

                          {p?.responded_at && (
                            <div className="mt-1 text-[11px] text-slate-400">
                              Répondu : {new Date(p.responded_at).toLocaleString("fr-FR")}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-6 text-xs text-slate-400">
          Note : si un parent clique “Oui”, une entrée est créée dans{" "}
          <span className="text-slate-200">trial_requests</span> pour réintégrer le workflow.
        </div>
      </div>
    </div>
  );
}
