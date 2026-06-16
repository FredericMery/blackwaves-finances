"use client";

import { useEffect, useMemo, useState } from "react";

type Status = "idle" | "sending" | "sent" | "error";

export default function ContactPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [ts, setTs] = useState<string>("");

  useEffect(() => {
    setTs(Date.now().toString());
  }, []);

  const sentFromQuery = useMemo(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("sent") === "1";
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setStatus("error");
        setErrorMsg(data?.error || "Erreur lors de l’envoi du message.");
        return;
      }

      setStatus("sent");
      form.reset();

      // Redirection sur le domaine courant (donc blackwaves-cheer.com)
      window.location.assign("/contact?sent=1");
    } catch {
      setStatus("error");
      setErrorMsg("Erreur réseau. Réessaie dans quelques instants.");
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-2">
          {/* Bloc infos */}
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Contact</h1>
            <p className="mt-3 text-slate-600">
              Une question sur les inscriptions, les essais, le planning ou les
              compétitions ? Écris-nous et on te répond rapidement.
            </p>

            <div className="mt-8 space-y-4 rounded-2xl border border-slate-200 p-6">
              <div>
                <p className="text-sm font-medium text-slate-900">Email</p>
                <p className="text-sm text-slate-600">
                  contact@blackwaves-cheer.com
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-900">Téléphone</p>
                <p className="text-sm text-slate-600">À compléter</p>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-900">
                  Localisation
                </p>
                <p className="text-sm text-slate-600">Marseille</p>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="aspect-[16/10] w-full bg-slate-100 flex items-center justify-center text-slate-500 text-sm">
                Carte (optionnel) – ajoute un embed Google Maps si tu veux
              </div>
            </div>
          </div>

          {/* Formulaire */}
          <div className="rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Nous écrire</h2>
            <p className="mt-1 text-sm text-slate-600">
              Remplis ce formulaire, on revient vers toi.
            </p>

            {sentFromQuery && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Message envoyé. Merci, on revient vers toi rapidement.
              </div>
            )}

            {status === "error" && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {errorMsg || "Erreur lors de l’envoi."}
              </div>
            )}

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
              />
              <input type="hidden" name="ts" value={ts} />

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-900">
                    Nom
                  </label>
                  <input
                    name="nom"
                    required
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    placeholder="Dupont"
                    disabled={status === "sending"}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-900">
                    Prénom
                  </label>
                  <input
                    name="prenom"
                    required
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                    placeholder="Marie"
                    disabled={status === "sending"}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-900">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  placeholder="marie@email.com"
                  disabled={status === "sending"}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-900">
                  Sujet
                </label>
                <input
                  name="sujet"
                  required
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  placeholder="Demande d’essai / infos inscription / planning…"
                  disabled={status === "sending"}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-900">
                  Message
                </label>
                <textarea
                  name="message"
                  required
                  rows={6}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  placeholder="Écris ton message…"
                  disabled={status === "sending"}
                />
              </div>

              <button
                type="submit"
                disabled={status === "sending"}
                className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === "sending" ? "Envoi en cours..." : "Envoyer"}
              </button>

              <p className="text-xs text-slate-500">
                En envoyant ce message, tu acceptes que le club te recontacte.
              </p>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
