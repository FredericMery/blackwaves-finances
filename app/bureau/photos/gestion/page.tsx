"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type ListedPhoto = {
  path: string;
  name: string;
  folder: string;
  url: string;
  updated_at?: string | null;
  created_at?: string | null;
  size?: number | null;
};

function cn(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

type Bucket = "photos" | "photo-submissions";

export default function BureauPhotosGestionPage() {
  const [items, setItems] = useState<ListedPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // ✅ pagination (évite de charger 100% des photos d’un coup)
  const PAGE_LIMIT = 50;
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);


  // ✅ bucket + prefix
  const [bucket, setBucket] = useState<Bucket>("photos");
  const [prefix, setPrefix] = useState<string>("");

  const [q, setQ] = useState("");
  const [folder, setFolder] = useState<string>("");

  const [deleting, setDeleting] = useState<string | null>(null);

  // ✅ sélection pour HERO
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [heroBusy, setHeroBusy] = useState<"append" | "replace" | null>(null);

  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected]
  );

  const folders = useMemo(() => {
    const set = new Set(items.map((x) => x.folder).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return items.filter((x) => {
      if (folder && x.folder !== folder) return false;
      if (!query) return true;
      return (
        x.name.toLowerCase().includes(query) ||
        x.path.toLowerCase().includes(query) ||
        (x.folder || "").toLowerCase().includes(query)
      );
    });
  }, [items, q, folder]);

  async function load(next?: { bucket?: Bucket; prefix?: string }) {
    const b = next?.bucket ?? bucket;
    const p = (next?.prefix ?? prefix).trim();

    setLoading(true);
    setErr(null);

    try {
      const qs = new URLSearchParams();
      qs.set("bucket", b);
      qs.set("limit", String(PAGE_LIMIT));
      if (p) qs.set("prefix", p);


      const r = await fetch(`/api/bureau/photos/storage-list?${qs.toString()}`, {
        cache: "no-store",
      });

      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(t || `HTTP ${r.status}`);
      }

      const j = await r.json();
      const list = Array.isArray(j?.items) ? j.items : [];
        setItems(list);
        setNextCursor(typeof j?.next_cursor === "string" ? j.next_cursor : null);
        

    } catch (e: any) {
      setErr(e?.message || "Erreur chargement");
      setItems([]);
      setNextCursor(null);
    } finally {
      setLoading(false);
    }
  }
  async function loadMore() {
  if (!nextCursor || loadingMore) return;

  const b = bucket;
  const p = prefix.trim();

  setLoadingMore(true);
  setErr(null);

  try {
    const qs = new URLSearchParams();
    qs.set("bucket", b);
    qs.set("limit", String(PAGE_LIMIT));
    qs.set("cursor", nextCursor);
    if (p) qs.set("prefix", p);

    const r = await fetch(`/api/bureau/photos/storage-list?${qs.toString()}`, {
      cache: "no-store",
    });

    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(t || `HTTP ${r.status}`);
    }

    const j = await r.json();
const more = Array.isArray(j && j.items) ? j.items : [];

setItems((prev) => [...prev, ...more]);
setNextCursor(j && typeof j.next_cursor === "string" ? j.next_cursor : null);

if ((!j || !j.next_cursor) && more.length === PAGE_LIMIT) {
  console.warn(
    "⚠️ Pagination: next_cursor null alors que la page est pleine. Vérifier l'API storage-list."
  );
}

  } catch (e: any) {
    setErr(e?.message || "Erreur chargement");
  } finally {
    setLoadingMore(false);
  }
}


  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ recharge auto quand bucket/prefix change
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket, prefix]);

  // ✅ si on change de bucket/prefix, on vide la sélection (évite confusion)
  useEffect(() => {
  setSelected({});
  setNextCursor(null);
}, [bucket, prefix]);


  async function remove(path: string) {
    setDeleting(path);
    try {
      const r = await fetch("/api/bureau/photos/storage-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ path, bucket }),
      });

      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(t || `HTTP ${r.status}`);
      }

      setItems((prev) => prev.filter((x) => x.path !== path));
      setSelected((prev) => {
        if (!prev[path]) return prev;
        const copy = { ...prev };
        delete copy[path];
        return copy;
      });
    } catch (e: any) {
      alert(e?.message || "Suppression impossible");
    } finally {
      setDeleting(null);
    }
  }

  function applyPreset(p: "VALIDATED" | "HERO" | "PENDING" | "REJECTED" | "ALL_SUBMISSIONS") {

    if (p === "VALIDATED") {
      setBucket("photos");
      setPrefix("");
      setFolder("");
      setQ("");
      return;
    }
    if (p === "HERO") {
      setBucket("photos");
      setPrefix("hero");
      setFolder("");
      setQ("");
      return;
    }

    if (p === "PENDING") {
      setBucket("photo-submissions");
      setPrefix("pending");
      setFolder("");
      setQ("");
      return;
    }
    if (p === "REJECTED") {
      setBucket("photo-submissions");
      setPrefix("rejected");
      setFolder("");
      setQ("");
      return;
    }
    if (p === "ALL_SUBMISSIONS") {
      setBucket("photo-submissions");
      setPrefix("");
      setFolder("");
      setQ("");
      return;
    }
  }

  const scopeLabel =
    bucket === "photos"
      ? "photos (validées)"
      : prefix
      ? `photo-submissions / ${prefix}`
      : "photo-submissions (tout)";

  // ✅ HERO badge: actif quand on navigue dans le dossier hero (ou sous-dossier)
  const isHeroScope =
    bucket === "photos" && prefix.trim().toLowerCase().startsWith("hero");

  // ✅ sélection helpers
  function toggleSelect(path: string) {
    setSelected((prev) => ({ ...prev, [path]: !prev[path] }));
  }

  function clearSelection() {
    setSelected({});
  }

  async function syncHero(mode: "append" | "replace") {
    const paths = Object.entries(selected)
      .filter(([, v]) => v)
      .map(([k]) => k);

    if (!paths.length) return;

    if (mode === "replace") {
      const ok = confirm(
        `Remplacer le HERO par ${paths.length} photo(s) ?\n\nLe dossier photos/hero sera vidé avant copie.`
      );
      if (!ok) return;
    }

    setHeroBusy(mode);
    try {
      const r = await fetch("/api/bureau/photos/hero-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ mode, paths }),
      });

      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(t || `HTTP ${r.status}`);
      }

      clearSelection();
