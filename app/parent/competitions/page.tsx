"use client";

export default function SesCompetitionsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 pb-16">
      {/* En-tête */}
      <div className="mt-10 mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-blue-500">
            Espace parent
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mt-2">
            Ses compétitions
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Retrouvez les compétitions prévues pour l&apos;équipe de votre enfant,
            ainsi que les résultats une fois les événements passés.
          </p>
        </div>

        {/* Filtres (statique pour l’instant) */}
        <div className="flex flex-wrap gap-2 text-xs">
          <select className="px-3 py-1.5 rounded-full border border-neutral-300 bg-white">
            <option>Saison en cours</option>
            <option>Saison précédente</option>
            <option>Saison suivante</option>
          </select>
          <select className="px-3 py-1.5 rounded-full border border-neutral-300 bg-white">
            <option>Toutes les compétitions</option>
            <option>FFFA</option>
            <option>SACD</option>
            <option>Compétitions privées</option>
          </select>
        </div>
      </div>

      {/* Bloc infos générales */}
      <section className="bg-white rounded-2xl shadow-md border border-neutral-200 p-5 md:p-6 mb-6">
        <h2 className="text-sm font-semibold text-neutral-800 mb-3">
          Calendrier de la saison
        </h2>
        <p className="text-xs text-neutral-600 leading-relaxed">
          Ci-dessous, vous trouverez les principales compétitions de la saison
          pour l&apos;équipe de votre enfant. Les horaires, lieux et informations
          pratiques seront mis à jour au fur et à mesure de la saison.
        </p>
      </section>

      {/* Liste des compétitions par catégorie */}
      <div className="space-y-6">
        {/* FFFA */}
        <CompetitionGroup title="Compétitions FFFA">
          <CompetitionCard
            date="[JJ/MM/AAAA]"
            name="[Nom de la compétition FFFA]"
            location="[Ville / Gymnase]"
            team="[Nom de l'équipe]"
            level="[Niveau / catégorie]"
            status="À venir"
            type="fffa"
          />
          <CompetitionCard
            date="[JJ/MM/AAAA]"
            name="[Nom de la compétition FFFA]"
            location="[Ville / Gymnase]"
            team="[Nom de l'équipe]"
            level="[Niveau / catégorie]"
            status="Résultat : [Place / Note]"
            type="fffa"
          />
        </CompetitionGroup>

        {/* SACD */}
        <CompetitionGroup title="Compétitions SACD">
          <CompetitionCard
            date="[JJ/MM/AAAA]"
            name="[Nom de la compétition SACD]"
            location="[Ville / Gymnase]"
            team="[Nom de l'équipe]"
            level="[Niveau / catégorie]"
            status="À venir"
            type="sacd"
          />
        </CompetitionGroup>

        {/* Privées */}
        <CompetitionGroup title="Compétitions privées">
          <CompetitionCard
            date="[JJ/MM/AAAA]"
            name="[Nom de la compétition privée]"
            location="[Ville / Gymnase]"
            team="[Nom de l'équipe]"
            level="[Niveau / catégorie]"
            status="À venir"
            type="private"
          />
        </CompetitionGroup>
      </div>

      {/* Bas de page */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className="bg-white rounded-2xl shadow-md border border-neutral-200 p-5 md:p-6">
          <h2 className="text-sm font-semibold text-neutral-800 mb-3">
            Informations pratiques
          </h2>
          <ul className="text-xs text-neutral-600 space-y-2">
            <li>• Les horaires précis de convocation sont communiqués par les coachs.</li>
            <li>• Prévoyez des temps de trajet suffisants, surtout pour les compétitions hors Marseille.</li>
            <li>• Le club précisera à l&apos;avance les modalités (transport, repas, tenue, etc.).</li>
          </ul>
        </section>

        <section className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 rounded-2xl p-[2px] shadow-md">
          <div className="bg-white rounded-2xl h-full p-5 md:p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 mb-2">
                En lien avec les compétitions
              </h2>
              <p className="text-xs text-neutral-600 mb-4">
                Consultez le planning ou contactez le club si vous avez des questions
                sur l&apos;organisation.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <QuickLink href="/parent/planning" label="Son planning" />
              <QuickLink href="/parent/questions" label="Questions au club" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function CompetitionGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-neutral-800 mb-3">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function CompetitionCard({
  date,
  name,
  location,
  team,
  level,
  status,
  type,
}: {
  date: string;
  name: string;
  location: string;
  team: string;
  level: string;
  status: string;
  type: "fffa" | "sacd" | "private";
}) {
  let color = "from-blue-600 to-blue-400";
  if (type === "sacd") color = "from-purple-600 to-pink-400";
  if (type === "private") color = "from-emerald-600 to-teal-400";

  return (
    <div className={`rounded-2xl p-[2px] bg-gradient-to-r ${color} shadow-md`}>
      <div className="bg-white rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wide">
            {date}
          </p>
          <h3 className="text-sm font-semibold text-neutral-900 mt-1">
            {name}
          </h3>
          <p className="text-xs text-neutral-600 mt-1">
            {location}
          </p>
          <p className="text-[11px] text-neutral-600 mt-1">
            Équipe : <span className="font-semibold text-neutral-900">{team}</span> — Niveau :{" "}
            <span className="font-semibold text-neutral-900">{level}</span>
          </p>
        </div>
        <div className="text-xs font-semibold text-right text-neutral-800">
          {status}
        </div>
      </div>
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
