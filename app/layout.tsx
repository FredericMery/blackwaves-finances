import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import PublicSiteHeader from "@/components/PublicSiteHeader";

export const metadata: Metadata = {
  title: "Black Waves Cheerleading",
  description:
    "Site officiel du club Black Waves Cheerleading : équipes, compétitions, informations parents et gestion du club.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/blackwaves-logo.png", sizes: "558x560", type: "image/png" }],
    shortcut: [{ url: "/blackwaves-logo.png", sizes: "558x560", type: "image/png" }],
    apple: [{ url: "/blackwaves-logo.png", sizes: "558x560", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Black Waves",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f1c3f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const year = new Date().getFullYear();

  return (
    <html lang="fr">
      <body className="bg-slate-950 text-slate-50">
        <div className="flex min-h-screen flex-col">
          <PublicSiteHeader />

          {/* CONTENU */}
          <main className="flex-1">{children}</main>

          {/* 🔵 FOOTER */}
          <footer className="border-t border-white/10 bg-slate-950/95">
            <div className="mx-auto max-w-6xl px-4 py-6 text-xs text-slate-300 md:text-[13px]">
              
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-sky-400">
                    Black Waves
                  </div>
                  <h2 className="mt-1 text-sm font-semibold text-white">
                    Black Waves Cheerleading
                  </h2>
                </div>

                {/* Navigation footer */}
                <nav className="flex flex-wrap gap-4 text-[11px] text-slate-300 md:text-[12px]">
                  <Link href="/" className="hover:text-sky-300">Accueil</Link>
                  <Link href="/club" className="hover:text-sky-300">Le Club</Link>
                  <Link href="/equipes" className="hover:text-sky-300">Les équipes</Link>
                  <Link href="/evenements" className="hover:text-sky-300">Événements</Link> {/* ✅ AJOUT ICI */}
                  <Link href="/galerie" className="hover:text-sky-300">Galerie</Link>
                  <Link href="/goodies" className="hover:text-sky-300">Boutique</Link>
                  <Link href="/contact" className="hover:text-sky-300">Contact</Link>
                  <Link href="/mentions-legales" className="hover:text-sky-300">Mentions légales</Link>
                  <Link href="/rgpd" className="hover:text-sky-300">RGPD</Link>
                </nav>
              </div>

              <div className="mt-5 flex flex-col items-start justify-between gap-2 border-t border-white/5 pt-3 text-[11px] text-slate-500 md:flex-row md:items-center">
                <span>© {year} Black Waves Cheerleading — Tous droits réservés.</span>
                <span>Site développé pour le club par le bureau & le staff.</span>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}