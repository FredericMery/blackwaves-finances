export default function CompetitionsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-bw-dark via-black to-bw-navy text-white">
      <section className="max-w-6xl mx-auto px-4 pt-12 pb-20">
        {/* HERO / INTRO */}
        <header className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bw-cyan/80">
            Compétitions & résultats
          </p>
          <h1 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight">
            Les compétitions des Black Waves
          </h1>
          <p className="mt-3 text-sm md:text-base text-bw-light/80 max-w-3xl">
            Au fil des saisons, les Black Waves participent aux compétitions 
            officielles de la FFFA, aux compétitions SACD ainsi qu&apos;à des 
            événements privés. Cette page mettra en avant les résultats et les 
            moments forts, avec des galeries photos dès que les droits à l&apos;image 
            seront validés.
          </p>
        </header>

        {/* SAISON 2024–2025 (structure prête, résultats à compléter) */}
        <section className="mb-10">
          <div className="flex items-baseline justify-between gap-2 mb-4">
            <h2 className="text-lg md:text-xl font-semibold">
              Saison 2024–2025
            </h2>
            <p className="text-[11px] text-bw-light/60">
              (Calendrier & résultats à compléter au fil de la saison)
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 text-sm">
            {/* FFFA 24-25 */}
            <div className="rounded-2xl border border-white/12 bg-white/5 p-4 md:p-5 flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bw-cyan">
                FFFA · Compétitions officielles
              </p>
              <p className="text-bw-light/85">
                Participation aux étapes officielles FFFA (régional, national)
                avec les équipes compétitives.
              </p>
              <div className="text-[11px] text-bw-light/65">
                Résultats détaillés à venir.
              </div>

              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-md border border-dashed border-white/25 bg-black/30 flex items-center justify-center text-[9px] text-bw-light/60"
                  >
                    Photo à venir
                  </div>
                ))}
              </div>
            </div>

            {/* SACD 24-25 */}
            <div className="rounded-2xl border border-white/12 bg-white/5 p-4 md:p-5 flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bw-cyan">
                SACD · Compétitions
              </p>
              <p className="text-bw-light/85">
                Engagement sur les compétitions SACD de la saison, avec une mise
                en avant des chorégraphies et du travail d&apos;équipe.
              </p>
              <div className="text-[11px] text-bw-light/65">
                Résultats détaillés à venir.
              </div>

              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-md border border-dashed border-white/25 bg-black/30 flex items-center justify-center text-[9px] text-bw-light/60"
                  >
                    Photo à venir
                  </div>
                ))}
              </div>
            </div>

            {/* Privées 24-25 */}
            <div className="rounded-2xl border border-white/12 bg-white/5 p-4 md:p-5 flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bw-cyan">
                Compétitions privées & événements
              </p>
              <p className="text-bw-light/85">
                Participation à des événements privés, showcases ou invitations,
                pour faire vivre le cheer en dehors du strict cadre fédéral.
              </p>
              <div className="text-[11px] text-bw-light/65">
                Dates & lieux à venir.
              </div>

              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-md border border-dashed border-white/25 bg-black/30 flex items-center justify-center text-[9px] text-bw-light/60"
                  >
                    Photo à venir
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SAISON 2023–2024 – CHAMPION DE FRANCE MIS EN AVANT */}
        <section className="mb-10">
          <div className="flex items-baseline justify-between gap-2 mb-4">
            <h2 className="text-lg md:text-xl font-semibold flex items-center gap-2">
              Saison 2023–2024
              <span className="text-sm px-2 py-0.5 rounded-full bg-yellow-400/10 border border-yellow-400/70 text-yellow-200 flex items-center gap-1">
                🏆 Champion de France
              </span>
            </h2>
            <p className="text-[11px] text-bw-light/60">
              Résultats marquants de la saison
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 text-sm">
            {/* FFFA 23-24 – Championnat de France */}
            <div className="relative rounded-2xl border border-yellow-400/70 bg-gradient-to-b from-bw-navy via-black to-bw-navy p-4 md:p-5 shadow-[0_0_40px_rgba(250,204,21,0.45)] overflow-hidden">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.18),_transparent_60%)]" />
              <div className="relative flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-yellow-300">
                  FFFA · Championnat de France
                </p>
                <p className="text-sm font-semibold text-white">
                  Titre de champion de France 2024
                </p>
                <p className="text-bw-light/85 text-[13px] leading-relaxed">
                  Saison historique pour les Black Waves avec un titre de 
                  <span className="font-semibold text-white">
                    {" "}champion de France
                  </span>{" "}
                  lors du championnat FFFA. Un aboutissement du travail des 
                  athlètes, des coachs et des familles.
                </p>
                <p className="text-[11px] text-bw-light/65 italic">
                  (Catégorie & détails à préciser ici, ainsi que le lieu exact
                  et la date.)
                </p>

                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-md border border-yellow-300/80 bg-black/40 flex items-center justify-center text-[9px] text-yellow-100/90"
                    >
                      Photo podium / équipe
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SACD 23-24 */}
            <div className="rounded-2xl border border-white/12 bg-white/5 p-4 md:p-5 flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bw-cyan">
                SACD · Compétitions
              </p>
              <p className="text-bw-light/85">
                Participation aux compétitions SACD de la saison 
                (résultats à détailler : classements, catégories, prix spéciaux, etc.).
              </p>
              <div className="text-[11px] text-bw-light/65">
                Résultats précis à compléter.
              </div>

              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-md border border-dashed border-white/25 bg-black/30 flex items-center justify-center text-[9px] text-bw-light/60"
                  >
                    Photo à venir
                  </div>
                ))}
              </div>
            </div>

            {/* Privées 23-24 */}
            <div className="rounded-2xl border border-white/12 bg-white/5 p-4 md:p-5 flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bw-cyan">
                Compétitions privées & shows
              </p>
              <p className="text-bw-light/85">
                Shows, démonstrations, compétitions privées : la saison a été
                marquée par plusieurs sorties qui ont permis de faire rayonner
                les Black Waves.
              </p>
              <div className="text-[11px] text-bw-light/65">
                Détails (dates, lieux) à compléter.
              </div>

              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-md border border-dashed border-white/25 bg-black/30 flex items-center justify-center text-[9px] text-bw-light/60"
                  >
                    Photo à venir
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SAISON 2022–2023 */}

        <section className="mb-10">
          <div className="flex items-baseline justify-between gap-2 mb-4">
            <h2 className="text-lg md:text-xl font-semibold">
              Saison 2022–2023
            </h2>
            <p className="text-[11px] text-bw-light/60">
              Premières participations officielles
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 text-sm">
            {/* FFFA 22-23 */}
            <div className="rounded-2xl border border-white/12 bg-white/5 p-4 md:p-5 flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bw-cyan">
                FFFA · Premiers championnats
              </p>
              <p className="text-bw-light/85">
                Première participation aux compétitions FFFA, découverte du 
                circuit officiel et mise en place des routines de compétition.
              </p>
              <div className="text-[11px] text-bw-light/65">
                Résultats à préciser (classements, catégories).
              </div>

              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-md border border-dashed border-white/25 bg-black/30 flex items-center justify-center text-[9px] text-bw-light/60"
                  >
                    Photo à venir
                  </div>
                ))}
              </div>
            </div>

            {/* SACD 22-23 */}
            <div className="rounded-2xl border border-white/12 bg-white/5 p-4 md:p-5 flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bw-cyan">
                SACD · Débuts en circuit
              </p>
              <p className="text-bw-light/85">
                Premiers pas sur les compétitions SACD, avec des objectifs de 
                prise d&apos;expérience et de construction des routines.
              </p>
              <div className="text-[11px] text-bw-light/65">
                Résultats à compléter.
              </div>

              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-md border border-dashed border-white/25 bg-black/30 flex items-center justify-center text-[9px] text-bw-light/60"
                  >
                    Photo à venir
                  </div>
                ))}
              </div>
            </div>

            {/* Privées 22-23 */}
            <div className="rounded-2xl border border-white/12 bg-white/5 p-4 md:p-5 flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-bw-cyan">
                Événements privés
              </p>
              <p className="text-bw-light/85">
                Participation à des événements privés, galas et démonstrations
                qui ont permis de faire découvrir le cheer à un large public.
              </p>
              <div className="text-[11px] text-bw-light/65">
                Lieux & moments forts à compléter.
              </div>

              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-md border border-dashed border-white/25 bg-black/30 flex items-center justify-center text-[9px] text-bw-light/60"
                  >
                    Photo à venir
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* NOTE DE BAS DE PAGE */}
        <p className="mt-6 text-[11px] text-bw-light/60">
          (Les photos officielles et les résultats détaillés seront ajoutés au fur et 
          à mesure, dès validation des droits à l&apos;image et des informations 
          communiquées par la fédération et les organisateurs.)
        </p>
      </section>
    </div>
  );
}
