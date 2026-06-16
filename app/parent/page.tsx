"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { getNextSeasonLabel, isReinscriptionOpen } from "@/lib/season";

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

// ✅ NEW: photos déposées par le parent
type PhotoSubmission = {
  id: string;
  url: string | null;
  title: string | null;
  status: string | null;
  created_at: string | null;
};

const DOC_LABELS: Record<string, string> = {
  certificat_medical: "Certificat médical",
  autorisation_parentale: "Autorisation parentale",
  photo_identite: "Photo d’identité",
  assurance: "Attestation d’assurance",
  autre: "Autre document",
};

const STATUS_LABELS: Record<string, string> = {
  validated: "Validé",
  rejected: "Refusé",
  uploaded: "Déposé",
};

// ✅ NEW: mapping statut photos (adapte si tes statuts diffèrent)
const PHOTO_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  approved: "Validée",
  published: "Publiée",
  rejected: "Refusée",
};

function photoStatusStyle(status?: string | null) {
  const s = (status || "pending").toLowerCase();
  if (s === "published" || s === "approved") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (s === "rejected") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  return "bg-amber-50 text-amber-800 border-amber-200";
}

function safeUrl(url?: string | null) {
  if (!url) return "";
  const u = url.trim();
  if (!u) return "";
  if (u.startsWith("//")) return `https:${u}`;
  return u;
}

export default function ParentDashboardPage() {
  // ✅ IMPORTANT: wrapper Suspense obligatoire pour useSearchParams
  return (
    <Suspense fallback={<div className="p-6">Chargement…</div>}>
      <ParentDashboardClient />
    </Suspense>
  );
}

