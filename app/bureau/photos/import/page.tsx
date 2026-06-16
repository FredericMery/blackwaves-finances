"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

/**
 * ============================
 * CONFIG
 * ============================
 */
const TABLE_PHOTOS = "photos";

// ✅ Bucket où tu stockes les images de la galerie
// 👉 si chez toi le bucket a un autre nom (ex: "photos" / "galerie"), change ici
const BUCKET_GALLERY = "photos";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type UploadStatus = "idle" | "uploading" | "done" | "error";

type UploadItem = {
  file: File;
  previewUrl: string;
  status: UploadStatus;
  progress: number; // 0..100
  error?: string | null;
  insertedId?: string | null;
};

function clsx(...v: Array<string | false | undefined | null>) {
  return v.filter(Boolean).join(" ");
}

function slugify(s: string) {
  return (s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-+/g, "-")
    .replace(/^\-+|\-+$/g, "");
}

function nowStamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(
    d.getHours()
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function extFromName(name: string) {
  const m = name.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/);
  if (!m) return "";
  return m[1] === "jpeg" ? "jpg" : m[1];
}

const MAX_MB = 12; // un peu plus large pour du bureau
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export default function BureauPhotosImportPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [season, setSeason] = useState("2025-2026");
  const [photoType, setPhotoType] = useState("Compétition");
  const [team, setTeam] = useState("Toutes équipes");

  const [titleMode, setTitleMode] = useState<"filename" | "prefix">("filename");
  const [titlePrefix, setTitlePrefix] = useState("");

  const [items, setItems] = useState<UploadItem[]>([]);
  const itemsRef = useRef<UploadItem[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const [busy, setBusy] = useState(false);

  const [globalOk, setGlobalOk] = useState<string | null>(null);
  const [globalErr, setGlobalErr] = useState<string | null>(null);

  const seasons = ["2025-2026", "2024-2025", "2023-2024", "2022-2023", "2021-2022"];
  const types = ["Entraînement", "Compétition", "Coulisses", "Divers / Autre"];
  const teams = ["Juniors", "Cadets", "Minimes", "Poussins", "Toutes équipes"];

  // cleanup previews
  useEffect(() => {
    return () => {
      itemsRef.current.forEach((it) => {
        try {
          URL.revokeObjectURL(it.previewUrl);
        } catch {}
      });
    };
  }, []);

  const totalCount = items.length;
  const doneCount = useMemo(
    () => items.filter((i) => i.status === "done").length,
    [items]
  );
  const errorCount = useMemo(
    () => items.filter((i) => i.status === "error").length,
    [items]
  );

  const pickFiles = (fl: FileList | null) => {
    setGlobalOk(null);
    setGlobalErr(null);

    if (!fl || fl.length === 0) return;

    const incoming = Array.from(fl);

    // validations
    for (const f of incoming) {
      if (!ALLOWED.includes(f.type)) {
        setGlobalErr("Format non supporté. Utilise JPG, PNG ou WEBP.");
        return;
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        setGlobalErr(`Une photo dépasse ${MAX_MB} Mo.`);
        return;
      }
    }

    const next: UploadItem[] = incoming.map((f) => ({
      file: f,
      previewUrl: URL.createObjectURL(f),
      status: "idle",
      progress: 0,
      error: null,
      insertedId: null,
    }));

    setItems((prev) => [...prev, ...next]);

    if (inputRef.current) inputRef.current.value = "";
  };

  const removeAt = (idx: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const it = copy[idx];
      if (it?.previewUrl) {
        try {
          URL.revokeObjectURL(it.previewUrl);
        } catch {}
      }
      copy.splice(idx, 1);
      return copy;
    });
  };

  const clearAll = () => {
    itemsRef.current.forEach((it) => {
      try {
        URL.revokeObjectURL(it.previewUrl);
      } catch {}
    });
    setItems([]);
    setGlobalOk(null);
    setGlobalErr(null);
  };

  const guessTitle = (fileName: string, idx: number) => {
    const base = fileName.replace(/\.[^.]+$/, "");
    if (titleMode === "filename") return base;
    const p = titlePrefix.trim();
    if (!p) return base;
    // prefix + index (si plusieurs)
    return `${p}${itemsRef.current.length > 1 ? ` #${idx + 1}` : ""}`;
  };

  const uploadOne = async (idx: number) => {
    const it = itemsRef.current[idx];
    if (!it) return { ok: false, error: "Item introuvable (liste modifiée)." };

    setItems((prev) =>
      prev.map((x, i) =>
        i === idx ? { ...x, status: "uploading", progress: 5, error: null } : x
      )
    );

    try {
      const file = it.file;

      const ext =
        extFromName(file.name) ||
        (file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
          ? "webp"
          : "jpg");

      const safeName = slugify(file.name.replace(/\.[^.]+$/, "")) || "photo";
      const path = `site/${season}/${nowStamp()}_${safeName}.${ext}`;


      // 1) upload storage
      const up = await supabase.storage.from(BUCKET_GALLERY).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

      if (up.error) throw new Error(`Upload storage: ${up.error.message}`);

      setItems((prev) =>
        prev.map((x, i) => (i === idx ? { ...x, progress: 55 } : x))
      );

      // 2) public url
      const pub = supabase.storage.from(BUCKET_GALLERY).getPublicUrl(path);
      const url = pub?.data?.publicUrl;
      if (!url) throw new Error("Impossible de récupérer l'URL publique.");

      // 3) insert DB (direct approved)
      const title = guessTitle(file.name, idx);

      const ins = await supabase
        .from(TABLE_PHOTOS)
        .insert([
          {
            url,
            title: title || null,
            season: season || null,
            type: photoType || null,
            team: team || null,
            status: "approved", // ✅ toi seul → direct galerie
          },
        ])
        .select("id")
        .single();

      if (ins.error) throw new Error(`Insert DB: ${ins.error.message}`);

      setItems((prev) =>
        prev.map((x, i) =>
          i === idx
            ? {
                ...x,
                status: "done",
                progress: 100,
                insertedId: ins.data?.id || null,
              }
            : x
        )
      );

      return { ok: true as const };
    } catch (e: any) {
      const msg = e?.message || "Erreur inconnue";
      setItems((prev) =>
        prev.map((x, i) =>
          i === idx ? { ...x, status: "error", progress: 0, error: msg } : x
        )
      );
      return { ok: false as const, error: msg };
    }
  };

  const startUploadAll = async () => {
    setGlobalOk(null);
    setGlobalErr(null);

    if (itemsRef.current.length === 0) {
      setGlobalErr("Ajoute au moins une photo.");
      return;
    }

    setBusy(true);

    let ok = 0;
    let ko = 0;

    // ✅ snapshot d'indices au démarrage (évite les décalages)
    const indices = Array.from({ length: itemsRef.current.length }, (_, i) => i);

    // upload séquentiel (plus safe, moins violent)
    for (const i of indices) {
      const current = itemsRef.current[i];
      if (!current) continue;

      // skip already done
      if (current.status === "done") continue;

      const r = await uploadOne(i);
      if (r?.ok) ok++;
      else ko++;
    }

    setBusy(false);

    if (ok > 0 && ko === 0) {
      setGlobalOk(
        `✅ Import terminé : ${ok} photo${ok > 1 ? "s" : ""} ajoutée${
          ok > 1 ? "s" : ""
        } à la galerie.`
      );
    } else if (ok > 0 && ko > 0) {
      setGlobalErr(`⚠️ Import partiel : ${ok} OK / ${ko} en erreur. (Voir la liste)`);
    } else {
      setGlobalErr("❌ Aucune photo importée. Vérifie les erreurs ci-dessous.");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10">
        {/* Header */}
        <header className="mb-8 border-b border-white/5 pb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">
                Bureau · Galerie
              </div>
              <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">
                Import photos en masse
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Sélectionne un lot de photos → upload dans le bucket → insertion directe dans la table{" "}
                <span className="font-semibold text-slate-100">{TABLE_PHOTOS}</span> en{" "}
                <span className="font-semibold text-emerald-200">approved</span> (usage bureau).
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Bucket : <span className="font-semibold text-slate-200">{BUCKET_GALLERY}</span> ·
                Chemin : <span className="font-semibold text-slate-200">{`{saison}/{timestamp}_nom.ext`}</span>
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <Link
                href="/galerie"
                className="inline-flex items-center gap-2 rounded-full border border-sky-400/70 bg-sky-500/20 px-4 py-2 text-xs font-semibold text-sky-100 shadow-lg shadow-sky-900/40 backdrop-blur hover:border-sky-300 hover:bg-sky-500/30"
              >
                Voir la galerie ↗
              </Link>
              <Link
                href="/bureau"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-100 backdrop-blur hover:bg-white/10"
              >
                Retour bureau
              </Link>
            </div>
          </div>
        </header>

        {/* Config */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-slate-200/80">Saison</label>
              <select
                className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm outline-none"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
              >
                {seasons.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-200/80">Type</label>
              <select
                className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm outline-none"
                value={photoType}
                onChange={(e) => setPhotoType(e.target.value)}
              >
                {types.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-200/80">Équipe</label>
              <select
                className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm outline-none"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
              >
                {teams.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-200/80">Titres</label>
              <div className="mt-2 flex flex-col gap-2 rounded-xl border border-white/10 bg-black/20 p-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={titleMode === "filename"}
                    onChange={() => setTitleMode("filename")}
                  />
                  <span>Utiliser le nom de fichier (recommandé)</span>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={titleMode === "prefix"}
                    onChange={() => setTitleMode("prefix")}
                  />
                  <span>Préfixe commun</span>
                </label>

                {titleMode === "prefix" && (
                  <input
                    value={titlePrefix}
                    onChange={(e) => setTitlePrefix(e.target.value)}
                    className="mt-1 w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm outline-none"
                    placeholder='Ex : "FFFA 2026 — Samedi"'
                  />
                )}

                <div className="text-[11px] text-slate-400">
                  Métadonnées insérées :{" "}
                  <span className="text-slate-200">season / type / team / title / status=approved</span>.
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs font-semibold text-slate-200/80">Résumé</div>
              <div className="mt-2 text-sm">
                <div>
                  Total : <span className="font-semibold text-slate-100">{totalCount}</span>
                </div>
                <div className="mt-1">
                  OK : <span className="font-semibold text-emerald-200">{doneCount}</span>
                </div>
                <div className="mt-1">
                  Erreurs : <span className="font-semibold text-rose-200">{errorCount}</span>
                </div>
              </div>
              <div className="mt-3 text-[11px] text-slate-400">
                Max {MAX_MB} Mo · Formats : JPG / PNG / WEBP.
              </div>
            </div>
          </div>
        </section>

        {/* Picker */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Ajouter des photos</div>
              <div className="text-[11px] text-slate-400">
                Tu peux sélectionner un gros lot (multi-sélection). Import séquentiel pour être stable.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => inputRef.current?.click()}
                className="rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 px-4 py-2 text-sm font-semibold shadow-lg shadow-indigo-900/30 hover:brightness-110 transition"
              >
                + Choisir des fichiers
              </button>

              <button
                onClick={startUploadAll}
                disabled={busy || items.length === 0}
                className={clsx(
                  "rounded-xl px-4 py-2 text-sm font-semibold transition",
                  busy || items.length === 0
                    ? "bg-white/10 text-slate-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 shadow-lg shadow-blue-900/30"
                )}
              >
                {busy ? "Import en cours…" : "Importer tout"}
              </button>

              <button
                onClick={clearAll}
                disabled={busy || items.length === 0}
                className={clsx(
                  "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition",
                  busy || items.length === 0 ? "opacity-50 cursor-not-allowed" : ""
                )}
              >
                Vider la liste
              </button>
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => pickFiles(e.target.files)}
          />

          {(globalErr || globalOk) && (
            <div
              className={clsx(
                "mt-4 rounded-xl border px-4 py-3 text-sm",
                globalErr
                  ? "border-rose-400/20 bg-rose-500/10 text-rose-100"
                  : "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
              )}
            >
              {globalErr || globalOk}
            </div>
          )}
        </section>

        {/* List */}
        <section className="mt-6">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
              <div className="text-sm font-semibold text-slate-100">Aucune photo sélectionnée</div>
              <div className="mt-2 text-[11px] text-slate-400">
                Clique sur “Choisir des fichiers”, puis “Importer tout”.
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((it, idx) => (
                <div
                  key={`${it.file.name}-${idx}-${it.file.size}`}
                  className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden"
                >
                  <div className="flex gap-4 p-4">
                    <div className="h-20 w-20 flex-none overflow-hidden rounded-xl border border-white/10 bg-black/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={it.previewUrl} alt={it.file.name} className="h-full w-full object-cover" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-100">
                            {it.file.name}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-400">
                            {season} · {photoType} · {team}
                          </div>
                        </div>

                        <button
                          onClick={() => removeAt(idx)}
                          disabled={busy}
                          className={clsx(
                            "rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-slate-200 hover:bg-black/30 transition",
                            busy ? "opacity-50 cursor-not-allowed" : ""
                          )}
                        >
                          Retirer
                        </button>
                      </div>

                      <div className="mt-3">
                        <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                          <div
                            className={clsx(
                              "h-full rounded-full transition-all",
                              it.status === "done"
                                ? "bg-emerald-400/80"
                                : it.status === "error"
                                ? "bg-rose-400/80"
                                : "bg-sky-400/80"
                            )}
                            style={{ width: `${Math.max(3, it.progress)}%` }}
                          />
                        </div>

                        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                          <span>
                            {it.status === "idle" && "Prêt"}
                            {it.status === "uploading" && "Upload / insertion…"}
                            {it.status === "done" && "✅ Ajoutée à la galerie"}
                            {it.status === "error" && "❌ Erreur"}
                          </span>

                          {it.status === "error" && it.error && (
                            <span className="text-rose-200 truncate max-w-[60%]" title={it.error}>
                              {it.error}
                            </span>
                          )}
                        </div>
                      </div>

                      {it.status !== "done" && it.status !== "uploading" && (
                        <div className="mt-3">
                          <button
                            onClick={() => uploadOne(idx)}
                            disabled={busy}
                            className={clsx(
                              "rounded-xl bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-slate-100 hover:bg-white/15 transition",
                              busy ? "opacity-50 cursor-not-allowed" : ""
                            )}
                          >
                            Importer celle-ci
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-white/10 bg-black/20 px-4 py-3 text-[11px] text-slate-300">
                    Titre inséré :{" "}
                    <span className="font-semibold text-slate-100">
                      {guessTitle(it.file.name, idx) || "Sans titre"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