await load();

const go = confirm(
  (mode === "replace" ? "✅ HERO remplacé.\n\n" : "✅ Ajouté au HERO.\n\n") +
    "Voulez-vous afficher le dossier HERO maintenant ?"
);

if (go) {
  setBucket("photos");
  setPrefix("hero");
  setFolder("");
  setQ("");
}

    } catch (e: any) {
      alert(e?.message || "Erreur HERO");
    } finally {
      setHeroBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10">
        {/* Header */}
        <header className="mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-400">
                Galerie
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold text-white md:text-4xl">
                  Gestion & suppression des photos
                </h1>

                {/* ✅ Badge HERO (uniquement si on est dans le scope hero) */}
                {isHeroScope && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-100">
                    <span className="h-2 w-2 rounded-full bg-sky-300 shadow-[0_0_10px_rgba(147,197,253,0.8)]" />
                    HERO
                  </span>
                )}
              </div>

              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Gestion multi-buckets : galerie validée (<span className="text-slate-100 font-semibold">photos</span>) et
                soumissions parents (<span className="text-slate-100 font-semibold">photo-submissions</span>).
              </p>

              {/* Presets */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => applyPreset("VALIDATED")}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-semibold backdrop-blur transition",
                    bucket === "photos"
                      ? "border-sky-300/30 bg-sky-500/15 text-sky-100"
                      : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                  )}
                >
                  ✅ Validées (galerie)
                </button>

                <button
                  onClick={() => applyPreset("HERO")}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-semibold backdrop-blur transition",
                    bucket === "photos" && prefix.trim().toLowerCase().startsWith("hero")
                      ? "border-sky-300/30 bg-sky-500/15 text-sky-100"
                      : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                  )}
                >
                  🟦 HERO
                </button>

                <button
                  onClick={() => applyPreset("PENDING")}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-semibold backdrop-blur transition",
                    bucket === "photo-submissions" && prefix === "pending"
                      ? "border-amber-300/30 bg-amber-500/15 text-amber-100"
                      : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                  )}
                >
                  ⏳ En attente
                </button>

                <button
                  onClick={() => applyPreset("REJECTED")}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-semibold backdrop-blur transition",
                    bucket === "photo-submissions" && prefix === "rejected"
                      ? "border-rose-300/30 bg-rose-500/15 text-rose-100"
                      : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                  )}
                >
                  ❌ Refusées
                </button>

                <button
                  onClick={() => applyPreset("ALL_SUBMISSIONS")}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[11px] font-semibold backdrop-blur transition",
                    bucket === "photo-submissions" && prefix === ""
                      ? "border-violet-300/30 bg-violet-500/15 text-violet-100"
                      : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                  )}
                >
                  📦 Toutes soumissions
                </button>

                <span className="ml-1 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-300">
                  Scope :{" "}
                  <span className="ml-1 font-semibold text-slate-100">
                    {scopeLabel}
                  </span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/bureau/photos/moderation"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10"
              >
                ← Retour modération
              </Link>

              <button
                onClick={() => load()}
                className="rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-xs font-semibold text-sky-100 hover:bg-sky-500/20"
              >
                Rafraîchir
              </button>
            </div>
          </div>
        </header>

        {/* Filtres */}
        <div className="mb-4 grid gap-3 rounded-2xl border border-white/10 bg-slate-900/40 p-4 backdrop-blur md:grid-cols-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-200/80">
              Bucket
            </label>
            <select
              value={bucket}
              onChange={(e) => setBucket(e.target.value as Bucket)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400/40 focus:ring-2 focus:ring-sky-300/20"
            >
              <option value="photos">photos (validées)</option>
              <option value="photo-submissions">photo-submissions (soumissions)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-200/80">
              Prefix (dossier)
            </label>
            <input
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder={
                bucket === "photos"
                  ? "ex: 2024-2025 | site | hero"
                  : "ex: pending/2024-2025"
              }
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-sky-400/40 focus:ring-2 focus:ring-sky-300/20"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-[11px] font-semibold text-slate-200/80">
              Recherche
            </label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nom de fichier, dossier, path…"
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 outline-none focus:border-sky-400/40 focus:ring-2 focus:ring-sky-300/20"
            />
          </div>

          <div className="md:col-span-3">
            <label className="mb-1 block text-[11px] font-semibold text-slate-200/80">
              Dossier / Saison (filtre rapide)
            </label>
            <select
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400/40 focus:ring-2 focus:ring-sky-300/20"
            >
              <option value="">Tous</option>
              {folders.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div className="text-[11px] text-slate-300 md:col-span-4">
            {loading ? (
              <span>Chargement…</span>
            ) : (
              <span>
                <span className="font-semibold text-slate-100">{filtered.length}</span>{" "}
                photo(s) affichée(s) sur{" "}
                <span className="font-semibold text-slate-100">{items.length}</span>{" "}
                au total.
              </span>
            )}
            {err && <div className="mt-2 text-rose-200">Erreur : {err}</div>}
          </div>
        </div>

        {/* ✅ BARRE HERO (seulement bucket photos) */}
        {bucket === "photos" && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/40 p-3 backdrop-blur">
            <div className="text-[11px] text-slate-300">
              <span className="font-semibold text-slate-100">{selectedCount}</span>{" "}
              sélectionnée(s)
              {selectedCount > 0 && (
                <button
                  onClick={() => setSelected({})}
                  className="ml-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-100 hover:bg-white/10"
                >
                  Effacer
                </button>
              )}
              <span className="ml-2 text-[10px] text-slate-400">
                (copie vers{" "}
                <span className="text-slate-200 font-semibold">photos/hero</span>)
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                disabled={selectedCount === 0 || heroBusy !== null}
                onClick={() => syncHero("append")}
                className="rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-xs font-semibold text-sky-100 hover:bg-sky-500/20 disabled:opacity-50"
              >
                {heroBusy === "append" ? "…" : "Ajouter au HERO"}
              </button>

              <button
                disabled={selectedCount === 0 || heroBusy !== null}
                onClick={() => syncHero("replace")}
                className="rounded-full border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-100 hover:bg-rose-500/20 disabled:opacity-50"
              >
                {heroBusy === "replace" ? "…" : "Remplacer le HERO"}
              </button>
            </div>
          </div>
        )}

        {/* Grille */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {loading &&
            Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-52 animate-pulse rounded-2xl border border-white/10 bg-white/5"
              />
            ))}

          {!loading && filtered.length === 0 && (
            <div className="col-span-full rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200/90">
              Aucune photo à afficher avec ces filtres.
            </div>
          )}

          {!loading &&
            filtered.map((p) => {
              const isSelected = !!selected[p.path];

              return (
                <div
                  key={p.path}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border bg-slate-950/30 shadow-sm transition",
                    isSelected
                      ? "border-sky-300/30 ring-2 ring-sky-300/10"
                      : "border-white/10"
                  )}
                >
                  {/* Image */}
                  <div className="relative h-40 w-full bg-black/20">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={p.url}
                        alt={p.name}
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                        className="h-full w-full object-cover"
                      />

                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-80" />

                    {/* ✅ Bouton "Ajouter au HERO" (uniquement bucket photos) */}
                    {bucket === "photos" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleSelect(p.path);
                        }}
                        className={cn(
                          "absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold backdrop-blur transition",
                          isSelected
                            ? "border-sky-300/30 bg-sky-500/25 text-sky-100"
                            : "border-white/10 bg-slate-950/60 text-slate-100 hover:bg-white/10"
                        )}
                        title={isSelected ? "Retirer de la sélection" : "Ajouter à la sélection HERO"}
                      >
                        <span
                          className={cn(
                            "inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px]",
                            isSelected
                              ? "border-sky-300/30 bg-sky-500/20"
                              : "border-white/10 bg-white/5"
                          )}
                        >
                          {isSelected ? "✓" : "+"}
                        </span>
                        <span>{isSelected ? "Ajoutée" : "Ajouter au HERO"}</span>
                      </button>
                    )}

                    {/* Bouton supprimer */}
                    <button
                      onClick={() => {
                        const ok = confirm(
                          `Supprimer définitivement cette photo ?\n\nBucket: ${bucket}\nPath: ${p.path}`
                        );
                        if (ok) remove(p.path);
                      }}
                      disabled={deleting === p.path}
                      title="Supprimer"
                      className={cn(
                        "absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border",
                        "border-white/10 bg-slate-950/60 text-slate-100 backdrop-blur",
                        "opacity-0 transition group-hover:opacity-100",
                        "hover:border-rose-300/30 hover:bg-rose-500/15 hover:text-rose-100",
                        "disabled:opacity-60"
                      )}
                    >
                      {deleting === p.path ? (
                        <span className="text-xs">…</span>
                      ) : (
                        <span className="text-lg leading-none">🗑️</span>
                      )}
                    </button>
                  </div>

                  {/* Infos */}
                  <div className="space-y-1 p-3">
                    <div className="text-[11px] font-semibold text-slate-100 line-clamp-1">
                      {p.name}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-200">
                        {bucket}
                      </span>
                      {p.folder ? (
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-200">
                          {p.folder}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
                    </div>

                    <div className="text-[10px] text-slate-400 line-clamp-1">
                      {p.path}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* ✅ Pagination */}
          {!loading && (
            <div className="mt-8 flex flex-col items-center gap-3">
              {nextCursor ? (
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-semibold text-slate-100 hover:bg-white/10 disabled:opacity-50"
                >
                  {loadingMore ? "Chargement…" : "Charger plus"}
                </button>
              ) : (
                <div className="text-[11px] text-slate-400">
                  Fin de liste (tout est chargé pour ce scope).
                </div>
              )}
            </div>
          )}



        <div className="mt-10 text-[11px] text-slate-400">
          Astuce : pour voir le dossier hero, mets{" "}
          <span className="text-slate-200 font-semibold">hero</span> dans Prefix.
        </div>
      </div>
    </div>
  );
}
