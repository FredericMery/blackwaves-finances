"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Doc = {
  id: string;
  doc_type: string;
  status: string;
  review_comment: string | null;
  file_url: string | null;
  created_at: string;
};

type Dossier = {
  registration_id: string;
  saison: string | null;
  statut: string | null;
  athlete_id: string | null;
  parent_email: string;
  enfant: { prenom: string; nom: string; naissance: string | null };
  documents: Doc[];
  completeness: { ok: number; total: number; pct: number };
  cotisation_payee: boolean;
};

const DOC_LABELS: Record<string, string> = {
  certificat_medical: "Certificat médical",
  autorisation_parentale: "Autorisation parentale",
  photo_identite: "Photo d’identité",
  assurance: "Attestation d’assurance",
  autre: "Autre document",
};

function badgeStatus(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "validated") return "bg-black text-white border border-black";
  if (s === "rejected") return "bg-red-50 text-red-700 border border-red-200";
  return "bg-gray-50 text-gray-700 border border-gray-200";
}

function labelStatus(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "validated") return "Validé";
  if (s === "rejected") return "Refusé";
  return "Déposé";
}

function normalizeSaison(s: string | null | undefined) {
  const v = (s || "").trim();
  return v ? v : "—";
}

export default function BureauDossiersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Dossier[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  // ✅ Filtres
  const [seasonFilter, setSeasonFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<"all" | "ok" | "en_cours">("all");

  async function load() {
    setLoading(true);
    setError(null);

    const res = await fetch("/api/bureau/dossiers");
    const json = await res.json();

    if (!res.ok) {
      setError(json?.error || "Erreur chargement dossiers.");
      setLoading(false);
      return;
    }

    setRows(json.dossiers || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const seasons = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) {
      const s = normalizeSaison(r.saison);
      if (s !== "—") set.add(s);
    }
    // tri "2024-2025" etc
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;

    // filtre saison
    if (seasonFilter !== "all") {
      list = list.filter((d) => normalizeSaison(d.saison) === seasonFilter);
    }

    // filtre état dossier (OK = docs 100% + cotisation)
    if (stateFilter !== "all") {
      list = list.filter((d) => {
        const isOk = d.completeness.pct === 100 && d.cotisation_payee;
        return stateFilter === "ok" ? isOk : !isOk;
      });
    }

    // recherche
    const s = q.trim().toLowerCase();
    if (!s) return list;

    return list.filter((d) => {
      const name = `${d.enfant.prenom} ${d.enfant.nom}`.toLowerCase();
      return (
        name.includes(s) ||
        (d.parent_email || "").toLowerCase().includes(s) ||
        normalizeSaison(d.saison).toLowerCase().includes(s)
      );
    });
  }, [q, rows, seasonFilter, stateFilter]);

  const totals = useMemo(() => {
    const total = filtered.length;
    const completsDocs = filtered.filter((d) => d.completeness.pct === 100).length;
    const payes = filtered.filter((d) => d.cotisation_payee).length;
    const full = filtered.filter((d) => d.completeness.pct === 100 && d.cotisation_payee).length;
    return { total, completsDocs, payes, full };
  }, [filtered]);

  async function setCotisation(d: Dossier, value: boolean) {
    setBusyKey(`cot_${d.registration_id}`);
    try {
      const res = await fetch("/api/bureau/dossiers/cotisation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_email: d.parent_email,
          athlete_id: d.athlete_id,
          saison: d.saison,
          cotisation_payee: value,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erreur cotisation");

      setRows((prev) =>
        prev.map((x) =>
          x.registration_id === d.registration_id ? { ...x, cotisation_payee: value } : x
        )
      );
    } catch (e: any) {
      alert(e?.message || "Erreur");
    } finally {
      setBusyKey(null);
    }
  }

  async function reviewDoc(docId: string, status: "validated" | "rejected", comment?: string) {
    setBusyKey(`doc_${docId}`);
    try {
      const res = await fetch("/api/bureau/documents/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: docId, status, review_comment: comment || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erreur validation");

      await load();
    } catch (e: any) {
      alert(e?.message || "Erreur");
    } finally {
      setBusyKey(null);
    }
  }

  if (loading) return <div className="p-6">Chargement…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-gray-500">BlackWaves Cheer • Bureau</div>
            <h1 className="mt-1 text-2xl font-semibold">Suivi des dossiers</h1>
            <p className="mt-1 text-sm text-gray-600">Vue synthèse : complétude documents + cotisation.</p>
          </div>

          <div className="flex items-center gap-2">
            <Link className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50" href="/bureau/inscriptions">
              Inscriptions
            </Link>
            <button onClick={load} className="rounded-xl bg-black px-4 py-2 text-sm text-white hover:opacity-90">
              Actualiser
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6 space-y-4">
        {/* Stats */}
        <section className="grid gap-4 md:grid-cols-4">
          <StatCard title="Dossiers" value={`${totals.total}`} sub="dans la vue actuelle" />
          <StatCard title="Docs complets" value={`${totals.completsDocs}`} sub="100% docs validés" />
          <StatCard title="Cotisations payées" value={`${totals.payes}`} sub="case cochée" />
          <StatCard title="Dossiers OK" value={`${totals.full}`} sub="docs + cotisation" />
        </section>

        {/* Controls: filtres + recherche côte à côte */}
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
            <div className="flex-1">
              <div className="text-sm font-semibold">Filtres</div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <div>
                  <div className="text-xs text-gray-600 mb-1">Saison</div>
                  <select
                    value={seasonFilter}
                    onChange={(e) => setSeasonFilter(e.target.value)}
                    className="rounded-xl border px-3 py-2 text-sm bg-white"
                  >
                    <option value="all">Toutes</option>
                    {seasons.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-xs text-gray-600 mb-1">État du dossier</div>
                  <select
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value as any)}
                    className="rounded-xl border px-3 py-2 text-sm bg-white"
                  >
                    <option value="all">Tous</option>
                    <option value="ok">OK</option>
                    <option value="en_cours">En cours</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    setSeasonFilter("all");
                    setStateFilter("all");
                    setQ("");
                  }}
                  className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50"
                >
                  Réinitialiser
                </button>
              </div>
            </div>

            <div className="md:w-[340px]">
              <div className="text-xs text-gray-600 mb-1">Recherche</div>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm"
                placeholder="Nom enfant / email / saison…"
              />
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-3">Enfant</th>
                <th className="text-left p-3">Saison</th>
                <th className="text-left p-3">Docs validés</th>
                <th className="text-left p-3">Complétude</th>
                <th className="text-left p-3">Cotisation</th>
                <th className="text-left p-3">Documents</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((d) => {
                const isFull = d.completeness.pct === 100 && d.cotisation_payee;

                return (
                  <tr key={d.registration_id} className="border-t align-top">
                    <td className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">
                            {d.enfant.prenom} {d.enfant.nom}
                          </div>
                          <div className="text-xs text-gray-600">
                            {d.parent_email} • Naissance : {d.enfant.naissance || "—"} • Statut : {d.statut || "—"}
                          </div>
                        </div>

                        <span
                          className={`text-xs rounded-full px-3 py-1 border ${
                            isFull ? "bg-black text-white border-black" : "bg-white"
                          }`}
                        >
                          {isFull ? "OK" : "En cours"}
                        </span>
                      </div>
                    </td>

                    <td className="p-3">{normalizeSaison(d.saison)}</td>

                    <td className="p-3">
                      <span className="rounded-full border px-3 py-1 text-xs">
                        {d.completeness.ok}/{d.completeness.total}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-32 rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full bg-black" style={{ width: `${d.completeness.pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-700">{d.completeness.pct}%</span>
                      </div>
                    </td>

                    <td className="p-3">
                      <label className="inline-flex items-center gap-2 select-none">
                        <input
                          type="checkbox"
                          checked={d.cotisation_payee}
                          disabled={busyKey === `cot_${d.registration_id}`}
                          onChange={(e) => setCotisation(d, e.target.checked)}
                        />
                        <span className="text-xs">{d.cotisation_payee ? "Payée" : "Non payée"}</span>
                      </label>
                    </td>

                    <td className="p-3">
                      {d.documents.length === 0 ? (
                        <div className="text-xs text-gray-600">Aucun document</div>
                      ) : (
                        <div className="space-y-2">
                          {d.documents
                            .slice()
                            .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
                            .map((doc) => (
                              <div key={doc.id} className="rounded-xl border p-3 bg-white">
                                {/* ✅ 2 lignes max : titre + actions alignées */}
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <div className="text-sm font-medium truncate">
                                        {DOC_LABELS[doc.doc_type] || doc.doc_type}
                                      </div>
                                      <span className={`text-xs rounded-full px-2 py-0.5 ${badgeStatus(doc.status)}`}>
                                        {labelStatus(doc.status)}
                                      </span>
                                    </div>
                                    <div className="mt-1 text-xs text-gray-600">
                                      {new Date(doc.created_at).toLocaleDateString("fr-FR")}
                                    </div>
                                  </div>

                                  {/* ✅ Actions petites + horizontales sous le titre */}
                                  <div className="shrink-0">
                                    <div className="flex items-center gap-2">
                                      {doc.file_url ? (
                                        <a
                                          className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50"
                                          href={doc.file_url}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          Ouvrir
                                        </a>
                                      ) : (
                                        <span className="rounded-lg border px-2 py-1 text-xs text-gray-400">—</span>
                                      )}

                                      <button
                                        disabled={busyKey === `doc_${doc.id}`}
                                        onClick={() => reviewDoc(doc.id, "validated")}
                                        className="rounded-lg bg-black px-2 py-1 text-xs text-white hover:opacity-90 disabled:opacity-50"
                                      >
                                        Valider
                                      </button>

                                      <button
                                        disabled={busyKey === `doc_${doc.id}`}
                                        onClick={() => {
                                          const comment = window.prompt("Commentaire (optionnel) :") || "";
                                          reviewDoc(doc.id, "rejected", comment);
                                        }}
                                        className="rounded-lg border px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                                      >
                                        Refuser
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {doc.review_comment && (
                                  <div className="mt-2 text-xs text-gray-700">
                                    Commentaire : {doc.review_comment}
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr className="border-t">
                  <td colSpan={6} className="p-6 text-sm text-gray-600">
                    Aucun dossier ne correspond à la recherche.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <div className="text-xs text-gray-500">
          Règle V1 : dossier <b>OK</b> = documents requis <b>validés</b> + cotisation payée.
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      <div className="mt-1 text-sm text-gray-600">{sub}</div>
    </div>
  );
}
