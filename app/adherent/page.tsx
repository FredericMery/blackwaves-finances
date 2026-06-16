'use client';

import Link from 'next/link';

export default function AdherentDashboardPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50 pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <header className="mb-8">
          <p className="text-xs font-semibold tracking-[0.25em] text-pink-400 uppercase mb-2">
            Espace adhérents
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Bienvenue dans votre espace parent
          </h1>
          <p className="mt-2 text-sm text-slate-300 max-w-2xl">
            Retrouvez ici les informations essentielles concernant votre enfant :
            équipe, planning, compétitions et suivi de son inscription au club Black
            Waves Cheer.
          </p>
        </header>

        {/* Contenu principal */}
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-8 items-stretch">
          {/* Bloc gauche : cadre photo + infos enfant */}
          <section className="relative rounded-3xl border border-slate-800 bg-slate-950/70 px-6 py-6 md:px-8 md:py-8 overflow-hidden">
            {/* Halo bleu derrière le cadre */}
            <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-pink-600/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-10 bottom-0 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl" />

            <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center md:items-start">
              {/* Cadre photo wavy */}
              <div className="w-full max-w-xs">
                <div className="relative">
                  {/* “Vagues” haut */}
                  <div className="absolute -top-2 left-0 right-0 h-4 bg-gradient-to-r from-pink-500 via-sky-400 to-pink-500 rounded-t-3xl blur-[1px]" />
                  {/* Cadre principal */}
                  <div className="relative mt-2 rounded-3xl border border-slate-700 bg-slate-900/80 overflow-hidden shadow-xl shadow-slate-900/70">
                    <div className="aspect-[4/5] flex items-center justify-center">
                      <span className="text-[11px] text-slate-400 px-4 text-center">
                        Zone photo parent / enfant  
                        (vous pourrez y retrouver la photo de votre enfant ou de son équipe)
                      </span>
                    </div>
                  </div>
                  {/* “Vagues” bas */}
                  <div className="absolute -bottom-2 left-0 right-0 h-4 bg-gradient-to-r from-sky-400 via-pink-500 to-sky-400 rounded-b-3xl blur-[1px]" />
                </div>
              </div>

              {/* Texte descriptif */}
              <div className="flex-1 space-y-3">
                <h2 className="text-xl md:text-2xl font-semibold">
                  Suivi de votre enfant au club
                </h2>
                <p className="text-sm text-slate-300">
                  Depuis cet espace, vous pouvez suivre la situation de votre enfant :
                  son équipe, ses entraînements, ses compétitions et l&apos;état de son
                  inscription. L&apos;objectif est de vous donner une vision claire et
                  à jour de sa saison au sein des Black Waves.
                </p>
                <p className="text-xs text-slate-400">
                  Pour toute question spécifique, vous pouvez utiliser la rubrique
                  &laquo; Questions au club &raquo; ou contacter directement le bureau
                  ou les coachs.
                </p>
              </div>
            </div>
          </section>

          {/* Bloc droit : menu de navigation */}
          <nav className="rounded-3xl border border-slate-800 bg-slate-950/80 px-5 py-6 md:px-6 md:py-7 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-slate-100 mb-1">
              Navigation rapide
            </h2>
            <p className="text-xs text-slate-400 mb-2">
              Accédez en un clic aux principales rubriques de votre espace parent.
            </p>

            <div className="flex flex-col gap-3">
              <Link
                href="/parent/mon-enfant"
                className="group flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm hover:border-pink-500/80 hover:bg-slate-900 transition"
              >
                <div>
                  <p className="font-semibold text-slate-100 group-hover:text-pink-100">
                    Mon enfant
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Informations générales, catégorie, situation.
                  </p>
                </div>
                <span className="text-xs text-pink-400 group-hover:translate-x-0.5 transition">
                  →
                </span>
              </Link>

              <Link
                href="/parent/equipe"
                className="group flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm hover:border-pink-500/80 hover:bg-slate-900 transition"
              >
                <div>
                  <p className="font-semibold text-slate-100 group-hover:text-pink-100">
                    Son équipe
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Nom de l&apos;équipe, staff, infos pratiques.
                  </p>
                </div>
                <span className="text-xs text-pink-400 group-hover:translate-x-0.5 transition">
                  →
                </span>
              </Link>

              <Link
                href="/parent/planning"
                className="group flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm hover:border-pink-500/80 hover:bg-slate-900 transition"
              >
                <div>
                  <p className="font-semibold text-slate-100 group-hover:text-pink-100">
                    Son planning
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Entraînements, événements, créneaux réservés.
                  </p>
                </div>
                <span className="text-xs text-pink-400 group-hover:translate-x-0.5 transition">
                  →
                </span>
              </Link>

              <Link
                href="/parent/competitions"
                className="group flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm hover:border-pink-500/80 hover:bg-slate-900 transition"
              >
                <div>
                  <p className="font-semibold text-slate-100 group-hover:text-pink-100">
                    Ses compétitions
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Calendrier des compétitions et événements majeurs.
                  </p>
                </div>
                <span className="text-xs text-pink-400 group-hover:translate-x-0.5 transition">
                  →
                </span>
              </Link>

              <Link
                href="/adherent/inscription"
                className="group flex items-center justify-between rounded-2xl border border-pink-600/80 bg-pink-600/10 px-4 py-3 text-sm hover:bg-pink-600/20 hover:border-pink-400 transition"
              >
                <div>
                  <p className="font-semibold text-pink-100">
                    Suivi de l&apos;inscription
                  </p>
                  <p className="text-[11px] text-pink-100/80">
                    État d&apos;avancement de l&apos;inscription de votre enfant.
                  </p>
                </div>
                <span className="text-xs text-pink-100 group-hover:translate-x-0.5 transition">
                  →
                </span>
              </Link>

              <Link
                href="/parent/questions"
                className="group flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm hover:border-pink-500/80 hover:bg-slate-900 transition"
              >
                <div>
                  <p className="font-semibold text-slate-100 group-hover:text-pink-100">
                    Questions au club
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Poser une question au bureau ou aux coachs.
                  </p>
                </div>
                <span className="text-xs text-pink-400 group-hover:translate-x-0.5 transition">
                  →
                </span>
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </main>
  );
}
