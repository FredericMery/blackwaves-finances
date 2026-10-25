"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const budgetMenu = [
  { href: "/bureau/dashboard", label: "Vue d’ensemble" },
  { href: "/bureau/gerer-asso-2", label: "Budget & factures" },
  { href: "/bureau/budget", label: "Mouvements" },
  { href: "/bureau/previsionnel", label: "Prévisionnel" },
  { href: "/bureau/comparatif-budget", label: "Écarts budgétaires" },
  { href: "/bureau/finances", label: "Analyse par saison" },
];

export default function BureauBudgetShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/bureau/login") {
    return <>{children}</>;
  }

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <div className="finance-app min-h-screen bg-slate-50 text-slate-950">
      <a href="#finance-content" className="finance-skip-link">
        Aller au contenu
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/bureau/dashboard" className="flex min-h-11 items-center gap-3">
              <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-lg font-bold text-cyan-300">BW</span>
              <span>
                <span className="block text-lg font-bold tracking-tight">BlackWaves <span className="text-cyan-800">Finances</span></span>
                <span className="block text-xs text-slate-500">Le budget du club, simplement.</span>
              </span>
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                Espace bureau
              </span>
              <Link href="/bureau/budget?view=new" className="inline-flex min-h-11 items-center rounded-xl bg-cyan-800 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-900">
                + Saisir un mouvement
              </Link>
            </div>
          </div>

          <nav aria-label="Navigation financière" className="mt-4 grid grid-cols-2 gap-1 pb-3 sm:grid-cols-3 lg:flex lg:flex-wrap">
            {budgetMenu.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  isActive(item.href)
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main id="finance-content" tabIndex={-1} className="mx-auto w-full min-w-0 max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
      <footer className="mx-auto max-w-7xl px-4 pb-6 text-xs leading-relaxed text-slate-500 sm:px-6 lg:px-8">
        Budget & factures suit les lignes, engagements et paiements. Mouvements, prévisionnel et analyses utilisent le suivi budgétaire distinct existant ; leurs montants ne sont pas additionnés.
      </footer>
    </div>
  );
}