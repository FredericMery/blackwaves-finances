"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function MainHeader() {
  const pathname = usePathname();

  // On détecte si on se trouve dans la zone adhérent
  const isPrivate =
    pathname.startsWith("/adherent") ||
    pathname.startsWith("/planning") ||
    pathname.startsWith("/admin");

  return (
    <header
      className={`w-full fixed top-0 left-0 z-50 border-b border-white/10 ${
        isPrivate ? "bg-black/95" : "bg-bw-navy/85 backdrop-blur-md"
      }`}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">

        {/* LOGO */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/blackwaves-logo.png"
            alt="Black Waves Logo"
            width={45}
            height={45}
            className="rounded-full border border-bw-blue shadow-lg"
          />
          <div>
            <p className="text-sm font-semibold text-white">Black Waves</p>
            <p className="text-[11px] text-white/60">Cheerleading Marseille</p>
          </div>
        </Link>

        {/* ======================= */}
        {/* MENU PUBLIC              */}
        {/* ======================= */}
        {!isPrivate && (
          <nav className="hidden md:flex gap-6 text-white text-sm font-medium">
            <Link href="/" className="hover:text-bw-blue transition">Accueil</Link>
            <Link href="/club" className="hover:text-bw-blue transition">Le Club</Link>
            <Link href="/histoire" className="hover:text-bw-blue transition">Histoire</Link>
            <Link href="/equipes" className="hover:text-bw-blue transition">Équipes</Link>
            <Link href="/staff" className="hover:text-bw-blue transition">Coach</Link>
            <Link href="/parents" className="hover:text-bw-blue transition">Parents</Link>
            <Link href="/competitions" className="hover:text-bw-blue transition">Compétitions</Link>
            <Link href="/galerie" className="hover:text-bw-blue transition">Galerie</Link>

            {/* Bouton Login bien visible */}
            <Link
              href="/login"
              className="px-3 py-1 rounded-full border border-bw-blue text-bw-blue hover:bg-bw-blue hover:text-white transition"
            >
              Login
            </Link>
          </nav>
        )}

        {/* ======================= */}
        {/* MENU ZONE ADHÉRENT      */}
        {/* ======================= */}
        {isPrivate && (
          <nav className="hidden md:flex gap-4 text-sm font-medium text-white">
            <Link
              href="/adherent"
              className="hover:text-bw-blue transition"
            >
              Tableau de bord
            </Link>

            <Link
              href="/planning"
              className="hover:text-bw-blue transition"
            >
              Planning
            </Link>

            <Link
              href="/admin/staff"
              className="hover:text-bw-blue transition"
            >
              Staff & Contacts
            </Link>

            {/* Lien retour public visible */}
            <Link
              href="/"
              className="hover:text-bw-blue transition ml-3 px-3 py-1 rounded-full border border-white/30"
            >
              Retour au site public
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}

