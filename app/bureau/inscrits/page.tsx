"use client";

export default function InscritsPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 pb-16">
      {/* En-tête */}
      <div className="mt-10 mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-600">
            Espace bureau
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mt-2">
            Inscriptions & adhérents
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Consultez la liste des inscrits, l&apos;état des paiements et des licences.
          </p>
        </div>

        {/* Filtres (statique pour l’instant) */}
        <div className="flex flex-wrap gap-2 text-xs">
          <select className="px-3 py-1.5 rounded-full border border-neutral-300 bg-white">
            <option>Saison en cours</option>
            <option>Saison précédente</option>
          </select>
          <select className="px-3 py-1.5 rounded-full border border-neutral-300 bg-white">
            <option>Toutes les équipes</option>
            <option>Minimes</option>
            <option>Juniors</option>
            <option>Seniors</option>
          </select>
          <select className="px-3 py-1.5 rounded-full border border-neutral-300 bg-white">
            <option>Tous les statuts</option>
            <option>Payé</option>
            <option>En attente</option>
            <option>Échéancier</option>
          </select>
        </div>
      </div>

      {/* Tableau des inscrits (exemple) */}
      <div className="bg-white rounded-2xl shadow-md border border-neutral-200 p-5 md:p-6">
        <h2 className="text-sm font-semibold text-neutral-800 mb-3">
          Liste des inscrits (exemple de structure)
        </h2>
        <p className="text-[11px] text-neutral-500 mb-3">
          Plus tard, cette section pourra être reliée à la base de données des adhérents
          pour afficher la liste réelle.
        </p>

        <div className="overflow-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-neutral-200 text-left bg-neutral-50">
                <th className="py-2 px-2">Nom</th>
                <th className="py-2 px-2">Prénom</th>
                <th className="py-2 px-2">Équipe</th>
                <th className="py-2 px-2">Statut règlement</th>
                <th className="py-2 px-2">Licence</th>
                <th className="py-2 px-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Ligne 1 */}
              <tr className="border-b border-neutral-100">
                <td className="py-2 px-2">[Nom]</td>
                <td className="py-2 px-2">[Prénom]</td>
                <td className="py-2 px-2">[Équipe X]</td>
                <td className="py-2 px-2">
                  <StatusBadge type="paid" />
                </td>
                <td className="py-2 px-2">
                  <LicenseBadge status="ok" />
                </td>
                <td className="py-2 px-2">
                  <ActionButtons />
                </td>
              </tr>
              {/* Ligne 2 */}
              <tr className="border-b border-neutral-100">
                <td className="py-2 px-2">[Nom]</td>
                <td className="py-2 px-2">[Prénom]</td>
                <td className="py-2 px-2">[Équipe Y]</td>
                <td className="py-2 px-2">
                  <StatusBadge type="pending" />
                </td>
                <td className="py-2 px-2">
                  <LicenseBadge status="missing" />
                </td>
                <td className="py-2 px-2">
                  <ActionButtons />
                </td>
              </tr>
              {/* Ligne 3 */}
              <tr className="border-b border-neutral-100">
                <td className="py-2 px-2">[Nom]</td>
                <td className="py-2 px-2">[Prénom]</td>
                <td className="py-2 px-2">[Équipe Z]</td>
                <td className="py-2 px-2">
                  <StatusBadge type="installment" />
                </td>
                <td className="py-2 px-2">
                  <LicenseBadge status="in_progress" />
                </td>
                <td className="py-2 px-2">
                  <ActionButtons />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bas de page */}
      <div className="mt-8 bg-white rounded-2xl shadow-md border border-neutral-200 p-5 md:p-6 text-xs text-neutral-600">
        <h2 className="text-sm font-semibold text-neutral-800 mb-3">
          Idées d&apos;évolution
        </h2>
        <ul className="space-y-2">
          <li>• Lier cette liste à une table Supabase &quot;athletes&quot;.</li>
          <li>• Pouvoir filtrer par équipe, statut de paiement, licence.</li>
          <li>• Ouvrir une fiche détaillée pour modifier les informations d&apos;un athlète.</li>
          <li>• Exporter la liste au format Excel / CSV pour la comptabilité.</li>
        </ul>
      </div>
    </div>
  );
}

function StatusBadge({ type }: { type: "paid" | "pending" | "installment" }) {
  if (type === "paid") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-700 font-semibold">
        Payé
      </span>
    );
  }
  if (type === "pending") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-700 font-semibold">
        En attente
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-700 font-semibold">
      Échéancier
    </span>
  );
}

function LicenseBadge({
  status,
}: {
  status: "ok" | "missing" | "in_progress";
}) {
  if (status === "ok") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
        Licence OK
      </span>
    );
  }
  if (status === "missing") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
        Licence manquante
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
        En cours
    </span>
  );
}

function ActionButtons() {
  return (
    <div className="flex flex-wrap gap-1">
      <button className="px-2 py-1 rounded-full bg-neutral-100 text-[10px] text-neutral-800 hover:bg-neutral-200">
        Voir fiche
      </button>
      <button className="px-2 py-1 rounded-full bg-emerald-600 text-[10px] text-white hover:bg-emerald-700">
        Mettre à jour
      </button>
    </div>
  );
}
