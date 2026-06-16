"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const budgetMenu = [
  { href: "/bureau", label: "Accueil" },
  { href: "/bureau/gerer-asso-2", label: "Gérer asso 2" },
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.12),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.10),_transparent_24%),linear-gradient(180deg,#f8fbff_0%,#f4f7fb_46%,#eef4f7_100%)] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.38em] text-cyan-700/80">
                Espace bureau
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Pilotage budget & trésorerie
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-[15px]">
                Un environnement sobre, pro et centré sur le budget du club, avec
                les synthèses, le prévisionnel et le suivi détaillé des lignes.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/bureau"
                className="rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100"
              >
                Accueil bureau
              </Link>
              <Link
                href="/bureau/gerer-asso-2"
                className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-800 transition hover:bg-violet-100"
              >
                Gérer asso 2
              </Link>
              <Link
                href="/bureau/budget"
                className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
              >
                Saisie budget
              </Link>
              <Link
                href="/"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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
                    ? "border-sky-200 bg-sky-100 text-sky-900 shadow-[0_0_0_1px_rgba(186,230,253,0.9)]"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
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