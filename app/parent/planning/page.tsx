"use client";

export default function SonPlanningPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 pb-16">
      {/* En-tête */}
      <div className="mt-10 mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-blue-500">
            Espace parent
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mt-2">
            Planning de son équipe
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Visualisez les entraînements, compétitions et événements de l&apos;équipe de
            votre enfant.
          </p>
        </div>

        {/* Sélecteurs (pour plus tard : on branchera sur de vraies données) */}
        <div className="flex flex-wrap gap-2 text-xs">
          <select className="px-3 py-1.5 rounded-full border border-neutral-300 bg-white">
            <option>Mois en cours</option>
            <option>Mois précédent</option>
            <option>Mois suivant</option>
          </select>
          <select className="px-3 py-1.5 rounded-full border border-neutral-300 bg-white">
            <option>Equipe de mon enfant</option>
            <option>[Autre équipe 1]</option>
            <option>[Autre équipe 2]</option>
          </select>
        </div>
      </div>

      {/* Légende */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-600 mb-4">
        <span className="font-semibold text-neutral-800 mr-1">Légende :</span>
        <LegendDot className="bg-blue-500" label="Entraînement" />
        <LegendDot className="bg-purple-500" label="Compétition" />
        <LegendDot className="bg-emerald-500" label="Événement club" />
      </div>

      {/* Grille mensuelle simplifiée */}
      <div className="bg-white rounded-2xl shadow-md border border-neutral-200 p-4 md:p-6">
        {/* En-tête jours de la semaine */}
        <div className="grid grid-cols-7 text-[11px] font-semibold text-neutral-500 text-center mb-2">
          <span>Lun</span>
          <span>Mar</span>
          <span>Mer</span>
          <span>Jeu</span>
          <span>Ven</span>
          <span>Sam</span>
          <span>Dim</span>
        </div>

        {/* Cases du mois – ici, exemple statique de structure (à brancher plus tard sur la base) */}
        <div className="grid grid-cols-7 gap-1 text-[11px]">
          {Array.from({ length: 35 }).map((_, index) => {
            const dayNumber = index - 1; // juste pour simuler un décalage

            // On ajoute 3 exemples d'événements statiques pour montrer la mise en page
            const events: { label: string; type: "training" | "competition" | "club" }[] =
              [];

            if (dayNumber === 2) {
              events.push({ label: "Entraînement 18h30", type: "training" });
            }
            if (dayNumber === 6) {
              events.push({ label: "Compétition SACD", type: "competition" });
            }
            if (dayNumber === 10) {
              events.push({ label: "Événement club", type: "club" });
            }

            return (
              <div
                key={index}
                className="min-h-[70px] border border-neutral-100 rounded-md p-1.5 flex flex-col gap-1 bg-neutral-50"
              >
                <div className="text-[10px] text-neutral-500 mb-0.5">
                  {dayNumber > 0 && dayNumber <= 31 ? dayNumber : ""}
                </div>

                <div className="flex flex-col gap-0.5">
                  {events.map((ev, i) => (
                    <EventTag key={i} event={ev} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bas de page : infos pratiques */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className="bg-white rounded-2xl shadow-md border border-neutral-200 p-5 md:p-6">
          <h2 className="text-sm font-semibold text-neutral-800 mb-3">
            Conseils pour bien suivre le planning
          </h2>
          <ul className="text-xs text-neutral-600 space-y-2">
            <li>• Vérifiez régulièrement le planning, il peut évoluer en cours de saison.</li>
            <li>• En cas de modification importante, le club prévient également par message.</li>
            <li>• Arrivez 10 minutes avant le début de chaque entraînement.</li>
          </ul>
        </section>

        <section className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 rounded-2xl p-[2px] shadow-md">
          <div className="bg-white rounded-2xl h-full p-5 md:p-6 flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 mb-2">
                En lien avec ce planning
              </h2>
              <p className="text-xs text-neutral-600 mb-4">
                Accédez aux compétitions et posez vos questions au club si besoin.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <QuickLink href="/parent/competitions" label="Ses compétitions" />
              <QuickLink href="/parent/questions" label="Questions au club" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`w-3 h-3 rounded-full ${className}`} />
      <span>{label}</span>
    </span>
  );
}

function EventTag({
  event,
}: {
  event: { label: string; type: "training" | "competition" | "club" };
}) {
  const base =
    "inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-semibold text-white";
  let color = "bg-blue-500";

  if (event.type === "competition") color = "bg-purple-500";
  if (event.type === "club") color = "bg-emerald-500";

  return <span className={`${base} ${color}`}>{event.label}</span>;
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

