"use client";

import { useEffect, useMemo, useState } from "react";

type Submission = {
  id: string;
  created_at: string;

  parent_email: string;
  parent_name?: string | null;

  season?: string | null;
  team?: string | null;
  photo_type?: string | null;

  title?: string | null;
  description?: string | null;

  url: string;

  status: "pending" | "approved" | "rejected" | string;
  review_comment?: string | null;

  gallery_photo_id?: string | null;
};

function clsx(...v: Array<string | false | undefined | null>) {
  return v.filter(Boolean).join(" ");
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function BureauModerationPhotosPage() {
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [q, setQ] = useState("");
  const [season, setSeason] = useState("Toutes");
  const [team, setTeam] = useState("Toutes");
  const [type, setType] = useState("Tous");

  const [open, setOpen] = useState<Submission | null>(null);

  const [actionBusy, setActionBusy] = useState(false);
  const [comment, setComment] = useState("");

  // options UI (tu peux enrichir sans impacter le fonctionnement)
  const seasons = ["2024-2025", "2023-2024", "2022-2023", "2021-2022"];
  const teams = ["Juniors", "Cadets", "Minimes", "Poussins", "Toutes équipes"];
  const types = ["Compétition", "Entraînement", "Coulisses", "Divers / Autre"];

  const load = async (soft = false) => {
    if (!soft) setLoading(true);
    else setRefreshing(true);

    try {
      const params = new URLSearchParams();
      params.set("status", "pending");
      if (season !== "Toutes") params.set("season", season);
      if (team !== "Toutes") params.set("team", team);
      if (type !== "Tous") params.set("type", type);

      const r = await fetch(`/api/bureau/photos/pending?${params.toString()}`);
      const j = await r.json();

      if (j?.ok) setItems(j.data || []);
      else setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // re-filtrage local (search)
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;

    return items.filter((p) => {
      const hay =
        `${p.title || ""} ${p.description || ""} ${p.parent_email || ""} ${p.parent_name || ""} ${p.season || ""} ${p.team || ""} ${p.photo_type || ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [items, q]);

  const approve = async () => {
    if (!open) return;

    setActionBusy(true);
    try {
      const r = await fetch("/api/bureau/photos/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: open.id,
          comment: comment.trim() || null,
        }),
      });
      const j = await r.json();
      if (!j.ok) {
        alert(j.error || "Erreur validation");
        setActionBusy(false);
        return;
      }

      // enlève l’item validé de la liste pending (sans toucher au reste)
      setItems((prev) => prev.filter((x) => x.id !== open.id));
      setOpen(null);
      setComment("");
    } finally {
      setActionBusy(false);
    }
  };

  const reject = async () => {
    if (!open) return;
    if (!comment.trim()) {
      alert("Ajoute un petit commentaire de refus (utile pour le parent).");
      return;
    }

    setActionBusy(true);
    try {
      const r = await fetch("/api/bureau/photos/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submission_id: open.id,
          comment: comment.trim(),
        }),
      });
      const j = await r.json();
      if (!j.ok) {
        alert(j.error || "Erreur refus");
        setActionBusy(false);
        return;
      }

      setItems((prev) => prev.filter((x) => x.id !== open.id));
      setOpen(null);
      setComment("");
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Background FX */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[920px] -translate-x-1/2 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="absolute top-40 right-0 h-[420px] w-[520px] rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[420px] w-[520px] rounded-full bg-indigo-400/10 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,rgba(148,163,184,0.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.25)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Header */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-cyan-400/5 to-indigo-400/10" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-300/80">
                Bureau — Galerie
              </p>
              <h1 className="mt-2 text-3xl md:text-4xl font-extrabold">
                Modération{" "}
                <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 bg-clip-text text-transparent">
                  photos
                </span>
              </h1>
              <p className="mt-3 text-slate-200/80 max-w-2xl">
                Valide ou refuse les photos déposées par les parents.
                Une validation publie automatiquement la photo dans la table <b>photos</b> (galerie),
                et notifie le parent par e-mail.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => load(true)}
                className={clsx(
                  "rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition",
                  refreshing && "opacity-60 cursor-not-allowed"
                )}
                disabled={refreshing}
              >
                {refreshing ? "Rafraîchit…" : "Rafraîchir"}
              </button>
              <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm">
                <span className="font-semibold">{filtered.length}</span> en attente
              </div>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-200/80">Recherche</label>
              <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <span className="text-slate-400 text-sm">⌕</span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Parent, titre, description, équipe…"
                  className="w-full bg-transparent outline-none text-sm placeholder:text-slate-500"
                />
                {q.trim() && (
                  <button
                    onClick={() => setQ("")}
                    className="text-xs text-slate-300 hover:text-white"
                  >
                    Effacer
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-200/80">Saison</label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm outline-none"
              >
                <option value="Toutes">Toutes</option>
                {seasons.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-200/80">Équipe</label>
              <select
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm outline-none"
              >
                <option value="Toutes">Toutes</option>
                {teams.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-200/80">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm outline-none"
              >
                <option value="Tous">Tous</option>
                {types.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => load(true)}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold hover:brightness-110 transition shadow-lg shadow-blue-600/20"
              >
                Appliquer / Rafraîchir
              </button>
            </div>
          </div>
        </section>

        {/* List */}
        <section className="mt-8">
          {loading && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-slate-300/80">
              Chargement des photos en attente…
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
              <p className="font-semibold">Aucune photo en attente.</p>
              <p className="mt-2 text-sm text-slate-300/80">
                Tout est validé (ou rien n’a été soumis).
              </p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setOpen(p);
                    setComment("");
                  }}
                  className="text-left rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition overflow-hidden"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img src={p.url} alt={p.title || "Photo"} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="text-sm font-semibold truncate">
                        {p.title || "Sans titre"}
                      </div>
                      <div className="text-xs text-slate-200/80 mt-1">
                        {p.season || "—"} · {p.team || "—"} · {p.photo_type || "—"}
                      </div>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="text-xs text-slate-300/80">
                      Parent : <span className="text-slate-100">{p.parent_email}</span>
                    </div>
                    <div className="text-xs text-slate-300/80 mt-1">
                      Déposée : <span className="text-slate-100">{fmtDate(p.created_at)}</span>
                    </div>

                    {p.description && (
                      <div className="mt-3 text-xs text-slate-200/80 line-clamp-3">
                        {p.description}
                      </div>
                    )}

                    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
                      En attente
                      <span className="text-amber-200/70">→ ouvrir</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md"
          onClick={() => setOpen(null)}
        >
          <div className="absolute inset-0 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-full max-w-5xl rounded-3xl border border-white/10 bg-slate-950/80 overflow-hidden shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
              <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-white/10">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-300/80">
                    Photo en attente
                  </div>
                  <div className="mt-1 text-2xl font-extrabold truncate">
                    {open.title || "Sans titre"}
                  </div>
                  <div className="mt-2 text-sm text-slate-200/80">
                    {open.season || "—"} · {open.team || "—"} · {open.photo_type || "—"} · Déposée {fmtDate(open.created_at)}
                  </div>
                  <div className="mt-1 text-sm text-slate-200/80">
                    Parent : <b>{open.parent_email}</b>
                  </div>
                </div>

                <button
                  onClick={() => setOpen(null)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
                >
                  Fermer
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                <div className="p-6">
                  <img
                    src={open.url}
                    alt={open.title || "Photo"}
                    className="w-full max-h-[70vh] object-contain rounded-2xl border border-white/10 bg-black/20"
                  />
                </div>

                <div className="p-6 border-t lg:border-t-0 lg:border-l border-white/10">
                  <div className="text-sm font-semibold">Description</div>
                  <div className="mt-2 text-sm text-slate-200/80 whitespace-pre-wrap">
                    {open.description || "—"}
                  </div>

                  <div className="mt-6">
                    <label className="text-xs font-semibold text-slate-200/80">
                      Commentaire (optionnel pour validation, obligatoire pour refus)
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="mt-2 w-full min-h-[110px] rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm outline-none"
                      placeholder="Ex : Merci ! Photo validée et publiée. / Ou : Photo refusée (visages non autorisés, floue, etc.)"
                    />
                  </div>

                  <div className="mt-6 flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={reject}
                      disabled={actionBusy}
                      className={clsx(
                        "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold border transition",
                        actionBusy
                          ? "border-white/10 bg-white/5 text-slate-500 cursor-not-allowed"
                          : "border-red-300/20 bg-red-500/10 text-red-200 hover:bg-red-500/15"
                      )}
                    >
                      Refuser
                    </button>

                    <button
                      onClick={approve}
                      disabled={actionBusy}
                      className={clsx(
                        "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                        actionBusy
                          ? "bg-white/10 text-slate-500 cursor-not-allowed"
                          : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 shadow-lg shadow-blue-600/20"
                      )}
                    >
                      Valider & publier
                    </button>
                  </div>

                  <div className="mt-4 text-xs text-slate-300/70">
                    La validation insère la photo dans la table <b>photos</b> (galerie),
                    et marque la soumission en <b>approved</b>.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
