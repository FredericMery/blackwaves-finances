"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "ACCUEIL" },
  { href: "/club", label: "LE CLUB" },
  { href: "/histoire", label: "HISTOIRE" },
  { href: "/equipes", label: "ÉQUIPES" },
  { href: "/evenements", label: "ÉVÉNEMENTS" }, // ✅ AJOUTÉ ICI
  { href: "/parents", label: "PARENTS" },
  { href: "/essai", label: "ESSAYER" },
  { href: "/competitions", label: "COMPÉTITIONS" },
  { href: "/galerie", label: "GALERIE" },
  { href: "/contact", label: "CONTACT" },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-black/70 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        
        {/* Logo + Titre */}
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-300 shadow-lg shadow-blue-500/40" />
          <span className="text-xs font-semibold tracking-[0.2em] text-slate-100 uppercase">
            Black Waves Cheer
          </span>
        </Link>

        {/* NAV DESKTOP */}
        <nav className="hidden md:flex items-center gap-5 text-[11px] tracking-[0.18em] font-medium">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`transition-colors ${
                isActive(link.href)
                  ? "text-blue-400"
                  : "text-slate-300 hover:text-blue-300"
              }`}
            >
              {link.label}
            </Link>
          ))}

          <Link
            href="/login"
            className="ml-4 rounded-full bg-blue-600 px-4 py-2 text-[11px] font-semibold tracking-[0.16em] text-white shadow-lg shadow-blue-600/40 hover:bg-blue-500"
          >
            ACCÈS MEMBRE
          </Link>
        </nav>

        {/* HAMBURGER MOBILE */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-white"
        >
          <span
            className={`block h-0.5 w-5 bg-white rounded transition-all ${
              open ? "rotate-45 translate-y-1.5" : "-translate-y-1.5"
            }`}
          />
          <span
            className={`block h-0.5 w-5 bg-white rounded transition-all ${
              open ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`block h-0.5 w-5 bg-white rounded transition-all ${
              open ? "-rotate-45 -translate-y-1.5" : "translate-y-1.5"
            }`}
          />
        </button>
      </div>

      {/* MENU MOBILE DÉROULANT */}
      {open && (
        <div className="md:hidden border-t border-slate-800 bg-black/95">
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 text-[12px] tracking-[0.16em] font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`px-3 py-2 rounded transition-colors ${
                  isActive(link.href)
                    ? "bg-blue-700/30 text-blue-300"
                    : "text-slate-200 hover:bg-slate-800"
                }`}
              >
                {link.label}
              </Link>
            ))}

            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-3 rounded-full bg-blue-600 px-4 py-2 text-center text-white font-semibold shadow-blue-600/40"
            >
              ACCÈS MEMBRE
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}