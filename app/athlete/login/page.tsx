"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type LoginState = "idle" | "loading";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AthleteLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<LoginState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function redirectIfAlreadyAthlete() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user || !mounted) return;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError || !profile || !mounted) return;

      const role = String(profile.role || "").toLowerCase();
      if (role !== "athlete") return;

      const maxAge = 60 * 60 * 4;
      document.cookie = `bw_adherent_auth=1; path=/; max-age=${maxAge}; SameSite=Lax`;
      document.cookie = `bw_role=athlete; path=/; max-age=${maxAge}; SameSite=Lax`;

      const from = new URLSearchParams(window.location.search).get("from");
      const target = from && from.startsWith("/athlete") ? from : "/athlete";
      router.replace(target);
    }

    redirectIfAlreadyAthlete();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setState("loading");

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !data.user) {
        setError("Identifiants incorrects. Vérifie ton e-mail et ton mot de passe.");
        setState("idle");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        setError("Profil introuvable. Contacte le bureau.");
        setState("idle");
        return;
      }

      const role = String(profile.role || "").toLowerCase();
      if (role !== "athlete") {
        await supabase.auth.signOut();
        setError("Ce compte n'est pas un compte athlète. Utilise l'espace correspondant à ton rôle.");
        setState("idle");
        return;
      }

      const maxAge = 60 * 60 * 4;
      document.cookie = `bw_adherent_auth=1; path=/; max-age=${maxAge}; SameSite=Lax`;
      document.cookie = `bw_role=athlete; path=/; max-age=${maxAge}; SameSite=Lax`;

      const from =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("from")
          : null;
      if (from && from.startsWith("/athlete")) {
        router.push(from);
      } else {
        router.push("/athlete");
      }
    } catch (err) {
      console.error(err);
      setError("Une erreur inattendue est survenue. Réessaie.");
    } finally {
      setState("idle");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-slate-950 to-slate-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-12">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-2">
          <section className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-8 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.26em] text-emerald-300">Black Waves</p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight">Connexion Espace Athlète</h1>
            <p className="mt-4 text-sm leading-relaxed text-emerald-50/85">
              Accède à ton tableau de bord, ton planning, ton équipe et ton profil personnel.
            </p>

            <div className="mt-8 space-y-3 text-sm text-emerald-100/90">
              <div className="rounded-2xl border border-emerald-300/20 bg-black/20 px-4 py-3">
                ✅ Accès individuel sécurisé
              </div>
              <div className="rounded-2xl border border-emerald-300/20 bg-black/20 px-4 py-3">
                📅 Planning équipe en lecture seule
              </div>
              <div className="rounded-2xl border border-emerald-300/20 bg-black/20 px-4 py-3">
                👥 Vue de ton équipe et de tes coachs
              </div>
            </div>

            <div className="mt-8 text-xs text-emerald-100/70">
              Pas encore de compte athlète ? Contacte le bureau pour création et activation du rôle.
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.26em] text-emerald-300">Authentification</p>
            <h2 className="mt-2 text-2xl font-bold">Bienvenue</h2>

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-200">Adresse e-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
                  placeholder="athlete@blackwaves-cheer.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-200">Mot de passe</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/40"
                  placeholder="Ton mot de passe"
                />
              </div>

              <button
                type="submit"
                disabled={state === "loading"}
                className="mt-2 w-full rounded-full bg-emerald-600 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-900"
              >
                {state === "loading" ? "Connexion en cours..." : "Entrer dans l'espace athlète"}
              </button>
            </form>

            <div className="mt-6 flex flex-wrap gap-3 text-xs">
              <Link
                href="/login"
                className="rounded-full border border-slate-600 px-3 py-1.5 text-slate-200 transition hover:bg-slate-800"
              >
                Accès bureau
              </Link>
              <Link
                href="/parent/login"
                className="rounded-full border border-slate-600 px-3 py-1.5 text-slate-200 transition hover:bg-slate-800"
              >
                Accès parent
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
