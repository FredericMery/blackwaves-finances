'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

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
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
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

      router.replace('/bureau/dashboard');
      router.refresh();
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.24),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.18),_transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_48%,#020617_100%)] px-4 py-12 text-slate-50 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.04)_0%,transparent_22%,transparent_78%,rgba(255,255,255,0.03)_100%)]" />
      <div className="relative mx-auto grid min-h-[calc(100vh-6rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.34em] text-cyan-100">
            Espace budget
          </div>

          <div className="max-w-2xl space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Connexion bureau, pensée pour le pilotage financier.
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Accède au tableau de bord budget, au prévisionnel et au suivi des
              lignes comptables dans une interface claire, sobre et orientée action.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              'Synthèse budgétaire en premier',
              'Suivi des recettes et dépenses',
              'Navigation directe vers les pages budget',
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200 shadow-[0_12px_40px_rgba(2,6,23,0.35)] backdrop-blur"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-slate-950/75 p-5 shadow-[0_30px_100px_rgba(2,6,23,0.55)] backdrop-blur-xl sm:p-8">
          <div className="mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-cyan-300/80">
              Connexion sécurisée
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Ouvrir le module de gestion
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Les identifiants sont vérifiés côté API et ouvrent ensuite l’accès au
              bureau via le cookie attendu par le proxy.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-200">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-50 placeholder:text-slate-500 outline-none transition focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/20"
                placeholder="vous@example.com"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-slate-200">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-50 placeholder:text-slate-500 outline-none transition focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/20"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:from-cyan-400 hover:to-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Ouverture du bureau…' : 'Se connecter'}
            </button>

            <p className="text-xs leading-5 text-slate-400">
              Une fois connecté, tu arrives directement sur le tableau de bord budget.
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
