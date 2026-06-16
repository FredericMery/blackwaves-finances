export default function ParentsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10">
        {/* En-tête */}
        <header className="mb-8 border-b border-white/10 pb-6">
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-sky-400">
            Guide parents
          </div>
          <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">
            Informations parents — Black Waves Cheerleading
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-300">
            Cette page regroupe les informations essentielles pour accompagner votre enfant au sein
            du club Black Waves : fonctionnement de la saison, organisation des entraînements,
            uniformes, compétitions, règles de vie et contacts utiles.
          </p>
        </header>

        {/* Sommaire / navigation simple */}
        <section className="mb-10 rounded-2xl border border-sky-500/30 bg-slate-900/70 p-4 text-xs shadow-md shadow-sky-900/30">
          <h2 className="text-sm font-semibold text-white">Sommaire</h2>
          <p className="mt-1 text-[12px] text-slate-300">
            Pour une lecture plus simple, le guide est structuré en 9 parties :
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <ul className="space-y-1 text-[12px] text-slate-200">
              <li>1. Rôle des parents</li>
              <li>2. Fonctionnement de la saison</li>
              <li>3. Entraînements : organisation pratique</li>
            </ul>
            <ul className="space-y-1 text-[12px] text-slate-200">
              <li>4. Essais, inscriptions & dossier</li>
              <li>5. Uniformes & image du club</li>
              <li>6. Compétitions & déplacements</li>
            </ul>
            <ul className="space-y-1 text-[12px] text-slate-200">
              <li>7. Communication avec le club</li>
              <li>8. Règles de vie & respect</li>
              <li>9. Questions & contact</li>
            </ul>
          </div>
        </section>

        {/* 1. Rôle des parents */}
        <section className="mb-8 rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-md shadow-black/40">
          <h2 className="text-base font-semibold text-white">
            1. Le rôle des parents au sein du club
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Les parents sont des partenaires essentiels du club. Notre objectif commun : permettre
            aux athlètes d&apos;évoluer dans un cadre sécurisé, bienveillant et motivant.
          </p>
          <ul className="mt-3 space-y-1 text-[13px] text-slate-200">
            <li>• Encourager la régularité aux entraînements et la ponctualité.</li>
            <li>• Soutenir l&apos;esprit d&apos;équipe, la progression et le respect des consignes.</li>
            <li>• Favoriser une communication calme et constructive avec le staff.</li>
            <li>• Respecter les décisions sportives prises par les coachs.</li>
          </ul>
        </section>

        {/* 2. Fonctionnement de la saison */}
        <section className="mb-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-sky-500/30 bg-slate-900/70 p-5 shadow-md shadow-sky-900/40">
            <h2 className="text-base font-semibold text-white">
              2. Fonctionnement de la saison
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              La saison sportive suit généralement le calendrier scolaire, de la rentrée à la fin du
              printemps / début d&apos;été, avec des temps forts (compétitions, shows, événements).
            </p>
            <ul className="mt-3 space-y-1 text-[13px] text-slate-200">
              <li>• Répartition des athlètes par équipe selon l&apos;âge et le niveau.</li>
              <li>• Planning d&apos;entraînement défini en début de saison.</li>
              <li>• Communication des dates importantes dès que possible.</li>
              <li>• Engagement sur la saison pour garantir la stabilité des équipes.</li>
            </ul>
          </div>

          {/* 3. Entraînements */}
          <div className="rounded-2xl border border-emerald-500/30 bg-slate-900/70 p-5 shadow-md shadow-emerald-900/40">
            <h2 className="text-base font-semibold text-white">
              3. Entraînements : organisation pratique
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Les entraînements sont le cœur de la progression des athlètes. Quelques repères
              permettent de garantir de bonnes conditions de travail.
            </p>
            <ul className="mt-3 space-y-1 text-[13px] text-slate-200">
              <li>• Arrivée en avance pour être prêts à l&apos;heure de début.</li>
              <li>• Tenue adaptée, cheveux attachés, aucun bijou pendant la séance.</li>
              <li>• Une gourde d&apos;eau nominative est recommandée.</li>
              <li>• Prévenir le coach / le club en cas d&apos;absence ou de retard.</li>
            </ul>
          </div>
        </section>

        {/* 4. Inscriptions */}
        <section className="mb-8 rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-md shadow-black/40">
          <h2 className="text-base font-semibold text-white">
            4. Essais, inscriptions & dossier athlète
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Le club fonctionne avec une phase d&apos;essai, suivie d&apos;une inscription complète
            comprenant un dossier administratif et, selon la réglementation, les documents médicaux nécessaires.
          </p>

          <div className="mt-4 grid gap-5 md:grid-cols-3 text-[13px] text-slate-200">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-300">
                Demande d&apos;essai
              </h3>
              <ul className="mt-2 space-y-1">
                <li>• Formulaire de demande d&apos;essai transmis par le club.</li>
                <li>• Orientation vers l&apos;équipe la plus adaptée.</li>
                <li>• Séance d&apos;essai sur un créneau défini.</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-300">
                Validation & inscription
              </h3>
              <ul className="mt-2 space-y-1">
                <li>• Retour du coach après l&apos;essai.</li>
                <li>• Dossier d&apos;inscription (fiche athlète, autorisations, etc.).</li>
                <li>• Paiement de la cotisation selon les modalités annoncées.</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-300">
                Suivi du dossier
              </h3>
              <ul className="mt-2 space-y-1">
                <li>• Rappel des pièces manquantes si besoin.</li>
                <li>• Mise à jour des informations en cas de changement (coordonnées, santé…).</li>
                <li>• Possibilité, à terme, de suivre certaines infos via l&apos;espace en ligne.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 5 & 6 : Uniformes + Compétitions */}
        <section className="mb-8 grid gap-6 md:grid-cols-2">
          {/* Uniformes */}
          <div className="rounded-2xl border border-pink-500/30 bg-gradient-to-br from-pink-900/40 via-slate-900/70 to-slate-950/80 p-5 shadow-md shadow-pink-900/40">
            <h2 className="text-base font-semibold text-white">
              5. Uniformes, tenues & image du club
            </h2>
            <p className="mt-2 text-sm text-slate-200">
              Les tenues font partie de l&apos;identité du club et de la présentation en compétition.
              Les consignes sont communiquées par équipe en début de saison.
            </p>
            <ul className="mt-3 space-y-1 text-[13px] text-slate-100">
              <li>• Tenue d&apos;entraînement confortable, adaptée à la pratique.</li>
              <li>• Uniforme de compétition propre à chaque équipe.</li>
              <li>• Coiffure et éventuel maquillage harmonisés pour les compétitions.</li>
              <li>• Merci de respecter les consignes sur l&apos;apparence les jours de show / compétition.</li>
            </ul>
          </div>

          {/* Compétitions */}
          <div className="rounded-2xl border border-violet-500/30 bg-slate-900/70 p-5 shadow-md shadow-violet-900/40">
            <h2 className="text-base font-semibold text-white">
              6. Compétitions, shows & déplacements
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Selon le niveau de l&apos;équipe, les athlètes peuvent participer à des compétitions officielles,
              des shows ou des événements ponctuels.
            </p>
            <ul className="mt-3 space-y-1 text-[13px] text-slate-200">
              <li>• Dates annoncées dès que possible pour permettre l&apos;organisation familiale.</li>
              <li>• Présence importante aux entraînements précédant une compétition.</li>
              <li>• Informations détaillées envoyées avant chaque événement (horaires, lieu, matériel à prévoir).</li>
              <li>• Modalités de transport (covoiturage, déplacement club ou individuel) précisées au cas par cas.</li>
            </ul>
          </div>
        </section>

        {/* 7 & 8 : Communication + Règles */}
        <section className="mb-8 rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-md shadow-black/40">
          <h2 className="text-base font-semibold text-white">
            7. Communication avec le club & 8. Règles de vie
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Une bonne communication et le respect d&apos;un cadre commun sont indispensables pour
            le bon fonctionnement du club et le bien-être de tous.
          </p>

          <div className="mt-4 grid gap-5 md:grid-cols-3 text-[13px] text-slate-200">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-300">
                Communication
              </h3>
              <ul className="mt-2 space-y-1">
                <li>• Utiliser les canaux indiqués par le club (mail, groupes d&apos;équipe…).</li>
                <li>• Prévenir systématiquement en cas d&apos;absence ou de difficulté.</li>
                <li>• Éviter d&apos;interrompre les coachs pendant les séances (sauf urgence).</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                Respect & attitude
              </h3>
              <ul className="mt-2 space-y-1">
                <li>• Respect des coachs, des athlètes, des familles et des installations.</li>
                <li>• Tolérance zéro pour tout comportement discriminatoire ou agressif.</li>
                <li>• Encourager une attitude positive autour du sport et de la progression.</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                Présence & engagement
              </h3>
              <ul className="mt-2 space-y-1">
                <li>• Une équipe repose sur la présence de chacun à l&apos;entraînement.</li>
                <li>• Prévenir le plus tôt possible en cas d&apos;empêchement.</li>
                <li>• Les engagements pris en début de saison sont importants pour la cohésion du groupe.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 9. Contact */}
        <section className="rounded-2xl border border-sky-500/30 bg-slate-900/80 p-5 text-sm shadow-md shadow-sky-900/40">
          <h2 className="text-base font-semibold text-white">
            9. Questions & contact
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Pour toute question complémentaire ou situation particulière, n&apos;hésitez pas à prendre
            contact avec le club. Nous ferons au mieux pour vous répondre dans les meilleurs délais.
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
                Les coordonnées spécifiques (référent, coach, bureau) sont communiquées en début de saison.
              </p>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-300">
                Espaces en ligne
              </h3>
              <ul className="mt-2 space-y-1">
                <li>• Accès membre pour les informations réservées aux familles.</li>
                <li>• Groupes par équipe pour les informations pratiques au quotidien.</li>
                <li>• Documents et rappels communiqués au fil de la saison.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}