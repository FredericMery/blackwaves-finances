"use client";

import Image from "next/image";

type Season = {
  id: string;
  sortYear: number;           // pour trier (plus grand = plus récent)
  seasonLabel: string;        // ex : "2024-2025"
  yearBadge: string;          // ce qui apparaît dans la pastille (ex : "24-25")
  title: string;              // titre de la saison
  palmares: string;           // palmarès principal (visible partout)
  description?: string;       // texte détaillé (visible sur les 4 dernières saisons uniquement)
  photoUrl?: string | null;
  highlight?: boolean;
};

const seasons: Season[] = [
  {
    id: "2024-2025",
    sortYear: 2025,
    seasonLabel: "2024-2025",
    yearBadge: "24-25",
    title: "Saison 2024-2025",
    palmares: "Deux premières places pour les Juniors à la compétition de Brive.",
    description:
      "Saison en cours marquée par une très belle dynamique pour les Juniors : deux premières places remportées à Brive, un engagement fort des athlètes et une montée en intensité sur les entraînements. Le club consolide son organisation tout en gardant l’esprit famille.",
    photoUrl: null,
    highlight: false,
  },
  {
    id: "2023-2024",
    sortYear: 2024,
    seasonLabel: "2023-2024",
    yearBadge: "23-24",
    title: "Saison 2023-2024",
    palmares: "Champion de France cadet 2024.",
    description:
      "Saison historique pour Black Waves : l’équipe cadet décroche le titre de champion de France 2024. Un effectif soudé, un staff structuré et une exigence de travail qui propulse le club parmi les références nationales.",
    photoUrl: null,
    highlight: true,
  },
  {
    id: "2022-2023",
    sortYear: 2023,
    seasonLabel: "2022-2023",
    yearBadge: "22-23",
    title: "Saison 2022-2023",
    palmares: "Podiums réguliers en compétition régionale et nationale.",
    description:
      "Montée en puissance sur les compétitions, structuration des catégories jeunes, amélioration des plannings d’entraînement et du suivi individuel des athlètes.",
    photoUrl: null,
  },
  {
    id: "2021-2022",
    sortYear: 2022,
    seasonLabel: "2021-2022",
    yearBadge: "21-22",
    title: "Saison 2021-2022",
    palmares: "Confirmation du niveau des équipes et premières grosses performances d’ensemble.",
    description:
      "Stabilisation des équipes, premiers gros résultats réguliers, mise en place d’outils pour suivre progression, présence et objectifs des athlètes.",
    photoUrl: null,
  },
  {
    id: "2020-2021",
    sortYear: 2021,
    seasonLabel: "2020-2021",
    yearBadge: "20-21",
    title: "Saison 2020-2021",
    palmares: "Reprise progressive après la période COVID.",
    description:
      "Relance des entraînements, retour progressif sur les tapis et reconstruction des automatismes collectifs.",
    photoUrl: null,
  },
  {
    id: "2019-2020",
    sortYear: 2020,
    seasonLabel: "2019-2020",
    yearBadge: "19-20",
    title: "Saison 2019-2020",
    palmares: "Premiers résultats marquants en compétition officielle.",
    description:
      "Les bases du club moderne se mettent en place, avec une vraie ambition sportive et un projet sur plusieurs années.",
    photoUrl: null,
  },
];

