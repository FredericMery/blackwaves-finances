"use client";

export default function SonEquipePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 pb-16">
      {/* Titre */}
      <div className="mt-10 mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-blue-500">
          Espace parent
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mt-2">
          L&apos;équipe de mon enfant
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          Informations sur l’équipe, les coachs et les entraînements.
        </p>
      </div>

      {/* Bloc principal */}
      <div className="grid gap-6 md:grid-cols-[1.1fr,0.9fr]">
        {/* Infos équipe */}
        <section className="bg-white rounded-2xl shadow-md border border-neutral-200 p-5 md:p-6">
          <h2 className="text-sm font-semibold text-neutral-800 mb-4">
            Informations sur l&apos;équipe
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <InfoItem label="Nom de l'équipe" value="[Nom de l'équipe]" />
            <InfoItem label="Catégorie" value="[Minime / Junior / Senior]" />
            <InfoItem label="Niveau" value="[Niveau 1 / 2 / 3...]" />
            <InfoItem label="Saison" value="[Saison 20XX-20XX]" />
            <InfoItem label="Nombre d'athlètes" value="[XX]" />
            <InfoItem label="Objectif de la saison" value="[Développement / Performance]" />
          </div>

          <div className="mt-6 border-t border-dashed border-neutral-200 pt-4">
            <h3 className="text-xs font-semibold text-neutral-700 mb-2">
              Esprit de l&apos;équipe
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              [Description de l&apos;équipe : ambiance, valeurs, état d&apos;esprit, niveau de
              compétition, points forts (solidarité, travail, progression, etc.).]
            </p>
          </div>
        </section>

        {/* Coachs & entraînements */}
        <section className="bg-white rounded-2xl shadow-md border border-neutral-200 p-5 md:p-6">
          <h2 className="text-sm font-semibold text-neutral-800 mb-4">
            Coachs & entraînements
          </h2>

          {/* Coachs */}
          <div className="space-y-3 text-sm mb-5">
            <div>
              <p className="text-xs font-semibold text-neutral-700 mb-1">
                Coach principal
              </p>
              <p className="text-sm text-neutral-900">[Nom / Prénom du coach]</p>
              <p className="text-xs text-neutral-700 mt-1">
                E-mail : <span className="text-neutral-900">[adresse@email.com]</span>
              </p>
            </div>

            <div className="border-t border-dashed border-neutral-200 pt-3">
              <p className="text-xs font-semibold text-neutral-700 mb-1">
                Assistant coach (optionnel)
              </p>
              <p className="text-sm text-neutral-900">[Nom / Prénom]</p>
              <p className="text-xs text-neutral-700 mt-1">
                E-mail : <span className="text-neutral-900">[adresse@email.com]</span>
              </p>
            </div>
          </div>

          {/* Entraînements */}
          <div className="border-t border-dashed border-neutral-200 pt-4">
            <h3 className="text-xs font-semibold text-neutral-700 mb-2">
              Jours & lieux d&apos;entraînement
            </h3>
            <ul className="space-y-2 text-xs text-neutral-700">
              <li>
                <span className="font-semibold text-neutral-900">[Jour 1]</span> – [Horaires] – [Gymnase Dromel / Cluny]
              </li>
              <li>
                <span className="font-semibold text-neutral-900">[Jour 2]</span> – [Horaires] – [Gymnase Dromel / Cluny]
              </li>
              <li className="text-[11px] text-neutral-500 mt-1">
                Merci de respecter les horaires d&apos;arrivée et de sortie afin de faciliter
                le travail des coachs et la sécurité des athlètes.
              </li>
            </ul>
          </div>
        </section>
      </div>

      {/* Bas de page : rappels & liens */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className="bg-white rounded-2xl shadow-md border border-neutral-200 p-5 md:p-6">
          <h2 className="text-sm font-semibold text-neutral-800 mb-3">
            Rappels importants pour la saison
          </h2>
          <ul className="text-xs text-neutral-600 space-y-2">
            <li>• Arriver 10 minutes avant le début de l&apos;entraînement.</li>
            <li>• Prévoir une bouteille d&apos;eau, une tenue adaptée et des baskets propres.</li>
            <li>• Prévenir le coach en cas d&apos;absence ou de retard.</li>
            <li>• Respecter les consignes de sécurité données par le staff.</li>
          </ul>
        </section>

        <section className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 rounded-2xl p-[2px] shadow-md">
          <div className="bg-white rounded-2xl h-full p-5 md:p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 mb-2">
                En lien avec cette équipe
              </h2>
              <p className="text-xs text-neutral-600 mb-4">
                Accédez rapidement au planning et aux compétitions de l&apos;équipe.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <QuickLink href="/parent/planning" label="Planning de l'équipe" />
              <QuickLink href="/parent/competitions" label="Ses compétitions" />
              <QuickLink href="/parent/questions" label="Contacter le club" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className="text-sm text-neutral-900 mt-0.5">{value}</p>
    </div>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="text-xs px-3 py-1.5 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
    >
      {label}
    </a>
  );
}
