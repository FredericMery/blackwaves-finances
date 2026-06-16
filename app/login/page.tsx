"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type LoginState = "idle" | "loading";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<LoginState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setState("loading");

    try {
      // 1. Auth Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !data.user) {
        setError("Identifiants incorrects. Merci de vérifier vos informations.");
        setState("idle");
        return;
      }

      // 2. Récup du profil + rôle
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        setError(
          "Impossible de récupérer votre profil. Merci de contacter le bureau."
        );
        setState("idle");
        return;
      }

      const role = (profile.role || "").toLowerCase();

      // 3. Pose du cookie pour le middleware
      //    (Vue serveur : bw_adherent_auth=1)
      const maxAge = 60 * 60 * 4;
      document.cookie = `bw_adherent_auth=1; path=/; max-age=${maxAge}; SameSite=Lax`;
      document.cookie = `bw_role=${role}; path=/; max-age=${maxAge}; SameSite=Lax`;

      // 4. Redirection selon le rôle
      if (role === "bureau") {
        router.push("/bureau");
      } else if (role === "coach") {
        router.push("/coach");
      } else if (role === "athlete") {
        router.push("/athlete");
      } else if (role === "parent") {
        // 👉 la page parents = /adherent
        router.push("/adherent");
      } else {
        // rôle inconnu → on renvoie sur la home
        router.push("/");
      }
    } catch (err) {
      console.error(err);
      setError("Une erreur inattendue est survenue. Merci de réessayer.");
    } finally {
      setState("idle");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="w-full max-w-md px-6">
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-pink-500/30 px-8 py-10">
          <p className="text-xs tracking-[0.35em] text-pink-400 uppercase text-center mb-4">
            Espace membres
          </p>
          <h1 className="text-2xl font-bold text-center mb-2">
            Connexion Black Waves
          </h1>
          <p className="text-xs text-slate-300 text-center mb-8 leading-relaxed">
            Accès réservé aux adhérents, parents, coachs et membres du bureau
            Black Waves.
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/40 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-200">
                Adresse e-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-slate-900/60 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-400 transition"
                placeholder="vous@blackwaves-cheer.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-200">
                Mot de passe
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-slate-900/60 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-400 transition"
                placeholder="Votre mot de passe"
              />
            </div>

            <button
              type="submit"
              disabled={state === "loading"}
              className="mt-4 w-full rounded-full bg-pink-600 hover:bg-pink-500 disabled:bg-pink-800 text-sm font-semibold py-2.5 shadow-lg shadow-pink-500/30 transition"
            >
              {state === "loading" ? "Connexion en cours..." : "Se connecter"}
            </button>
          </form>

          <p className="mt-6 text-[10px] text-center text-slate-400 leading-relaxed">
            En cas de difficulté de connexion, merci de contacter le bureau
            Black Waves.
          </p>
        </div>
      </div>
    </div>
  );
}
