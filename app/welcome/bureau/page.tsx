"use client";

import Image from "next/image";
import Link from "next/link";

export default function WelcomeBureau() {
  return (
    <div className="min-h-screen pt-24 bg-gradient-to-b from-gray-100 to-gray-200 px-4 flex justify-center">
      <div className="max-w-3xl w-full bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-8 border border-gray-300">

        <div className="flex flex-col items-center text-center">
          <div className="relative w-40 h-40 mb-4">
            <div className="absolute inset-0 rounded-full bg-blue-300 blur-xl opacity-40"></div>

            <div className="relative w-full h-full overflow-hidden rounded-[24px] border-4 border-blue-600 shadow-lg">
              <Image
                src="/placeholder-user.png"
                alt="Photo bureau"
                fill
                className="object-cover"
              />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900">
            Bonjour 👋 Membre du bureau
          </h1>
          <p className="text-gray-600 mt-1">
            Accès dédié au pilotage de l’association.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
          <Link href="/bureau/planning" className="btn-wave">
            Gérer le planning
          </Link>

          <Link href="/bureau/budget" className="btn-wave">
            Gérer le budget
          </Link>

          <Link href="/bureau/inscrits" className="btn-wave">
            Gérer les inscrits
          </Link>
        </div>
      </div>
    </div>
  );
}
