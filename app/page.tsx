"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message || "Identifiants incorrects.");
        return;
      }

      const accessToken = data.session?.access_token;

      if (!accessToken) {
        setError("Session Supabase introuvable apres connexion.");
        return;
      }

      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        setError(result?.message || "Erreur lors de la connexion");
        return;
      }

      if (result.role !== "bureau") {
        setError("Cette connexion ouvre uniquement l'espace bureau.");
        return;
      }

      router.replace("/bureau");
      router.refresh();
    } catch {
      setError("Une erreur est survenue. Veuillez reessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="finance-app flex min-h-screen w-full flex-col items-center justify-center bg-slate-50 px-6 text-slate-950">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-[0_18px_50px_rgba(148,163,184,0.14)] sm:p-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-cyan-800">Espace bureau</p>
        <h1 className="text-2xl font-semibold text-slate-950">BlackWaves Finances</h1>
        <p className="mt-2 text-sm text-slate-600">Connectez-vous pour suivre le budget et les factures du club.</p>

        <form onSubmit={handleLogin} className="mt-5 space-y-4">
          {error && (
            <div role="alert" className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 placeholder:text-slate-400 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-200"
              placeholder="vous@example.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-950 placeholder:text-slate-400 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-200"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Ouverture du bureau..." : "Se connecter"}
          </button>
        </form>
      </section>
    </main>
  );
}
