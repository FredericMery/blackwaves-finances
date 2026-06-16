"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Submission = {
  id: string;
  url: string;
  title?: string | null;
  season?: string | null;
  team?: string | null;
  photo_type?: string | null;
  description?: string | null;
  status: "pending" | "approved" | "rejected" | string;
  review_comment?: string | null;
  created_at: string;
};

function clsx(...v: Array<string | false | undefined | null>) {
  return v.filter(Boolean).join(" ");
}

export default function DepotPhotoParentPage() {
  // ⚠️ Pour V1 simple: on demande l’email parent (et on pourra brancher l’email auth auto ensuite)
  const [parentEmail, setParentEmail] = useState("");
  const [parentName, setParentName] = useState("");

  const [season, setSeason] = useState("2024-2025");
  const [team, setTeam] = useState("Toutes équipes");
  const [photoType, setPhotoType] = useState("Compétition");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [sending, setSending] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [mine, setMine] = useState<Submission[]>([]);
  const [loadingMine, setLoadingMine] = useState(false);

  const seasons = ["2024-2025", "2023-2024", "2022-2023", "2021-2022"];
  const teams = ["Juniors", "Cadets", "Minimes", "Poussins", "Toutes équipes"];
  const types = ["Compétition", "Entraînement", "Coulisses", "Divers / Autre"];

  const canSend = useMemo(() => {
    return parentEmail.trim() && files.length > 0 && files.length <= 4;
  }, [parentEmail, files.length]);

  const loadMine = async (email: string) => {
    if (!email) return;
    setLoadingMine(true);
    try {
      const r = await fetch(`/api/photos/mine?email=${encodeURIComponent(email)}`);
      const j = await r.json();
      if (j.ok) setMine(j.data);
    } finally {
      setLoadingMine(false);
    }
  };

  useEffect(() => {
    if (parentEmail.trim()) loadMine(parentEmail.trim().toLowerCase());
  }, [parentEmail]);

  const onPickFiles = (f: FileList | null) => {
    setErrMsg(null);
    setOkMsg(null);
    if (!f) return;

    const list = Array.from(f);
    const imgs = list.filter((x) => x.type.startsWith("image/"));
    const limited = imgs.slice(0, 4);

    setFiles(limited);
  };

  const removeFile = (idx: number) => {
    setFiles((s) => s.filter((_, i) => i !== idx));
  };

  const send = async () => {
    setErrMsg(null);
    setOkMsg(null);

    const email = parentEmail.trim().toLowerCase();
    if (!email) return setErrMsg("Email parent obligatoire.");
    if (files.length === 0) return setErrMsg("Ajoute au moins une photo.");
    if (files.length > 4) return setErrMsg("Maximum 4 photos.");

    setSending(true);
    try {
      const fd = new FormData();
      fd.append("parent_email", email);
      fd.append("parent_name", parentName.trim());

      fd.append("season", season);
      fd.append("team", team);
      fd.append("photo_type", photoType);
      fd.append("title", title.trim());
      fd.append("description", description.trim());

      files.forEach((file, i) => fd.append(`file_${i}`, file));

      const r = await fetch("/api/photos/submit", { method: "POST", body: fd });
      const j = await r.json();

      if (!j.ok) {
        setErrMsg(j.error || "Envoi impossible.");
        setSending(false);
        return;
      }

      setOkMsg("Merci ! Tes photos sont envoyées. Validation par le bureau en cours.");
      setFiles([]);
      if (inputRef.current) inputRef.current.value = "";
      await loadMine(email);
    } catch (e) {
      setErrMsg("Erreur réseau lors de l’envoi.");
    } finally {
      setSending(false);
    }
  };

  const badge = (s: string) => {
    if (s === "approved")
      return "border-emerald-300/20 bg-emerald-500/10 text-emerald-200";
    if (s === "rejected") return "border-red-300/20 bg-red-500/10 text-red-200";
    return "border-amber-300/20 bg-amber-500/10 text-amber-200";
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

      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-cyan-400/5 to-indigo-400/10" />
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-300/80">
              Concours photo — BlackWaves
            </p>
            <h1 className="mt-2 text-3xl md:text-4xl font-extrabold">
              Déposer une photo{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 bg-clip-text text-transparent">
                (4 max)
              </span>
            </h1>
            <p className="mt-3 text-slate-200/80">
              Tes photos apparaissent dans ton espace avec le statut <b>“En validation”</b>.
              Le bureau valide ensuite : elles sont publiées automatiquement dans la galerie,
              et elles participent au concours <b>Photographe de l’année</b>.
            </p>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-200/80">Email parent</label>
                <input
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm outline-none"
                  placeholder="parent@email.com"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-200/80">Nom parent (optionnel)</label>
                <input
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm outline-none"
                  placeholder="Sophie Martin"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Form */}
        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-7">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-200/80">Saison</label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm outline-none"
              >
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
                {teams.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-200/80">Type</label>
              <select
                value={photoType}
                onChange={(e) => setPhotoType(e.target.value)}
                className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm outline-none"
              >
                {types.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-200/80">Titre (optionnel)</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm outline-none"
                placeholder="Finale régionale — moment incroyable"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-200/80">Description (optionnel)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full min-h-[90px] rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm outline-none"
                placeholder="Contexte, lieu, compétition, anecdote…"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-200/80">Photos (max 4)</label>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => onPickFiles(e.target.files)}
                className="mt-1 w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm outline-none"
              />

              {files.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {files.map((f, idx) => (
                    <div key={idx} className="rounded-2xl border border-white/10 bg-black/20 p-2">
                      <div className="text-xs text-slate-200/80 truncate">{f.name}</div>
                      <div className="mt-2 text-[11px] text-slate-400">
                        {(f.size / (1024 * 1024)).toFixed(2)} Mo
                      </div>
                      <button
                        onClick={() => removeFile(idx)}
                        className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 py-1.5 text-xs hover:bg-white/10 transition"
                      >
                        Retirer
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {errMsg && (
            <div className="mt-5 rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {errMsg}
            </div>
          )}
          {okMsg && (
            <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {okMsg}
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
            <button
              disabled={!canSend || sending}
              onClick={send}
              className={clsx(
                "rounded-xl px-5 py-2.5 text-sm font-semibold transition",
                (!canSend || sending)
                  ? "bg-white/10 text-slate-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 shadow-lg shadow-blue-600/20"
              )}
            >
              {sending ? "Envoi en cours…" : "Envoyer pour validation"}
            </button>
          </div>
        </section>

        {/* Mine */}
        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-7">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold">Mes photos</h2>
              <p className="text-sm text-slate-200/70">
                Suivi de validation (bureau).
              </p>
            </div>
            <button
              onClick={() => loadMine(parentEmail.trim().toLowerCase())}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10 transition"
            >
              Rafraîchir
            </button>
          </div>

          {loadingMine && (
            <div className="mt-5 text-sm text-slate-300/70">Chargement…</div>
          )}

          {!loadingMine && mine.length === 0 && (
            <div className="mt-5 text-sm text-slate-300/70">
              Aucune photo déposée pour l’instant.
            </div>
          )}

          {!loadingMine && mine.length > 0 && (
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mine.map((p) => (
                <div key={p.id} className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img src={p.url} className="w-full h-full object-cover" />
                    <div className={clsx(
                      "absolute top-3 left-3 rounded-full border px-3 py-1 text-xs font-semibold",
                      badge(p.status)
                    )}>
                      {p.status === "approved" ? "Validée" : p.status === "rejected" ? "Refusée" : "En validation"}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="font-semibold text-sm">{p.title || "Sans titre"}</div>
                    <div className="mt-2 text-xs text-slate-300/80">
                      {p.season || "—"} · {p.team || "—"} · {p.photo_type || "—"}
                    </div>
                    {p.status === "rejected" && p.review_comment && (
                      <div className="mt-3 text-xs text-red-200/90 border border-red-300/20 bg-red-500/10 rounded-xl p-3">
                        {p.review_comment}
                      </div>
                    )}
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