export default function HistoryPage() {
  // Tri décroissant
  const sorted = [...seasons].sort((a, b) => b.sortYear - a.sortYear);
  const detailed = sorted.slice(0, 4);     // 4 dernières saisons
  const older = sorted.slice(4);           // le reste

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black text-white px-6 md:px-20 py-16">
      {/* HEADER */}
      <header className="mb-12 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3 text-blue-400">
          L’histoire de Black Waves
        </h1>
        <p className="text-slate-300 text-lg">
          Saison après saison, le club grandit, se structure et progresse sur
          les circuits régionaux et nationaux. Voici les dernières saisons en
          détail, suivies du palmarès des années précédentes.
        </p>
      </header>

      {/* TIMELINE - 4 DERNIÈRES SAISONS */}
      <section className="relative max-w-5xl mb-16">
        {/* Ligne verticale */}
        <div className="absolute left-3 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/80 via-blue-700/40 to-transparent md:left-4" />

        <div className="space-y-10">
          {detailed.map((season) => {
            const isHighlight = season.highlight;

            return (
              <div key={season.id} className="relative pl-10 md:pl-12">
                {/* Pastille année */}
                <div
                  className={`absolute left-0 top-1 w-8 h-8 rounded-full border-2 flex items-center justify-center md:left-1
                    ${
                      isHighlight
                        ? "border-cyan-400 bg-blue-600 shadow-[0_0_20px_rgba(56,189,248,0.7)]"
                        : "border-blue-500 bg-slate-900"
                    }
                  `}
                >
                  <span className="text-[10px] font-semibold text-cyan-100">
                    {season.yearBadge}
                  </span>
                </div>

                {/* Carte saison détaillée */}
                <div
                  className={`rounded-2xl border shadow-md overflow-hidden backdrop-blur-sm
                    ${
                      isHighlight
                        ? "border-cyan-400/70 bg-gradient-to-r from-blue-900/80 via-slate-900/90 to-slate-950/90"
                        : "border-blue-800/40 bg-gradient-to-r from-slate-900/80 via-slate-950/80 to-black/80"
                    }
                  `}
                >
                  <div className="p-5 md:p-6 flex flex-col md:flex-row gap-5 md:gap-8">
                    {/* Texte */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-1">
                        <span className="inline-flex items-center rounded-full border border-blue-500/70 bg-blue-900/40 px-3 py-0.5 text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
                          Saison {season.seasonLabel}
                        </span>
                        {isHighlight && (
                          <span className="inline-flex items-center rounded-full bg-cyan-400 text-black px-3 py-0.5 text-xs font-semibold uppercase tracking-[0.15em]">
                            🏆 Champion de France cadet
                          </span>
                        )}
                      </div>

                      <h2 className="text-xl md:text-2xl font-bold text-blue-200">
                        {season.title}
                      </h2>

                      <p className="mt-2 text-sm font-semibold text-blue-300">
                        {season.palmares}
                      </p>

                      {season.description && (
                        <p className="text-slate-200 mt-3 leading-relaxed">
                          {season.description}
                        </p>
                      )}
                    </div>

                    {/* Photo */}
                    <div className="w-full md:w-64 lg:w-72">
                      <div className="relative h-40 md:h-44 lg:h-48 rounded-xl overflow-hidden border border-blue-800/60 bg-slate-900/60">
                        {season.photoUrl ? (
                          <Image
                            src={season.photoUrl}
                            alt={season.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/40 via-blue-900/60 to-slate-900 flex items-center justify-center text-xs text-blue-50/80 px-4 text-center">
                            Ajoute une photo de la saison dans la base photos et
                            remplace <code className="text-[10px]">photoUrl</code>{" "}
                            dans le code.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* BLOC PALMARÈS - ANCIENNES SAISONS */}
      {older.length > 0 && (
        <section className="max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-bold text-blue-300 mb-4">
            Palmarès des saisons précédentes
          </h2>
          <p className="text-slate-300 mb-6">
            Un aperçu rapide des saisons antérieures, avec le palmarès principal
            de chaque année.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {older.map((season) => (
              <div
                key={season.id}
                className="rounded-xl border border-blue-800/40 bg-slate-950/70 px-4 py-3 shadow-sm"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="inline-flex items-center rounded-full bg-blue-900/60 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-200">
                    Saison {season.seasonLabel}
                  </span>
                  <span className="text-xs font-semibold text-blue-400">
                    {season.yearBadge}
                  </span>
                </div>
                <p className="text-sm font-semibold text-blue-100">
                  {season.title}
                </p>
                <p className="text-sm text-slate-300 mt-1">
                  {season.palmares}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
