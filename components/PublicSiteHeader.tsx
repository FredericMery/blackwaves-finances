"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import BureauNavButton from "@/components/BureauNavButton";

const primaryLinks = [
  { href: "/", label: "Accueil" },
  { href: "/club", label: "Le Club" },
  { href: "/equipes", label: "Les équipes" },
  { href: "/evenements", label: "Événements" },
  { href: "/galerie", label: "Galerie photos" },
  { href: "/goodies", label: "Boutique" },
  { href: "/contact", label: "Contact" },
];

const secondaryLinks = [
  { href: "/athlete/login", label: "Espace athlète" },
  { href: "/parent/login", label: "Espace parent" },
  { href: "/login", label: "Espace bureau" },
];

export default function PublicSiteHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileHeaderRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!mobileHeaderRef.current) {
        return;
      }

      if (!mobileHeaderRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    const handleScroll = () => {
      setMobileMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [mobileMenuOpen]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : Boolean(pathname?.startsWith(href));

  // Masquer sur la home — elle a son propre header intégré
  if (pathname === "/") return null;

  return (
    <header
      ref={mobileHeaderRef}
      className="relative sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-md backdrop-blur supports-[backdrop-filter]:bg-white/90 md:static"
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex min-h-16 items-center justify-between gap-3 py-2.5 md:py-3">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2.5 transition hover:opacity-80"
          >
            <img
              src="/blackwaves-logo.png"
              alt="Black Waves Logo"
              className="h-8 w-auto shrink-0 rounded-full ring-1 ring-slate-200"
            />
            <div className="min-w-0">
              <div className="truncate text-[9px] font-semibold uppercase tracking-[0.28em] text-sky-600">
                Black Waves
              </div>
              <div className="truncate text-sm font-semibold text-[#0f1c3f] sm:text-base">
                Cheerleading
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-4 text-sm md:flex md:flex-nowrap">
            {primaryLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`relative whitespace-nowrap px-1 text-sm font-medium transition ${
                  isActive(href) ? "text-sky-700" : "text-[#0f1c3f]"
                }`}
              >
                <span className="relative z-20">{label}</span>
                <span
                  className={`absolute inset-0 z-10 rounded-md blur-xl transition-all duration-300 ${
                    isActive(href)
                      ? "bg-sky-400/30 opacity-100"
                      : "bg-sky-400/40 opacity-0 hover:opacity-100 hover:blur-2xl"
                  }`}
                />
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/athlete/login"
              className="rounded-full border border-emerald-600 bg-white px-3 py-1 text-sm font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-50"
            >
              Espace athlète
            </Link>

            <Link
              href="/parent/login"
              className="rounded-full border border-sky-600 bg-white px-3 py-1 text-sm font-medium text-sky-700 shadow-sm transition hover:bg-sky-50"
            >
              Espace parent
            </Link>

            <Link
              href="/login"
              className="rounded-full bg-sky-600 px-3 py-1 text-sm font-medium text-white shadow transition hover:bg-sky-700"
            >
              Espace bureau
            </Link>
            <BureauNavButton />
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/parent/login"
              className="rounded-full border border-sky-200 bg-gradient-to-b from-sky-50 to-white px-3 py-2 text-[11px] font-semibold text-sky-700 shadow-sm transition hover:bg-sky-100"
            >
              Parent
            </Link>
            <button
              type="button"
              aria-expanded={mobileMenuOpen}
              aria-controls="public-mobile-menu"
              aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 text-slate-900 shadow-sm transition hover:bg-slate-100"
            >
              <span className="sr-only">Menu principal</span>
              <span className="relative block h-4 w-5">
                <span
                  className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current transition ${
                    mobileMenuOpen ? "translate-y-[7px] rotate-45" : ""
                  }`}
                />
                <span
                  className={`absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-current transition ${
                    mobileMenuOpen ? "opacity-0" : ""
                  }`}
                />
                <span
                  className={`absolute left-0 top-[14px] h-0.5 w-5 rounded-full bg-current transition ${
                    mobileMenuOpen ? "-translate-y-[7px] -rotate-45" : ""
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        className={`absolute left-0 right-0 top-full hidden h-dvh bg-slate-950/8 transition-opacity duration-200 ease-out md:hidden ${
          mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        id="public-mobile-menu"
        aria-hidden={!mobileMenuOpen}
        className={`relative z-10 overflow-hidden border-t border-slate-200 bg-white/92 backdrop-blur transition-[max-height,opacity,transform,box-shadow] duration-200 ease-out md:hidden ${
          mobileMenuOpen
            ? "max-h-[80vh] opacity-100 shadow-[0_18px_40px_rgba(15,28,63,0.12)]"
            : "pointer-events-none max-h-0 opacity-0 shadow-none"
        }`}
      >
        <div
          className={`mx-auto max-w-6xl px-4 py-3 transition duration-200 ease-out ${
            mobileMenuOpen ? "translate-y-0" : "-translate-y-2"
          }`}
        >
          <div className="overflow-hidden rounded-[24px] border border-slate-200/90 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96)_55%,rgba(240,249,255,0.95))] shadow-[0_18px_50px_rgba(15,28,63,0.10)] ring-1 ring-white/70">
            <div className="border-b border-slate-200/80 px-4 pb-3 pt-3.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-sky-600">
                Navigation
              </div>
              <div className="mt-1 text-sm font-semibold text-[#0f1c3f]">
                Accès rapide au site
              </div>
            </div>

            <nav className="grid grid-cols-1 gap-1.5 px-3 py-3">
              {primaryLinks.map(({ href, label }, index) => (
                <Link
                  key={href}
                  href={href}
                  style={{
                    transitionDelay: mobileMenuOpen ? `${index * 20}ms` : "0ms",
                  }}
                  className={`rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-200 ease-out ${
                    mobileMenuOpen
                      ? "translate-y-0 opacity-100"
                      : "translate-y-1 opacity-0"
                  } ${
                    isActive(href)
                      ? "bg-[#0f1c3f] text-white shadow-lg shadow-slate-900/15"
                      : "bg-white/90 text-[#0f1c3f] shadow-sm ring-1 ring-slate-200/80 hover:bg-slate-50"
                  }`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span>{label}</span>
                    <span
                      className={`text-base leading-none transition ${
                        isActive(href) ? "text-sky-200" : "text-slate-300"
                      }`}
                    >
                      ›
                    </span>
                  </span>
                </Link>
              ))}
            </nav>

            <div className="grid grid-cols-2 gap-2 border-t border-slate-200/80 px-3 pb-3 pt-3">
              {secondaryLinks.map(({ href, label }, index) => (
                <Link
                  key={href}
                  href={href}
                  style={{
                    transitionDelay: mobileMenuOpen
                      ? `${120 + index * 25}ms`
                      : "0ms",
                  }}
                  className={`rounded-xl px-3 py-3 text-center text-[13px] font-semibold transition-all duration-200 ease-out ${
                    mobileMenuOpen
                      ? "translate-y-0 opacity-100"
                      : "translate-y-1 opacity-0"
                  } ${
                    href === "/login"
                      ? "bg-sky-600 text-white shadow-lg shadow-sky-600/20 hover:bg-sky-700"
                      : href === "/athlete/login"
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
                      : "bg-slate-900 text-white shadow-lg shadow-slate-900/10 hover:bg-slate-800"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}