"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type TypeRow = {
  code: string;
  label: string;
  ordre: number;
  actif: boolean;
};

type AgeRuleRow = {
  id: string;
  saison: string;
  type_code: string;
  annee_naissance_min: number;
  annee_naissance_max: number;
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
  created_at: string;
};

type DraftTeam = {
  id?: string | null;
  type_code: string;
  niveau: number;
  label: string;
  max_athletes: number;
  actif: boolean;
  ordre: number;
};

function cn(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

function guessSeasons() {
  const y = new Date().getFullYear();
  const mk = (start: number) => `${start}-${start + 1}`;
  return [mk(y - 1), mk(y), mk(y + 1), mk(y + 2)];
}

function defaultLabel(typeLabel: string, niveau: number) {
  return `${typeLabel} N${niveau}`;
}

// ✅ helpers saison préparée
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

export default function BureauDefinirEquipesPage() {
  const router = useRouter();
  const seasons = useMemo(() => guessSeasons(), []);

  // ✅ Saison préparée (commune)
  const [preparedSeason, setPreparedSeason] = useState<string>("");

  // ✅ Saison affichée par cette page (ta variable d'origine)
  const [saison, setSaison] = useState(seasons[2] ?? seasons[1] ?? seasons[0] ?? "");

  // ✅ Sync URL / saison préparée
  const [isSynced, setIsSynced] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [types, setTypes] = useState<TypeRow[]>([]);
  const [ageRules, setAgeRules] = useState<Record<string, { min: number; max: number }>>({});
  const [teams, setTeams] = useState<DraftTeam[]>([]);

  // Draft new team
  const [newType, setNewType] = useState<string>("");
  const [newLevel, setNewLevel] = useState<number>(1);
  const [newMax, setNewMax] = useState<number>(25);
  const [newActif, setNewActif] = useState<boolean>(true);

  // ✅ Modal +Équipe (type)
  const [showAddType, setShowAddType] = useState(false);
  const [addTypeLabel, setAddTypeLabel] = useState("");
  const [addTypeOrdre, setAddTypeOrdre] = useState<number>(0);
  const [addingType, setAddingType] = useState(false);

  // ✅ Init saison: URL ?saison=... sinon DB (season preparation)
  useEffect(() => {
    (async () => {
      const fromUrl = getSeasonFromUrl();
      const fromDb = await fetchPreparedSeason();

      const chosen = fromUrl || fromDb || (seasons[2] ?? seasons[1] ?? seasons[0] ?? "");
      setPreparedSeason(fromDb || chosen);
      setSaison(chosen);

      if (fromDb && fromUrl && fromUrl !== fromDb) setIsSynced(false);
      else setIsSynced(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ URL explicite: /bureau/definir-equipes?saison=XXXX-YYYY
  useEffect(() => {
    if (!saison) return;
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    const inUrl = (url.searchParams.get("saison") || "").trim();

    if (inUrl !== saison) {
      router.replace(`/bureau/definir-equipes?saison=${encodeURIComponent(saison)}`);
    }
  }, [saison, router]);

  // ✅ Bouton: se resynchroniser sur la saison préparée en base
  async function resyncToPrepared() {
    setErr(null);
    setOkMsg(null);

    const fromDb = await fetchPreparedSeason();
    const s = fromDb || preparedSeason || (seasons[2] ?? seasons[1] ?? seasons[0] ?? "");

    setPreparedSeason(fromDb || s);
    setSaison(s);
    setIsSynced(true);

    router.replace(`/bureau/definir-equipes?saison=${encodeURIComponent(s)}`);
  }

  async function load() {
    setLoading(true);
    setErr(null);
    setOkMsg(null);

    try {
      const qs = new URLSearchParams({ saison });
      const res = await fetch(`/api/def-equipes/bootstrap?${qs.toString()}`, {
        method: "GET",
        cache: "no-store",
      });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Chargement impossible.");

      const t: TypeRow[] = j.types || [];
      const ages: AgeRuleRow[] = j.ages || [];
      const eqs: TeamRow[] = j.equipes || [];

      setTypes(t);
      setNewType(t[0]?.code || "");

      const m: Record<string, { min: number; max: number }> = {};
      for (const tr of t) {
        const found = ages.find((a) => a.type_code === tr.code);
        m[tr.code] = {
          min: found?.annee_naissance_min ?? 2010,
          max: found?.annee_naissance_max ?? 2012,
        };
      }
      setAgeRules(m);

      setTeams(
        (eqs || []).map((x) => ({
          id: x.id,
          type_code: x.type_code,
          niveau: x.niveau,
          label: x.label,
          max_athletes: x.max_athletes,
          actif: x.actif,
          ordre: x.ordre,
        }))
      );

      // ✅ met à jour l’indicateur de sync
      if (preparedSeason && saison !== preparedSeason) setIsSynced(false);
      else setIsSynced(true);
    } catch (e: any) {
      setErr(e?.message || "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!saison) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saison]);

  function updateAge(type_code: string, key: "min" | "max", value: number) {
    setAgeRules((m) => ({
      ...m,
      [type_code]: { ...(m[type_code] || { min: 2010, max: 2012 }), [key]: value },
    }));
  }

  function updateTeam(idx: number, patch: Partial<DraftTeam>) {
    setTeams((arr) => {
      const next = [...arr];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  function addTeam() {
    const type = types.find((t) => t.code === newType);
    if (!type) return;

    const nextOrdre = teams.length > 0 ? Math.max(...teams.map((t) => t.ordre || 0)) + 1 : 1;
    const label = defaultLabel(type.label, newLevel);

    setTeams((arr) => [
      ...arr,
      {
        id: null,
        type_code: newType,
        niveau: newLevel,
        label,
        max_athletes: newMax,
        actif: newActif,
        ordre: nextOrdre,
      },
    ]);
  }

  function removeTeam(idx: number) {
    setTeams((arr) => {
      const t = arr[idx];
      const next = [...arr];
      if (!t.id) {
        next.splice(idx, 1);
        return next;
      }
      next[idx] = { ...t, actif: false };
      return next;
    });
  }

  async function saveAll() {
    setSaving(true);
    setErr(null);
    setOkMsg(null);

    try {
      const age_rules = types.map((t) => ({
        type_code: t.code,
        annee_naissance_min: Number(ageRules[t.code]?.min ?? 2010),
        annee_naissance_max: Number(ageRules[t.code]?.max ?? 2012),
      }));

      for (const r of age_rules) {
        if (!Number.isFinite(r.annee_naissance_min) || !Number.isFinite(r.annee_naissance_max)) {
          throw new Error("Règles d'âge invalides (min/max).");
        }
        if (r.annee_naissance_min > r.annee_naissance_max) {
          throw new Error(`Règle d'âge invalide pour ${r.type_code} (min > max).`);
        }
      }

      for (const t of teams) {
        if (!t.type_code) throw new Error("Une équipe a un type vide.");
        if (t.niveau < 1 || t.niveau > 8) throw new Error("Niveau doit être entre 1 et 8.");
        if (!t.label?.trim()) throw new Error("Label d'équipe manquant.");
        if (t.max_athletes < 0) throw new Error("Capacité max invalide.");
      }

      const res = await fetch("/api/def-equipes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saison,
          age_rules,
          equipes: teams,
        }),
      });

      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Sauvegarde impossible.");

      setOkMsg("✅ Sauvegardé. Les équipes et règles d’âge sont désormais la référence pour cette saison.");

      const ages: AgeRuleRow[] = j.ages || [];
      const eqs: TeamRow[] = j.equipes || [];

      const m: Record<string, { min: number; max: number }> = {};
      for (const tr of types) {
        const found = ages.find((a) => a.type_code === tr.code);
        m[tr.code] = {
          min: found?.annee_naissance_min ?? ageRules[tr.code]?.min ?? 2010,
          max: found?.annee_naissance_max ?? ageRules[tr.code]?.max ?? 2012,
        };
      }
      setAgeRules(m);

      setTeams(
        (eqs || []).map((x) => ({
          id: x.id,
          type_code: x.type_code,
          niveau: x.niveau,
          label: x.label,
          max_athletes: x.max_athletes,
          actif: x.actif,
          ordre: x.ordre,
        }))
      );
    } catch (e: any) {
      setErr(e?.message || "Erreur inconnue.");
    } finally {
      setSaving(false);
    }
  }

  async function addType() {
    const label = addTypeLabel.trim();
    if (!label) {
      setErr("Nom d'équipe manquant.");
      return;
    }

    setAddingType(true);
    setErr(null);
    setOkMsg(null);

    try {
      const res = await fetch("/api/def-equipes/add-type", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label,
          ordre: addTypeOrdre,
          saison, // ✅ tu l’avais déjà : init âge sur la saison courante
        }),
      });

      const j = await res.json().catch(() => null);
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Création impossible.");

      setShowAddType(false);
      setAddTypeLabel("");
      setAddTypeOrdre(0);

      await load();
      setOkMsg("✅ Nouvelle catégorie ajoutée.");
    } catch (e: any) {
      setErr(e?.message || "Erreur ajout équipe.");
    } finally {
      setAddingType(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-10">
        <header className="mb-6 border-b border-white/5 pb-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-400">
                Espace bureau · Étape 2
              </div>
              <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">Définir les équipes</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Définis la saison, fixe les tranches d’âge par catégorie, et crée les équipes (type + niveau + capacité).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/bureau/preparer-saison"
                className="inline-flex items-center rounded-full border border-slate-600 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-100 hover:border-slate-400"
              >
                ← Retour préparer saison
              </Link>
            </div>
          </div>
        </header>

        {/* ✅ Bandeau Saison préparée (commune) */}
        <section className="mb-6 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-300">
                Saison préparée (commune)
              </div>
              <span className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                {preparedSeason || "—"}
              </span>

              {!isSynced && (
                <span className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
                  Cette page est sur une autre saison
                </span>
              )}
            </div>

            <button
              onClick={resyncToPrepared}
              className="inline-flex items-center rounded-full border border-slate-600 bg-slate-950/40 px-4 py-2 text-xs font-semibold text-slate-100 hover:border-slate-400"
              disabled={saving || loading}
              title="Recharge la saison préparée depuis la base et aligne la page"
            >
              Se resynchroniser
            </button>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Saison</div>
            <div className="mt-2">
              <select
                value={saison}
                onChange={(e) => setSaison(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                disabled={saving}
              >
                {seasons.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-2 text-xs text-slate-400">Configuration spécifique à cette saison.</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Référence</div>
            <div className="mt-2 text-sm text-slate-200">
              Ces tables deviennent la référence : <span className="text-slate-100">def_*</span>
            </div>
            <div className="mt-2 text-xs text-slate-400">Types, âges, équipes saison.</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Action</div>
            <button
              onClick={saveAll}
              disabled={saving || loading}
              className={cn(
                "mt-2 inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-sm font-semibold shadow-md transition",
                saving || loading
                  ? "bg-slate-700/40 text-slate-300 cursor-not-allowed"
                  : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-900/40"
              )}
            >
              {saving ? "Sauvegarde…" : "Sauvegarder la configuration"}
            </button>
            <div className="mt-2 text-xs text-slate-400">Écrit en base via API.</div>
          </div>
        </section>

        {err && (
          <div className="mb-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {err}
          </div>
        )}
        {okMsg && (
          <div className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {okMsg}
          </div>
        )}

        {/* AGE RULES */}
        <section className="mb-6 rounded-2xl border border-white/10 bg-slate-900/40 shadow-lg shadow-black/30">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-white">Tranches d’âge par catégorie (année de naissance)</div>
              <div className="text-xs text-slate-400">Modifiable par saison. Exemple : Minimes = 2014 → 2016</div>
            </div>

            {/* ✅ bouton + équipe */}
            <button
              onClick={() => setShowAddType(true)}
              disabled={saving || loading}
              className={cn(
                "inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold border transition",
                saving || loading
                  ? "border-slate-700 bg-slate-900/30 text-slate-400 cursor-not-allowed"
                  : "border-pink-400/50 bg-pink-500/10 text-pink-100 hover:bg-pink-500/15"
              )}
              title="Ajouter une nouvelle catégorie (type d'équipe)"
            >
              + Équipe
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-left">
              <thead className="bg-slate-950/40 text-xs uppercase tracking-wide text-slate-300">
                <tr>
                  <th className="px-4 py-3">Catégorie</th>
                  <th className="px-4 py-3">Année min</th>
                  <th className="px-4 py-3">Année max</th>
                  <th className="px-4 py-3">Aperçu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-300" colSpan={4}>
                      Chargement…
                    </td>
                  </tr>
                ) : (
                  types.map((t) => {
                    const r = ageRules[t.code] || { min: 2010, max: 2012 };
                    return (
                      <tr key={t.code} className="hover:bg-white/5">
                        <td className="px-4 py-3 text-sm text-slate-100 font-semibold">{t.label}</td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={r.min}
                            onChange={(e) => updateAge(t.code, "min", Number(e.target.value))}
                            className="w-40 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                            disabled={saving}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={r.max}
                            onChange={(e) => updateAge(t.code, "max", Number(e.target.value))}
                            className="w-40 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                            disabled={saving}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-200">
                          {r.min} → {r.max}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* TEAMS */}
        <section className="rounded-2xl border border-white/10 bg-slate-900/40 shadow-lg shadow-black/30">
          <div className="border-b border-white/10 px-4 py-3">
            <div className="text-sm font-semibold text-white">Équipes créées pour la saison {saison}</div>
            <div className="text-xs text-slate-400">Type + Niveau (1..8) + Capacité.</div>
          </div>

          <div className="border-b border-white/10 px-4 py-4">
            <div className="grid gap-3 md:grid-cols-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Type</div>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                  disabled={saving}
                >
                  {types.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Niveau</div>
                <select
                  value={newLevel}
                  onChange={(e) => setNewLevel(Number(e.target.value))}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                  disabled={saving}
                >
                  {Array.from({ length: 8 }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Niveau {i + 1}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Capacité max</div>
                <input
                  type="number"
                  value={newMax}
                  onChange={(e) => setNewMax(Number(e.target.value))}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                  disabled={saving}
                />
              </div>

              <div className="flex items-end gap-2">
                <label className="mt-2 inline-flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    checked={newActif}
                    onChange={(e) => setNewActif(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-500 bg-slate-900"
                    disabled={saving}
                  />
                  Actif
                </label>
              </div>

              <div className="flex items-end">
                <button
                  onClick={addTeam}
                  disabled={saving || loading || !newType}
                  className={cn(
                    "inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-sm font-semibold shadow-md transition",
                    saving || loading || !newType
                      ? "bg-slate-700/40 text-slate-300 cursor-not-allowed"
                      : "bg-pink-500 text-white hover:bg-pink-400 shadow-pink-900/40"
                  )}
                >
                  + Ajouter l’équipe
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full text-left">
              <thead className="bg-slate-950/40 text-xs uppercase tracking-wide text-slate-300">
                <tr>
                  <th className="px-4 py-3">Ordre</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Niveau</th>
                  <th className="px-4 py-3">Label</th>
                  <th className="px-4 py-3">Capacité</th>
                  <th className="px-4 py-3">Actif</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-300" colSpan={7}>
                      Chargement…
                    </td>
                  </tr>
                ) : teams.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-300" colSpan={7}>
                      Aucune équipe créée pour {saison}. Ajoute-en au-dessus.
                    </td>
                  </tr>
                ) : (
                  teams.map((t, idx) => {
                    const typeLabel = types.find((x) => x.code === t.type_code)?.label || t.type_code;

                    return (
                      <tr key={(t.id || "new") + "_" + idx} className="hover:bg-white/5">
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={t.ordre}
                            onChange={(e) => updateTeam(idx, { ordre: Number(e.target.value) })}
                            className="w-24 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                            disabled={saving}
                          />
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-100 font-semibold">{typeLabel}</td>

                        <td className="px-4 py-3">
                          <select
                            value={t.niveau}
                            onChange={(e) => {
                              const niveau = Number(e.target.value);
                              updateTeam(idx, { niveau });
                            }}
                            className="w-40 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                            disabled={saving}
                          >
                            {Array.from({ length: 8 }).map((_, i) => (
                              <option key={i + 1} value={i + 1}>
                                Niveau {i + 1}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="px-4 py-3">
                          <input
                            value={t.label}
                            onChange={(e) => updateTeam(idx, { label: e.target.value })}
                            className="w-[320px] rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                            disabled={saving}
                          />
                        </td>

                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={t.max_athletes}
                            onChange={(e) => updateTeam(idx, { max_athletes: Number(e.target.value) })}
                            className="w-28 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                            disabled={saving}
                          />
                        </td>

                        <td className="px-4 py-3">
                          <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                            <input
                              type="checkbox"
                              checked={t.actif}
                              onChange={(e) => updateTeam(idx, { actif: e.target.checked })}
                              className="h-4 w-4 rounded border-slate-500 bg-slate-900"
                              disabled={saving}
                            />
                            Actif
                          </label>
                        </td>

                        <td className="px-4 py-3">
                          <button
                            onClick={() => removeTeam(idx)}
                            disabled={saving}
                            className={cn(
                              "inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold border",
                              saving
                                ? "border-slate-700 bg-slate-900/30 text-slate-400 cursor-not-allowed"
                                : "border-red-400/40 bg-red-500/10 text-red-200 hover:bg-red-500/15"
                            )}
                            title={t.id ? "Désactive (actif=false)" : "Supprime du brouillon"}
                          >
                            {t.id ? "Désactiver" : "Supprimer"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 text-xs text-slate-400">
            Conseil : on garde l’historique → on préfère <span className="text-slate-200">actif = false</span> plutôt que delete.
          </div>
        </section>

        {/* ✅ Modal ajouter équipe (type) */}
        {showAddType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950/90 p-5 shadow-2xl shadow-black/60">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">Ajouter une catégorie</div>
                  <div className="mt-1 text-xs text-slate-400">
                    Exemple : <span className="text-slate-200">Loisirs</span>, <span className="text-slate-200">Elite</span>, etc.
                  </div>
                </div>

                <button
                  onClick={() => setShowAddType(false)}
                  className="rounded-full border border-slate-700 bg-slate-900/40 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-500"
                  disabled={addingType}
                >
                  Fermer
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="md:col-span-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Nom</div>
                  <input
                    value={addTypeLabel}
                    onChange={(e) => setAddTypeLabel(e.target.value)}
                    placeholder="Ex : Loisirs"
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                    disabled={addingType}
                  />
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">Ordre</div>
                  <input
                    type="number"
                    value={addTypeOrdre}
                    onChange={(e) => setAddTypeOrdre(Number(e.target.value))}
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500/70"
                    disabled={addingType}
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                <button
                  onClick={() => setShowAddType(false)}
                  className="inline-flex items-center justify-center rounded-full border border-slate-700 bg-slate-900/30 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500"
                  disabled={addingType}
                >
                  Annuler
                </button>

                <button
                  onClick={addType}
                  disabled={addingType || !addTypeLabel.trim()}
                  className={cn(
                    "inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold shadow-md transition",
                    addingType || !addTypeLabel.trim()
                      ? "bg-slate-700/40 text-slate-300 cursor-not-allowed"
                      : "bg-pink-500 text-white hover:bg-pink-400 shadow-pink-900/40"
                  )}
                >
                  {addingType ? "Création…" : "Créer la catégorie"}
                </button>
              </div>

              <div className="mt-3 text-[11px] text-slate-400">
                Le code est généré automatiquement (ex : “Mini Mates” → <span className="text-slate-200">MINI_MATES</span>).
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
