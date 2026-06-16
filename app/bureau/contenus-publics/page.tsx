"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Block = {
  id: string;
  page: string;
  key: string;
  title: string | null;
  content_md: string;
  ordre: number;
  is_active: boolean;
  updated_at: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const PAGES = [
  { page: "home", label: "Accueil" },
  { page: "club", label: "Le Club" },
  { page: "teams", label: "Les équipes" },
  { page: "contact", label: "Contact" },
];

export default function BureauPublicContentPage() {
  const [page, setPage] = useState<string>("home");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<string>("");

  const selected = useMemo(
    () => blocks.find((b) => b.id === selectedId) ?? null,
    [blocks, selectedId]
  );

  useEffect(() => {
    const load = async () => {
      setInfo("");
      setSelectedId(null);

      const { data, error } = await supabase
        .from("public_content_blocks")
        .select("id,page,key,title,content_md,ordre,is_active,updated_at")
        .eq("page", page)
        .order("ordre", { ascending: true });

      if (error) {
        console.error("Erreur load blocks", error);
        setBlocks([]);
        setInfo("Impossible de charger les contenus (droits ou réseau).");
        return;
      }

      setBlocks((data as Block[]) ?? []);
    };

    load();
  }, [page]);

  const updateLocal = (patch: Partial<Block>) => {
    if (!selected) return;
    setBlocks((prev) =>
      prev.map((b) => (b.id === selected.id ? { ...b, ...patch } as Block : b))
    );
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setInfo("");

    const { error } = await supabase
      .from("public_content_blocks")
      .update({
        title: selected.title,
        content_md: selected.content_md,
        ordre: selected.ordre,
        is_active: selected.is_active,
      })
      .eq("id", selected.id);

    setSaving(false);

    if (error) {
      console.error("Erreur save block", error);
      setInfo("❌ Sauvegarde refusée (vérifie que ton profil est role=bureau ou admin).");
      return;
    }
    setInfo("✅ Sauvegardé. Visible immédiatement sur le site public.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10">
        <header className="mb-8 border-b border-white/5 pb-6">
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-400">
            Espace bureau
          </div>
          <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">
            Édition des textes du site public
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-300">
            Modifie les contenus Accueil / Club / Équipes / Contact. Les changements sont visibles immédiatement.
          </p>
        </header>

        {/* Sélecteur page */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {PAGES.map((p) => (
            <button
              key={p.page}
              onClick={() => setPage(p.page)}
              className={[
                "rounded-full border px-4 py-2 text-xs font-semibold transition",
                page === p.page
                  ? "border-sky-300/40 bg-sky-500/15 text-sky-100"
                  : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10",
              ].join(" ")}
            >
              {p.label}
            </button>
          ))}
          {info && (
            <span className="ml-2 text-xs text-slate-300">{info}</span>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Liste blocs */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 text-sm font-semibold text-white">Blocs</div>
            <div className="space-y-2">
              {blocks.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedId(b.id)}
                  className={[
                    "w-full rounded-xl border p-3 text-left transition",
                    selectedId === b.id
                      ? "border-sky-300/30 bg-sky-500/10"
                      : "border-white/10 bg-slate-950/40 hover:bg-white/5",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-semibold text-slate-100">
                      {b.title || b.key}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {b.is_active ? "actif" : "inactif"} • ordre {b.ordre}
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-300">
                    key: <span className="text-slate-200">{b.key}</span>
                  </div>
                </button>
              ))}
              {blocks.length === 0 && (
                <div className="text-xs text-slate-300">
                  Aucun bloc trouvé pour cette page.
                </div>
              )}
            </div>
          </div>

          {/* Éditeur */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 text-sm font-semibold text-white">Éditeur</div>

            {!selected ? (
              <div className="text-xs text-slate-300">
                Sélectionne un bloc à gauche.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-[11px] text-slate-300">Titre</label>
                    <input
                      value={selected.title ?? ""}
                      onChange={(e) => updateLocal({ title: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/30"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-300">Ordre</label>
                      <input
                        type="number"
                        value={selected.ordre}
                        onChange={(e) => updateLocal({ ordre: Number(e.target.value) })}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-300/30"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <label className="inline-flex items-center gap-2 text-[11px] text-slate-200">
                        <input
                          type="checkbox"
                          checked={selected.is_active}
                          onChange={(e) => updateLocal({ is_active: e.target.checked })}
                        />
                        Actif
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-300">Contenu</label>
                  <textarea
                    value={selected.content_md}
                    onChange={(e) => updateLocal({ content_md: e.target.value })}
                    rows={10}
                    className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/60 p-3 text-sm text-white outline-none focus:border-sky-300/30"
                  />
                  <p className="mt-2 text-[11px] text-slate-400">
                    Astuce : tu peux mettre des retours à la ligne, ils seront affichés tels quels.
                  </p>
                </div>

                <button
                  onClick={save}
                  disabled={saving}
                  className="rounded-full bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow transition hover:bg-sky-700 disabled:opacity-60"
                >
                  {saving ? "Sauvegarde..." : "Enregistrer"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
