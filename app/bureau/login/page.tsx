'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message || 'Identifiants incorrects.');
        return;
      }

      const accessToken = data.session?.access_token;

      if (!accessToken) {
        setError('Session Supabase introuvable après connexion.');
        return;
      }

      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        setError(result?.message || 'Erreur lors de la connexion');
        return;
      }

      if (result.role !== 'bureau') {
        setError('Cette connexion ouvre uniquement l’espace bureau.');
        return;
      }

      router.replace('/bureau');
      router.refresh();
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.10),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.10),_transparent_26%),linear-gradient(180deg,#fbfdff_0%,#f5f9fc_48%,#eef4f7_100%)] px-3 py-4 text-slate-950 sm:px-6 sm:py-8 lg:px-8 lg:py-12">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.72)_0%,transparent_26%,transparent_74%,rgba(224,242,254,0.34)_100%)]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl items-start gap-5 py-2 lg:min-h-[calc(100vh-6rem)] lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-8 lg:py-0">
        <section className="space-y-4 lg:space-y-6 lg:pr-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.34em] text-cyan-800 sm:px-4 sm:py-2 sm:text-[11px]">
            Espace budget
          </div>

          <div className="max-w-2xl space-y-3 sm:space-y-4">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 leading-[1.06] sm:text-4xl lg:text-5xl">
              Connexion bureau, pensée pour le pilotage financier.
            </h1>
            <p className="max-w-xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
              Accède au tableau de bord budget, au prévisionnel et au suivi des
              lignes comptables dans une interface claire, sobre et orientée action.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
            {[
              'Synthèse budgétaire en premier',
              'Suivi des recettes et dépenses',
              'Navigation directe vers les pages budget',
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-[0_12px_40px_rgba(148,163,184,0.16)] backdrop-blur sm:py-4"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white/92 p-4 shadow-[0_30px_90px_rgba(148,163,184,0.18)] backdrop-blur-xl sm:p-6 lg:p-8">
          <div className="mb-5 sm:mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-cyan-700/80 sm:text-[11px]">
              Connexion sécurisée
            </p>
            <h2 className="mt-2 text-[1.6rem] font-semibold leading-tight text-slate-950 sm:text-2xl">
              Ouvrir le module de gestion
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Les identifiants sont vérifiés côté API et ouvrent ensuite l’accès au
              bureau via le cookie attendu par le proxy.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
            {error && (
              <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:py-3.5"
            >
              {loading ? 'Ouverture du bureau…' : 'Se connecter'}
            </button>

            <p className="text-xs leading-5 text-slate-500">
              Une fois connecté, tu arrives directement sur le tableau de bord budget.
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
