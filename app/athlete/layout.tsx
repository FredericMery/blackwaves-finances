"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getAthleteAuthHeaders } from "@/lib/athleteAuthHeaders";

const navItems = [
  { href: "/athlete", label: "Tableau de bord", icon: "⚡" },
  { href: "/athlete/planning", label: "Planning", icon: "📅" },
  { href: "/athlete/competitions", label: "Compétitions", icon: "🏆" },
  { href: "/athlete/equipe", label: "Mon équipe", icon: "👥" },
  { href: "/athlete/profil", label: "Mon profil", icon: "🎽" },
];

export default function AthleteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [athleteName, setAthleteName] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    async function loadProfile() {
      if (pathname === "/athlete/login") return;
      try {
        const headers = await getAthleteAuthHeaders();
        const res = await fetch("/api/athlete/me", { headers });
        if (res.status === 401) {
          router.replace("/athlete/login");
          return;
        }
        if (res.status === 403) {
          router.replace("/");
          return;
        }
        if (!res.ok) return;
        const json = await res.json();
        if (json.athlete) {
          setAthleteName(`${json.athlete.prenom} ${json.athlete.nom}`);
          setTeamName(json.team?.label ?? json.athlete.equipe ?? null);
        }
      } catch (_) {}
    }
    loadProfile();
  }, [router, pathname]);

  // Close mobile menu on outside click
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [mobileOpen]);

  async function handleLogout() {
    await supabase.auth.signOut();
    document.cookie = "bw_adherent_auth=; path=/; max-age=0";
    document.cookie = "bw_role=; path=/; max-age=0";
    router.push("/athlete/login");
  }

  const isActive = (href: string) =>
    href === "/athlete" ? pathname === "/athlete" : pathname.startsWith(href);

  if (pathname === "/athlete/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#080d1a] text-white">
      {/* ─── TOP BAR ─── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#080d1a]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          {/* Logo + title */}
          <div className="flex items-center gap-3">
            <Link href="/athlete" className="flex items-center gap-3 transition hover:opacity-80">
              <Image
                src="/blackwaves-logo.png"
                alt="Black Waves"
                width={36}
                height={36}
                className="rounded-full ring-1 ring-white/20"
              />
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.28em] text-sky-400">
                  Black Waves
                </div>
                <div className="text-sm font-semibold">Espace Athlète</div>
              </div>
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-[13px] font-medium transition ${
                  isActive(href)
                    ? "bg-sky-600/20 text-sky-300"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span>{icon}</span>
                {label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {athleteName && (
              <div className="hidden flex-col items-end lg:flex">
                <span className="text-[11px] text-slate-400">Connecté en tant que</span>
                <span className="text-[13px] font-semibold text-white">{athleteName}</span>
                {teamName && (
                  <span className="text-[11px] font-medium text-sky-400">{teamName}</span>
                )}
              </div>
            )}
            <button
              onClick={handleLogout}
              className="hidden rounded-xl border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-red-500/40 hover:text-red-300 lg:block"
            >
              Déconnexion
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 lg:hidden"
            >
              <span className="relative block h-[14px] w-5">
                <span className={`absolute left-0 top-0 h-0.5 w-5 rounded bg-white transition ${mobileOpen ? "translate-y-[6px] rotate-45" : ""}`} />
                <span className={`absolute left-0 top-[6px] h-0.5 w-5 rounded bg-white transition ${mobileOpen ? "opacity-0" : ""}`} />
                <span className={`absolute left-0 top-[12px] h-0.5 w-5 rounded bg-white transition ${mobileOpen ? "-translate-y-[6px] -rotate-45" : ""}`} />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── MOBILE MENU ─── */}
      <div
        ref={menuRef}
        className={`z-40 border-b border-white/10 bg-[#080d1a]/98 backdrop-blur transition-[max-height,opacity] duration-200 ease-out lg:hidden ${
          mobileOpen ? "max-h-[480px] opacity-100" : "max-h-0 overflow-hidden opacity-0"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 py-4">
          {athleteName && (
            <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-[11px] text-slate-400">Connecté en tant que</div>
              <div className="text-sm font-semibold">{athleteName}</div>
              {teamName && <div className="text-[12px] text-sky-400">{teamName}</div>}
            </div>
          )}
          <nav className="grid grid-cols-1 gap-1.5">
            {navItems.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive(href)
                    ? "bg-sky-600/20 text-sky-300"
                    : "bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                <span className="text-base">{icon}</span>
                {label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="mt-2 w-full rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-left text-sm font-medium text-red-300 transition hover:bg-red-500/20"
            >
              🚪 Déconnexion
            </button>
          </nav>
        </div>
      </div>

      {/* ─── CONTENT ─── */}
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