function ParentDashboardClient() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [parentEmail, setParentEmail] = useState<string | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [docs, setDocs] = useState<Doc[]>([]);

  // ✅ NEW
  const [photos, setPhotos] = useState<PhotoSubmission[]>([]);

  // Ré-inscription (V1/V2)
  const nextSeasonLabel = useMemo(() => getNextSeasonLabel(new Date()), []);
  const reinscriptionOpen = useMemo(() => isReinscriptionOpen(new Date()), []);

  const [reinBusy, setReinBusy] = useState(false);
  const [reinMsg, setReinMsg] = useState<string | null>(null);

  // V2 : bandeau si on arrive depuis l’email
  const fromInvite = searchParams?.get("reinscription") === "1";

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

    const sessionEmail = sessionData?.session?.user?.email || null;

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

    // ✅ NEW: charge les photos déposées par CE parent (lecture directe Supabase)
    // -> n’impacte pas ton backend / tes routes
    try {
      const emailToUse = (json?.parent?.email as string) || sessionEmail;
      if (emailToUse) {
        const { data, error: e } = await supabase
          // ⚠️ si ta table s’appelle autrement, change ici
          .from("photos")
          .select("id,url,title,status,created_at")
          .eq("parent_email", emailToUse)
          .order("created_at", { ascending: false })
          .limit(20);

        if (e) {
          // on ne bloque pas le dashboard si la table est RLS ou autre
          console.warn("Photos load error:", e.message);
          setPhotos([]);
        } else {
          setPhotos((data || []) as PhotoSubmission[]);
        }
      } else {
        setPhotos([]);
      }
    } catch (e) {
      console.warn("Photos load exception:", e);
      setPhotos([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const docsByAthlete = useMemo(() => {
    const map = new Map<string, Doc[]>();
    for (const d of docs) {
      const key = d.athlete_id || "unknown_athlete";
      map.set(key, [...(map.get(key) || []), d]);
    }
    return map;
  }, [docs]);

  const recentDocs = useMemo(() => {
    return [...docs]
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
      .slice(0, 5);
  }, [docs]);

  // ✅ NEW
  const recentPhotos = useMemo(() => {
    return [...photos]
      .sort((a, b) => +new Date(b.created_at || 0) - +new Date(a.created_at || 0))
      .slice(0, 6);
  }, [photos]);

  const todo = useMemo(() => {
    const items: { title: string; desc: string; href: string }[] = [];
    for (const c of children) {
      const key = c.athlete_id || "unknown_athlete";
      const count = (docsByAthlete.get(key) || []).length;
      if (count === 0) {
        items.push({
          title: `Documents à déposer`,
          desc: `${c.prenom_enfant} ${c.nom_enfant} : aucun document enregistré`,
          href: "/parent/mon-enfant",
        });
      }
    }
    return items.slice(0, 3);
  }, [children, docsByAthlete]);

  async function handleReinscription() {
    setReinMsg(null);
    setReinBusy(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Vous n’êtes pas connecté.");

      const res = await fetch("/api/parent/reinscription", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erreur ré-inscription.");

      setReinMsg(
        `Ré-inscription créée pour ${json.nextSeason} : ${json.created_count} enfant(s). ` +
          (json.skipped_count ? `(${json.skipped_count} déjà existante(s))` : "")
      );

      const season = encodeURIComponent(json.nextSeason);
      router.push(`/parent/mon-enfant?season=${season}&reinscription=1`);
    } catch (e: any) {
      setReinMsg(e?.message || "Erreur");
    } finally {
      setReinBusy(false);
    }
  }

  if (loading) return <div className="p-6">Chargement…</div>;

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-xl font-semibold">Espace parent</div>
          <p className="mt-2 text-sm text-gray-600">{error}</p>
          <div className="mt-4 flex gap-3">
            <Link
              className="rounded-xl bg-black px-4 py-2 text-sm text-white hover:opacity-90"
              href="/parent/login"
            >
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
            <h1 className="mt-1 text-2xl font-semibold">Tableau de bord</h1>
            <p className="mt-1 text-sm text-gray-600">{parentEmail}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleReinscription}
              disabled={!reinscriptionOpen || reinBusy || children.length === 0}
              className={`rounded-xl px-4 py-2 text-sm border transition ${
                reinscriptionOpen && !reinBusy && children.length > 0
                  ? "bg-black text-white border-black hover:opacity-90"
                  : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
              }`}
              title={
                reinscriptionOpen
                  ? `Créer la ré-inscription pour ${nextSeasonLabel}`
                  : "Ré-inscription fermée (ouverte de juin à octobre)."
              }
            >
              {reinBusy ? "Ré-inscription…" : `Ré-inscription saison ${nextSeasonLabel}`}
            </button>

            <Link className="rounded-xl bg-black px-4 py-2 text-sm text-white hover:opacity-90" href="/parent/mon-enfant">
              Mon enfant
            </Link>
            <Link className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50" href="/parent/planning">
              Planning
            </Link>
            <Link className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50" href="/parent/questions">
              Questions
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 py-6 space-y-6">
        {fromInvite && reinscriptionOpen && (
          <div className="rounded-2xl border bg-white p-4 shadow-sm text-sm">
            Les ré-inscriptions sont ouvertes. Cliquez sur <b>“Ré-inscription saison {nextSeasonLabel}”</b> pour démarrer.
          </div>
        )}

        {reinMsg && (
          <div className="rounded-2xl border bg-white p-4 shadow-sm text-sm">
            {reinMsg}
          </div>
        )}

        {/* KPI */}
        <section className="grid gap-4 md:grid-cols-3">
          <KpiCard title="Enfants" value={`${children.length}`} sub="Rattachés à votre compte" />
          <KpiCard title="Documents" value={`${docs.length}`} sub="Déposés sur votre espace" />
          <KpiCard
            title="Statut"
            value={children.some((c) => (c.statut || "").toLowerCase().includes("valide")) ? "Actif" : "En cours"}
            sub="Selon vos inscriptions"
          />
        </section>

        {/* Todo */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">À faire</div>
              <div className="mt-1 text-sm text-gray-600">Les actions importantes pour que le dossier soit complet.</div>
            </div>
            <button onClick={load} className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50">
              Actualiser
            </button>
          </div>

          {todo.length === 0 ? (
            <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
              Tout est bon pour le moment. Vous pouvez consulter la fiche enfant ou déposer un document si besoin.
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {todo.map((t, idx) => (
                <Link key={idx} href={t.href} className="rounded-2xl border bg-gray-50 p-4 hover:bg-gray-100 transition">
                  <div className="text-sm font-semibold">{t.title}</div>
                  <div className="mt-1 text-sm text-gray-600">{t.desc}</div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Main grid */}
        <section className="grid gap-6 lg:grid-cols-3">
          {/* Children cards */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-lg font-semibold">Mes enfants</div>
                <div className="text-sm text-gray-600">Accès rapide aux informations et documents</div>
              </div>
              <Link className="text-sm underline" href="/parent/mon-enfant">
                Voir tout
              </Link>
            </div>

            {children.length === 0 ? (
              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="text-sm font-semibold">Aucun enfant trouvé</div>
                <div className="mt-2 text-sm text-gray-600">Si vous pensez que c’est une erreur, contactez le club.</div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {children.slice(0, 4).map((c) => {
                  const key = c.athlete_id || "unknown_athlete";
                  const childDocs = docsByAthlete.get(key) || [];
                  const lastDoc = [...childDocs].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0];

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
                              Saison : {c.saison || "—"} • Statut : {c.statut || "—"}
                            </div>
                          </div>
                        </div>

                        <span className="text-xs rounded-full border px-3 py-1">
                          {childDocs.length} doc{childDocs.length > 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="mt-4 rounded-xl bg-gray-50 p-4">
                        <div className="text-xs text-gray-500">Dernier document</div>
                        <div className="mt-1 text-sm text-gray-800">
                          {lastDoc ? DOC_LABELS[lastDoc.doc_type] || lastDoc.doc_type : "—"}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {lastDoc ? new Date(lastDoc.created_at).toLocaleDateString("fr-FR") : "Aucun document"}
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <Link
                          className="flex-1 rounded-xl bg-black px-3 py-2 text-center text-sm text-white hover:opacity-90"
                          href="/parent/mon-enfant"
                        >
                          Ouvrir la fiche
                        </Link>
                        <Link className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50" href="/parent/mon-enfant">
                          Docs
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* ✅ NEW: Photos déposées */}
            <div>
              <div className="text-lg font-semibold">Mes photos déposées</div>
              <div className="text-sm text-gray-600">Suivi de validation par le club</div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              {recentPhotos.length === 0 ? (
                <div className="text-sm text-gray-600">Aucune photo déposée pour le moment.</div>
              ) : (
                <div className="space-y-3">
                  {recentPhotos.map((p) => {
                    const url = safeUrl(p.url);
                    const label = PHOTO_STATUS_LABELS[(p.status || "pending").toLowerCase()] || (p.status || "En attente");
                    const badge = photoStatusStyle(p.status);
                    const date = p.created_at ? new Date(p.created_at).toLocaleDateString("fr-FR") : "—";

                    return (
                      <div key={p.id} className="flex items-center gap-3">
                        <div className="h-12 w-12 overflow-hidden rounded-xl border bg-gray-50 shrink-0">
                          {url ? (
                            <img src={url} alt={p.title || "Photo"} className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <div className="h-full w-full grid place-items-center text-[10px] text-gray-400">—</div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-gray-900">
                            {p.title || "Photo"}
                          </div>
                          <div className="mt-0.5 text-xs text-gray-500">{date}</div>
                        </div>

                        <span className={`text-xs rounded-full border px-2.5 py-1 ${badge}`}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-4 text-xs text-gray-500">
                Une fois validée, votre photo apparaîtra dans la galerie.
              </div>
            </div>

            {/* Documents récents */}
            <div>
              <div className="text-lg font-semibold">Documents récents</div>
              <div className="text-sm text-gray-600">Les derniers dépôts sur votre espace</div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              {recentDocs.length === 0 ? (
                <div className="text-sm text-gray-600">Aucun document déposé pour le moment.</div>
              ) : (
                <div className="space-y-3">
                  {recentDocs.map((d) => (
                    <div key={d.id} className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">{DOC_LABELS[d.doc_type] || d.doc_type}</div>
                        <div className="mt-1 text-xs text-gray-600">
                          {STATUS_LABELS[d.status] || d.status} • {new Date(d.created_at).toLocaleDateString("fr-FR")}
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

              <div className="mt-4">
                <Link className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 inline-block" href="/parent/mon-enfant">
                  Déposer / voir les documents
                </Link>
              </div>
            </div>

            {/* Help card */}
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold">Besoin d’aide ?</div>
              <div className="mt-2 text-sm text-gray-600">Une question sur l’inscription, les documents ou le planning ?</div>
              <div className="mt-4 flex gap-2">
                <Link className="rounded-xl bg-black px-3 py-2 text-sm text-white hover:opacity-90" href="/parent/questions">
                  Voir les questions
                </Link>
                <Link className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50" href="/contact">
                  Contacter le club
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="text-xs text-gray-500">
          Astuce : vous pouvez déposer les documents au format PDF depuis “Mon enfant”.
        </div>
      </div>
    </div>
  );
}

function KpiCard({ title, value, sub }: { title: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      <div className="mt-1 text-sm text-gray-600">{sub}</div>
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
