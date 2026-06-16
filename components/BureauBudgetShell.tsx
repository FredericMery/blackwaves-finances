"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const budgetMenu = [
  { href: "/bureau/dashboard", label: "Synthèse" },
  { href: "/bureau/budget", label: "Budget" },
  { href: "/bureau/previsionnel", label: "Prévisionnel" },
  { href: "/bureau/comparatif-budget", label: "Comparatif" },
  { href: "/bureau/finances", label: "Finances" },
  { href: "/bureau/comptes-athletes", label: "Comptes athlètes" },
  { href: "/bureau/preparer-saison", label: "Préparer saison" },
];

export default function BureauBudgetShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/bureau/login") {
    return <>{children}</>;
  }

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.20),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.16),_transparent_26%),linear-gradient(180deg,#08111f_0%,#0b1324_45%,#020817_100%)] text-slate-50">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/86 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.38em] text-cyan-300/80">
                Espace bureau
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Pilotage budget & trésorerie
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-[15px]">
                Un environnement sobre, pro et centré sur le budget du club, avec
                les synthèses, le prévisionnel et le suivi détaillé des lignes.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/bureau/dashboard"
                className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/18"
              >
                Synthèse
              </Link>
              <Link
                href="/bureau/budget"
                className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/18"
              >
                Saisie budget
              </Link>
              <Link
                href="/"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10"
              >
                Retour site public
              </Link>
            </div>
          </div>

          <nav className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {budgetMenu.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition ${
                  isActive(item.href)
                    ? "border-sky-300/40 bg-sky-300/15 text-white shadow-[0_0_0_1px_rgba(125,211,252,0.15)]"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/8 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}