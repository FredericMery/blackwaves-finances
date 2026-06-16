"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "sent" | "error";

export default function ParentLoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/parent/request-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      // Même si l'email n'est pas autorisé, l'API doit répondre ok:true
      // (anti-énumération). On garde donc un message générique.
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        const msg =
          json?.error ||
          "Impossible d’envoyer le lien de connexion. Merci de réessayer.";
        setError(msg);
        setStatus("error");
        return;
      }

      setStatus("sent");
    } catch (err: any) {
      setError(
        err?.message ||
          "Impossible d’envoyer le lien de connexion. Merci de réessayer."
      );
      setStatus("error");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-black/40">
        <h1 className="text-2xl font-bold text-white">Accès espace parent</h1>

        <p className="mt-2 text-sm text-slate-300">
          Saisissez votre adresse email.
          <br />
          Vous recevrez un lien sécurisé pour accéder à votre espace parent.
        </p>

        {status === "sent" ? (
          <div className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-50">
            ✅ Si votre adresse est reconnue, un lien de connexion vient de vous
            être envoyé par email.
            <br />
            <span className="text-emerald-200 text-xs">
              Pensez à vérifier vos spams si nécessaire.
            </span>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300">
                Adresse email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="parent@email.com"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-rose-500/40 bg-rose-900/30 px-3 py-2 text-xs text-rose-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading"
                ? "Envoi du lien…"
                : "Recevoir mon lien de connexion"}
            </button>

            <p className="text-xs text-slate-400">
              Pour des raisons de sécurité, nous ne confirmons pas si une adresse
              est enregistrée ou non.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
