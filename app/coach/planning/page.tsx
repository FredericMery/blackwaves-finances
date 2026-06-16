export default function CoachPlanningPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-10 space-y-6">
      <header>
        <h1 className="text-3xl font-bold mb-2">Mon planning</h1>
        <p className="text-sm text-bw-light/80">
          Planifiez et ajustez les entraînements de votre équipe.
        </p>
      </header>

      <section className="rounded-2xl bg-black/40 border border-white/10 p-5">
        <p className="text-sm text-bw-light/80">
          Ici on viendra brancher le planning interactif pour que le coach puisse ajouter / modifier
          ses créneaux d’entraînement (lié à la table des événements).
        </p>
      </section>
    </main>
  );
}

