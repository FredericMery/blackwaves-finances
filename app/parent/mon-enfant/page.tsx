"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

type Child = {
  id: string;
  saison: string | null;
  statut: string | null;
  athlete_id: string | null;
  prenom_enfant: string;
  nom_enfant: string;
  date_naissance: string | null;
};

type Doc = {
  id: string;
  athlete_id: string | null;
  saison: string | null;
  doc_type: string;
  file_url: string | null;
  status: string;
  created_at: string;
};

const DOC_LABELS: Record<string, string> = {
  certificat_medical: "Certificat médical",
  autorisation_parentale: "Autorisation parentale",
  photo_identite: "Photo d’identité",
  assurance: "Attestation d’assurance",
  autre: "Autre document",
};

const STATUS_BADGE: Record<string, string> = {
  validated: "bg-black text-white border-black",
  rejected: "bg-red-50 text-red-700 border-red-200",
  uploaded: "bg-gray-50 text-gray-700 border-gray-200",
};

const STATUS_LABELS: Record<string, string> = {
  validated: "Validé",
  rejected: "Refusé",
  uploaded: "Déposé",
};

function normSeason(s: string | null | undefined) {
  const v = (s || "").trim();
  return v ? v : "—";
}

/**
 * ✅ Wrapper obligatoire pour Next.js :
 * useSearchParams() doit être dans un composant rendu sous Suspense.
 */
export default function ParentMonEnfantPage() {
  return (
    <Suspense fallback={<div className="p-6">Chargement…</div>}>
      <MonEnfantClient />
    </Suspense>
  );
}

