"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PhotoMosaic from "@/components/PhotoMosaic";

function useBWUser() {
  const [email, setEmail] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setEmail(window.localStorage.getItem("bw_email") || "");
    setReady(true);
  }, []);

  const name = email ? email.split("@")[0].replace(".", " ") : "coach";

  return { name, ready };
}

export default function CoachDashboard() {
  const { name } = useBWUser();

  return (
    <div className="max-w-6xl mx-auto px-4 pb-16">
      <div className="mt-10 mb-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        
        {/* Info coach */}
        <div className="bg-gradient-to-r from-indigo-600 via-violet-500 to-purple-400 p-[2px] rounded-3xl shadow-xl">
          <div className="bg-neutral-950/95 rounded-3xl px-8 py-8">
            <p className="text-xs uppercase tracking-[0.25em] text-indigo-300">Espace coach</p>
            <h1 className="text-3xl font-bold text-white mt-2">
              Bienvenue coach {name} 👋
            </h1>
            <p className="text-sm text-neutral-300 mt-2">
              Gère ton équipe et prépare tes entraînements.
            </p>
          </div>
        </div>

        <div className="hidden md:block">
          <PhotoMosaic />
        </div>

      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <WaveCard title="Mon équipe" href="/coach/mon-equipe" />
        <WaveCard title="Mon planning" href="/coach/planning" />
        <WaveCard title="Retour au site public" href="/" />
      </div>
    </div>
  );
}

function WaveCard({ title, href }: { title: string; href: string }) {
  return (
    <Link href={href}>
      <div className="p-[2px] bg-gradient-to-r from-indigo-600 to-purple-400 rounded-2xl transition shadow-lg hover:scale-[1.02]">
        <div className="bg-white rounded-2xl p-4">
          <h3 className="font-semibold text-neutral-900">{title}</h3>
          <p className="text-xs text-indigo-600 font-semibold mt-2">Accéder →</p>
        </div>
      </div>
    </Link>
  );
}
