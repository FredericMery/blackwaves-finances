export default function ParentsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10">
        {/* En-tête */}
        <header className="mb-10 border-b border-white/5 pb-6">
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-400">
            Infos parents
          </div>
          <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">
            Espace parents Black Waves
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">
            Cet espace rassemble les informations essentielles pour accompagner votre enfant
            au sein du club Black Waves Cheerleading : fonctionnement de la saison, communication,
            uniformes, compétitions et points pratiques.
          </p>
        </header>

        {/* 1. Fonctionnement général */}
        <section className="mb-8 grid gap-6 md:grid-cols-[1.2fr,1fr]">
          {/* Bloc texte principal */}
          <div className="rounded-2xl border border-sky-500/30 bg-slate-900/70 p-5 shadow-lg shadow-sky-900/30">
            <h2 className="text-lg font-semibold text-white">Fonctionnement général du club</h2>
            <p className="mt-2 text-sm text-slate-300">
              Black Waves est un club de cheerleading structuré autour de plusieurs équipes,
              adaptées à l&apos;âge et au niveau des athlètes. L&apos;objectif est de proposer un
              cadre sportif sécurisé, exigeant et bienveillant.
            </p>

            <div className="mt-4 grid gap-4 text-sm text-slate-200 md:grid-cols-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-300">
                  Organisation de la saison
                </h3>
                <ul className="mt-2 space-y-1 text-[13px] text-slate-300">
                  <li>• Une saison sportive structurée (rentrée → fin de saison).</li>
                  <li>• Entraînements réguliers hebdomadaires par équipe.</li>
                  <li>• Participation à des compétitions et événements selon le niveau.</li>
                  <li>• Un calendrier partagé pour les dates importantes.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-300">
                  Encadrement & sécurité
                </h3>
                <ul className="mt-2 space-y-1 text-[13px] text-slate-300">
                  <li>• Encadrement par des coachs formés et identifiés.</li>
                  <li>• Répartition des athlètes par âge, niveau et objectifs.</li>
                  <li>• Priorité donnée à la sécurité, à la progression technique et à l&apos;esprit d&apos;équipe.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bloc infos pratiques rapides */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/70 p-4 text-sm shadow-md shadow-emerald-900/30">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                Points clés pour les parents
              </h3>
              <ul className="mt-2 space-y-1 text-[13px] text-slate-200">
                <li>• Arriver en avance pour les entraînements.</li>
                <li>• Prévoir une gourde d&apos;eau nominative.</li>
                <li>• Prévenir en cas d&apos;absence via les canaux de communication.</li>
                <li>• Respecter les horaires de début et de fin de séance.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-slate-900/70 p-4 text-sm shadow-md shadow-amber-900/30">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                Contact & échanges
              </h3>
              <p className="mt-2 text-[13px] text-slate-200">
                Les échanges avec le club se font principalement via les coachs référents,
                les messages transmis par le bureau et les canaux de communication officiels
                (mail / groupes par équipe).
              </p>
            </div>
          </div>
        </section>

        {/* 2. Inscriptions & essais */}
        <section className="mb-8 rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-lg shadow-black/40">
          <h2 className="text-lg font-semibold text-white">Essais, inscriptions & dossier athlète</h2>
          <p className="mt-2 text-sm text-slate-300">
            Le club fonctionne avec une phase de découverte, suivie d&apos;une inscription
            complète comprenant un dossier administratif et, selon les saisons, un certificat
            médical ou attestation sur l&apos;honneur.
          </p>

          <div className="mt-4 grid gap-5 md:grid-cols-3 text-[13px] text-slate-200">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-300">
                1. Demande d&apos;essai
              </h3>
              <ul className="mt-2 space-y-1">
                <li>• Formulaire de demande d&apos;essai à compléter.</li>
                <li>• Orientation vers l&apos;équipe la plus adaptée.</li>
                <li>• Séance d&apos;essai sur un créneau défini.</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-300">
                2. Validation & inscription
              </h3>
              <ul className="mt-2 space-y-1">
                <li>• Retour du coach sur l&apos;intégration dans l&apos;équipe.</li>
                <li>• Dossier d&apos;inscription transmis par le club.</li>
                <li>• Documents à compléter et à signer par les responsables légaux.</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-300">
                3. Suivi administratif
              </h3>
              <ul className="mt-2 space-y-1">
                <li>• Dossier athlète mis à jour en cours de saison si besoin.</li>
                <li>• Rappel des pièces manquantes via le bureau.</li>
                <li>• Communication des informations importantes par mail / espace parent.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 3. Uniformes & tenue */}
        <section className="mb-8 grid gap-6 md:grid-cols-[1.1fr,1.1fr]">
          {/* Uniformes */}
          <div className="rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-900/40 via-slate-900/70 to-slate-950/80 p-5 shadow-lg shadow-pink-900/40">
            <h2 className="text-lg font-semibold text-white">Tenues, uniformes & apparence</h2>
            <p className="mt-2 text-sm text-slate-200">
              L&apos;uniforme fait partie intégrante de l&apos;identité du club et de la présentation en compétition.
              Les informations détaillées sur les tenues sont communiquées en début de saison.
            </p>
            <ul className="mt-3 space-y-1 text-[13px] text-slate-100">
              <li>• Tenue d&apos;entraînement définie (short/leggings, top, chaussures propres).</li>
              <li>• Uniforme de compétition spécifique à l&apos;équipe.</li>
              <li>• Coiffure et maquillage peuvent être harmonisés pour les compétitions.</li>
              <li>• Merci de respecter les consignes transmises par les coachs avant chaque événement.</li>
            </ul>
          </div>

          {/* Compétitions */}
          <div className="rounded-2xl border border-violet-500/30 bg-slate-900/70 p-5 shadow-lg shadow-violet-900/40">
            <h2 className="text-lg font-semibold text-white">Compétitions, shows & déplacements</h2>
            <p className="mt-2 text-sm text-slate-300">
              Selon le niveau de l&apos;équipe, les athlètes peuvent participer à des compétitions officielles
              et/ou des démonstrations (shows, événements locaux).
            </p>
            <ul className="mt-3 space-y-1 text-[13px] text-slate-200">
              <li>• Les dates des compétitions sont annoncées le plus en amont possible.</li>
              <li>• La présence aux entraînements précédant une compétition est importante.</li>
              <li>• Les informations pratiques (horaires, lieu, point de rendez-vous) sont communiquées par le club.</li>
              <li>• Les modalités de transport (covoiturage, déplacement club ou individuel) sont précisées au cas par cas.</li>
            </ul>
          </div>
        </section>

        {/* 4. Communication & règles de vie */}
        <section className="mb-10 rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-lg shadow-black/40">
          <h2 className="text-lg font-semibold text-white">Communication, règles de vie & respect</h2>
          <p className="mt-2 text-sm text-slate-300">
            Pour garantir un environnement serein et respectueux, certaines règles s&apos;appliquent à tous :
            athlètes, parents, staff et bénévoles.
          </p>

          <div className="mt-4 grid gap-5 md:grid-cols-3 text-[13px] text-slate-200">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                Communication avec le club
              </h3>
              <ul className="mt-2 space-y-1">
                <li>• Utiliser les canaux officiels pour les informations importantes.</li>
                <li>• Prévenir en cas d&apos;absence ou de retard.</li>
                <li>• Limiter les échanges directs pendant les séances (coachs concentrés sur le groupe).</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-rose-300">
                Attitude & respect
              </h3>
              <ul className="mt-2 space-y-1">
                <li>• Respect des coachs, des autres athlètes et des familles.</li>
                <li>• Tolérance zéro pour les comportements irrespectueux ou discriminatoires.</li>
                <li>• Encourager une attitude positive autour du sport et de la progression.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                Présence & engagement
              </h3>
              <ul className="mt-2 space-y-1">
                <li>• Une équipe repose sur la présence de chacun.</li>
                <li>• Prévenir au plus tôt en cas d&apos;impossibilité de participation.</li>
                <li>• Les engagements prise de saison sont importants pour la cohésion du groupe.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 5. Contact & liens utiles */}
        <section className="rounded-2xl border border-sky-500/30 bg-slate-900/80 p-5 text-sm shadow-lg shadow-sky-900/40">
          <h2 className="text-lg font-semibold text-white">Questions, contact & liens utiles</h2>
          <p className="mt-2 text-sm text-slate-300">
            Pour toute question complémentaire, n&apos;hésitez pas à contacter le club. Les informations détaillées
            sont régulièrement mises à jour en début et en cours de saison.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2 text-[13px] text-slate-200">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-300">
                Contact principal
              </h3>
              <p className="mt-2">
                Mail :{' '}
                <a
                  href="mailto:contact@blackwaves-cheer.fr"
                  className="font-medium text-sky-300 hover:text-sky-200"
                >
                  contact@blackwaves-cheer.fr
                </a>
              </p>
              <p className="mt-1 text-slate-300">
                Les coordonnées spécifiques (coach, référent, bureau) sont communiquées en début de saison.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-300">
                Espaces en ligne
              </h3>
              <ul className="mt-2 space-y-1">
                <li>• Espace membre du site : accès réservé aux parents et athlètes.</li>
                <li>• Groupes par équipe (messagerie) pour les informations pratiques.</li>
                <li>• Documents du club disponibles via l&apos;espace bureau / parent.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}