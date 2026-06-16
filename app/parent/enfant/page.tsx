export default function ParentEnfantPage() {
  return (
    <main className="min-h-screen bg-[#05060a] text-white pt-28 pb-16 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-10">
        {/* Colonne gauche : fiche enfant */}
        <section className="flex-1">
          <div className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 via-white/0 to-white/5 p-6 md:p-8 shadow-2xl overflow-hidden">
            {/* Halo léger */}
            <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.35),_transparent_55%)]" />

            <div className="relative space-y-4">
              <h1 className="text-xl md:text-2xl font-semibold tracking-wide">
                Mon enfant
              </h1>
              <p className="text-sm text-white/70 max-w-lg">
                Vous retrouverez ici les informations principales de votre
                enfant au sein du club : équipe, catégorie, numéro de licence,
                état des documents, etc.
              </p>

              <div className="mt-6 grid gap-4 text-sm md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/50">
                    Nom & prénom
                  </p>
                  <p className="mt-1 font-semibold">
                    (à compléter plus tard avec la vraie fiche)
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/50">
                    Équipe / catégorie
                  </p>
                  <p className="mt-1 font-semibold">
                    (sera relié à l’équipe de votre enfant)
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/50">
                    Numéro de licence
                  </p>
                  <p className="mt-1 font-semibold">À venir</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/50">
                    Dossier & documents
                  </p>
                  <p className="mt-1 font-semibold">
                    (certificat, autorisations, etc.)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Colonne droite : petites cartes d’infos rapides */}
        <aside className="w-full md:w-80 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-black/50 px-5 py-4">
            <h2 className="text-sm font-semibold mb-1">
              Prochaine étape du projet
            </h2>
            <p className="text-xs text-white/70">
              Cette page affichera bientôt automatiquement les données de votre
              enfant : infos perso, équipe, saison, état des paiements, etc.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/50 px-5 py-4">
            <h3 className="text-sm font-semibold mb-1">
              Raccourcis utiles (à venir)
            </h3>
            <ul className="mt-2 space-y-1 text-xs text-white/75">
              <li>• Voir son planning détaillé</li>
              <li>• Consulter ses compétitions</li>
              <li>• Télécharger les documents du club</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
