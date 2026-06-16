"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Athlete = {
  id: string;
  prenom: string | null;
  nom: string | null;
  saison: string | null;
  equipe: string | null;
};

type LinkRow = {
  athlete_id: string;
  user_id: string;
  login_email: string;
  created_at: string;
};

export default function BureauComptesAthletesPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [athleteId, setAthleteId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedSaison, setSelectedSaison] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function authHeaders(): Promise<Record<string, string>> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/bureau/athlete-accounts", { cache: "no-store", headers });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "Impossible de charger les données");
        return;
      }
      setAthletes(json.athletes || []);
      setLinks(json.links || []);
    } catch (e: any) {
      setError(e?.message || "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const linkedSet = useMemo(() => new Set(links.map((l) => l.athlete_id)), [links]);

  const saisonsDisponibles = useMemo(() => {
    const s = new Set(athletes.map((a) => a.saison).filter(Boolean) as string[]);
    return Array.from(s).sort().reverse();
  }, [athletes]);

  const selectableAthletes = useMemo(
    () =>
      athletes.filter(
        (a) =>
          !linkedSet.has(a.id) &&
          (selectedSaison === "" || a.saison === selectedSaison)
      ),
    [athletes, linkedSet, selectedSaison]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);

    if (!athleteId || !email || !password) {
      setError("Tous les champs sont obligatoires.");
      return;
    }

    setSaving(true);
    try {
      const extraHeaders = await authHeaders();
      const res = await fetch("/api/bureau/athlete-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...extraHeaders },
        body: JSON.stringify({ athleteId, email, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || "Création impossible");
        return;
      }

      setOkMsg("Compte athlète créé et lié avec succès.");
      setAthleteId("");
      setEmail("");
      setPassword("");
      await load();
    } catch (e: any) {
      setError(e?.message || "Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 pt-8 md:px-6">
        <header className="border-b border-slate-200 pb-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-600">
                Espace bureau
              </p>
              <h1 className="mt-2 text-2xl font-bold md:text-4xl">Créer un compte athlète</h1>
              <p className="mt-2 text-sm text-slate-500">
                Écran interne pour créer un accès athlète en 1 étape et le lier au bon profil.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/bureau/liste-athletes"
                className="rounded-full bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
              >
                Retour liste athlètes
              </Link>
              <Link
                href="/bureau"
                className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Retour bureau
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Nouveau compte</h2>
            <p className="mt-1 text-sm text-slate-500">
              Le compte créé reçoit automatiquement le rôle athlete.
            </p>

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            {okMsg && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {okMsg}
              </div>
            )}

            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Saison</label>
                <select
                  value={selectedSaison}
                  onChange={(e) => { setSelectedSaison(e.target.value); setAthleteId(""); }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="">Toutes les saisons</option>
                  {saisonsDisponibles.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Athlète</label>
                <select
                  value={athleteId}
                  onChange={(e) => setAthleteId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  required
                >
                  <option value="">Choisir un athlète…</option>
                  {selectableAthletes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {`${a.prenom ?? ""} ${a.nom ?? ""}`.trim()} · {a.equipe ?? "Sans équipe"} · {a.saison ?? "Saison ?"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Email de connexion</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  placeholder="athlete@blackwaves-cheer.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Mot de passe initial</label>
                <input
                  type="text"
                  minLength={8}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  placeholder="8 caractères minimum"
                />
              </div>

              <button
                type="submit"
                disabled={saving || loading}
                className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                {saving ? "Création en cours..." : "Créer le compte athlète"}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold">Comptes déjà liés</h2>
            <p className="mt-1 text-sm text-slate-500">{links.length} compte(s) athlète configuré(s)</p>

            {loading ? (
              <div className="mt-4 text-sm text-slate-500">Chargement...</div>
            ) : links.length === 0 ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                Aucun compte athlète lié pour le moment.
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                {links.map((l) => {
                  const a = athletes.find((x) => x.id === l.athlete_id);
                  const name = `${a?.prenom ?? ""} ${a?.nom ?? ""}`.trim() || "Athlète";
                  return (
                    <div
                      key={l.user_id}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div className="text-sm font-semibold text-slate-800">{name}</div>
                      <div className="text-xs text-slate-600">{l.login_email}</div>
                      <div className="text-[11px] text-slate-500">
                        {a?.equipe ?? "Sans équipe"} · {a?.saison ?? "Saison ?"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
