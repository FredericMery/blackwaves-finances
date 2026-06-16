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
      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-xl items-center justify-center py-2 lg:min-h-[calc(100vh-6rem)] lg:py-0">
        <section className="w-full rounded-[28px] border border-slate-200 bg-white/92 p-4 shadow-[0_30px_90px_rgba(148,163,184,0.18)] backdrop-blur-xl sm:p-6 lg:p-8">
          <div className="mb-5 sm:mb-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-cyan-700/80 sm:text-[11px]">
              Connexion sécurisée
            </p>
            <h2 className="mt-2 text-[1.6rem] font-semibold leading-tight text-slate-950 sm:text-2xl">
              Module de connexion
            </h2>
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
