"use client";

import Image from "next/image";
import Link from "next/link";

export default function WelcomeAdherent() {
  return (
    <div className="min-h-screen pt-24 bg-gradient-to-b from-gray-100 to-gray-200 px-4 flex justify-center">
      <div className="max-w-3xl w-full bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-8 border border-gray-300">

        {/* Photo + message */}
        <div className="flex flex-col items-center text-center">
          <div className="relative w-40 h-40 mb-4">
            <div className="absolute inset-0 rounded-full bg-blue-300 blur-xl opacity-40"></div>

            <div className="relative w-full h-full overflow-hidden rounded-[24px] border-4 border-blue-600 shadow-lg">
              <Image
                src="/placeholder-user.png"
                alt="Photo adhérent"
                fill
                className="object-cover"
              />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900">
            Bienvenue 💙
          </h1>
          <p className="text-gray-600 mt-1">
            Accès réservé aux adhérents Black Waves Cheer.
          </p>
        </div>

        {/* Boutons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
          <Link href="/adherent/enfant" className="btn-wave">
            Mon profil
          </Link>

          <Link href="/adherent/equipe" className="btn-wave">
            Mon équipe
          </Link>

          <Link href="/adherent/planning" className="btn-wave">
            Mon planning
          </Link>

          <Link href="/adherent/competitions" className="btn-wave">
            Mes compétitions
          </Link>
        </div>
      </div>
    </div>
  );
}