function MonEnfantClient() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();
  const sp = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [parentEmail, setParentEmail] = useState<string | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);

  const urlSeason = sp?.get("season") ? decodeURIComponent(sp.get("season") as string) : null;
  const fromReinscription = sp?.get("reinscription") === "1";

  const [selectedSeason, setSelectedSeason] = useState<string>("all");

  async function load() {
    setLoading(true);
    setError(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      setLoading(false);
      setError("Vous n’êtes pas connecté.");
      return;
    }

    const res = await fetch("/api/parent/dashboard", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const json = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(json?.error || "Erreur chargement données.");
      return;
    }

    setParentEmail(json.parent.email);
    setChildren(json.children || []);
    setDocs(json.documents || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // saisons disponibles depuis les enfants
  const seasons = useMemo(() => {
    const set = new Set<string>();
    for (const c of children) {
      const s = normSeason(c.saison);
      if (s !== "—") set.add(s);
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [children]);

  // V2 : si une saison est passée dans l’URL, on la pré-sélectionne
  useEffect(() => {
    if (!seasons.length) return;

    if (urlSeason && seasons.includes(urlSeason)) {
      setSelectedSeason(urlSeason);
      return;
    }
    // sinon on prend la plus récente
    if (selectedSeason === "all") setSelectedSeason(seasons[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasons.join("|")]);

  const docsByAthlete = useMemo(() => {
    const map = new Map<string, Doc[]>();
    for (const d of docs) {
      const key = d.athlete_id || "unknown_athlete";
      map.set(key, [...(map.get(key) || []), d]);
    }
    return map;
  }, [docs]);

  const filteredChildren = useMemo(() => {
    if (selectedSeason === "all") return children;
    return children.filter((c) => normSeason(c.saison) === selectedSeason);
  }, [children, selectedSeason]);

  const requiredDocTypes = useMemo(() => ["certificat_medical", "autorisation_parentale"], []);
  const missingByChild = useMemo(() => {
    const out = new Map<string, string[]>();
    for (const c of filteredChildren) {
      const key = c.athlete_id || "unknown_athlete";
      const childDocs = docsByAthlete.get(key) || [];
      const validated = new Set(childDocs.filter((d) => d.status === "validated").map((d) => d.doc_type));
      const missing = requiredDocTypes.filter((t) => !validated.has(t));
      out.set(key, missing);
    }
    return out;
  }, [filteredChildren, docsByAthlete, requiredDocTypes]);

  if (loading) return <div className="p-6">Chargement…</div>;

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-xl font-semibold">Mon enfant</div>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          <div className="mt-4 flex gap-3">
            <Link className="rounded-xl bg-black px-4 py-2 text-sm text-white hover:opacity-90" href="/parent/login">
              Se connecter
            </Link>
            <Link className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50" href="/">
              Retour au site
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-gray-500">BlackWaves Cheer • Espace parent</div>
            <h1 className="mt-1 text-2xl font-semibold">Mon enfant</h1>
            <p className="mt-1 text-sm text-gray-600">{parentEmail}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50" href="/parent">
              Retour dashboard
            </Link>
            <Link className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50" href="/parent/planning">
              Planning
            </Link>
            <Link className="rounded-xl bg-black px-4 py-2 text-sm text-white hover:opacity-90" href="/parent/questions">
              Questions
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
        {/* Bandeau V2 */}
        {fromReinscription && (
          <div className="rounded-2xl border bg-white p-4 shadow-sm text-sm">
            ✅ Ré-inscription créée. Sélectionnez la saison <b>{selectedSeason !== "all" ? selectedSeason : "suivante"}</b> puis complétez les documents si besoin.
          </div>
        )}

        {/* Contrôles */}
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Saison</div>
              <div className="text-xs text-gray-600 mt-1">Choisissez la saison à afficher</div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedSeason}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedSeason(v);
                  if (v === "all") {
                    router.replace("/parent/mon-enfant");
                  } else {
                    router.replace(`/parent/mon-enfant?season=${encodeURIComponent(v)}`);
                  }
                }}
                className="rounded-xl border px-3 py-2 text-sm bg-white"
              >
                <option value="all">Toutes</option>
                {seasons.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <button onClick={load} className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">
                Actualiser
              </button>
            </div>
          </div>
        </section>

        {/* Liste enfants */}
        <section className="space-y-4">
          <div>
            <div className="text-lg font-semibold">Enfants</div>
            <div className="text-sm text-gray-600">
              {selectedSeason === "all" ? "Toutes saisons" : `Saison : ${selectedSeason}`}
            </div>
          </div>

          {filteredChildren.length === 0 ? (
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold">Aucun enfant trouvé</div>
              <div className="mt-2 text-sm text-gray-600">Si vous pensez que c’est une erreur, contactez le club.</div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredChildren.map((c) => {
                const k = c.athlete_id || "unknown_athlete";
                const childDocs = docsByAthlete.get(k) || [];
                const missing = missingByChild.get(k) || [];

                const recent = [...childDocs]
                  .filter((d) => selectedSeason === "all" || normSeason(d.saison) === selectedSeason)
                  .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
                  .slice(0, 6);

                return (
                  <div key={c.id} className="rounded-2xl border bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar initials={`${c.prenom_enfant?.[0] || ""}${c.nom_enfant?.[0] || ""}`} />
                        <div>
                          <div className="font-semibold">
                            {c.prenom_enfant} {c.nom_enfant}
                          </div>
                          <div className="mt-1 text-xs text-gray-600">
                            Saison : {c.saison || "—"} • Statut : {c.statut || "—"} • Naissance : {c.date_naissance || "—"}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs rounded-full border px-3 py-1">
                        {childDocs.length} doc{childDocs.length > 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Complétude */}
                    <div className="mt-4 rounded-xl bg-gray-50 p-4">
                      <div className="text-sm font-semibold">Complétude documents</div>
                      {missing.length === 0 ? (
                        <div className="mt-1 text-sm text-gray-700">Tous les documents requis sont validés.</div>
                      ) : (
                        <div className="mt-1 text-sm text-gray-700">
                          Documents manquants :{" "}
                          <span className="font-medium">{missing.map((t) => DOC_LABELS[t] || t).join(", ")}</span>
                        </div>
                      )}
                    </div>

                    {/* Docs récents */}
                    <div className="mt-4">
                      <div className="text-sm font-semibold">Documents</div>
                      {recent.length === 0 ? (
                        <div className="mt-2 text-sm text-gray-600">Aucun document pour le moment.</div>
                      ) : (
                        <div className="mt-2 space-y-2">
                          {recent.map((d) => (
                            <div key={d.id} className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-medium">{DOC_LABELS[d.doc_type] || d.doc_type}</div>
                                <div className="mt-1 text-xs text-gray-600">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-full border ${
                                      STATUS_BADGE[d.status] || STATUS_BADGE.uploaded
                                    }`}
                                  >
                                    {STATUS_LABELS[d.status] || d.status}
                                  </span>{" "}
                                  • {new Date(d.created_at).toLocaleDateString("fr-FR")}
                                </div>
                              </div>
                              {d.file_url ? (
                                <a className="text-sm underline" href={d.file_url} target="_blank" rel="noreferrer">
                                  Ouvrir
                                </a>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <a
                        href="#docs"
                        className="flex-1 rounded-xl bg-black px-3 py-2 text-center text-sm text-white hover:opacity-90"
                      >
                        Déposer / gérer documents
                      </a>
                      <Link className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50" href="/contact">
                        Contact
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section docs (ancre) */}
        <section id="docs" className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-semibold">Documents</div>
              <div className="text-sm text-gray-600">
                Ici on branchera ton module d’upload / dépôt (si déjà existant) pour finaliser l’expérience.
              </div>
            </div>
            <Link className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50" href="/parent">
              Retour dashboard
            </Link>
          </div>

          <div className="mt-4 text-sm text-gray-700">
            Colle-moi ton fichier actuel d’upload (ou l’API utilisée) et je l’intègre ici sans casser l’existant.
          </div>
        </section>
      </div>
    </div>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div className="h-10 w-10 rounded-2xl bg-gray-100 border flex items-center justify-center font-semibold text-sm">
      {initials || "BW"}
    </div>
  );
}
