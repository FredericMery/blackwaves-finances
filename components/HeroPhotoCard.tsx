"use client";

import { useEffect, useState } from "react";
import ResponsiveImage from "./ResponsiveImage";

type Photo = {
  id: string;
  url: string;
  title: string | null;
  section: string | null;
  description: string | null;
};

type HeroPhotoCardProps = {
  photos: Photo[];
};

export function HeroPhotoCard({ photos }: HeroPhotoCardProps) {
  const [index, setIndex] = useState(0);

  // Rotation automatique toutes les 4 secondes
  useEffect(() => {
    if (!photos || photos.length <= 1) return;

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % photos.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [photos]);

  const hasPhotos = photos && photos.length > 0;
  const current = hasPhotos ? photos[index] : null;

  return (
    <div className="w-full">
      <div className="relative mx-auto max-w-xl">
        {/* Halo bleu / violet autour de la photo */}
        <div className="pointer-events-none absolute -inset-2 rounded-[2.2rem] bg-gradient-to-tr from-blue-500 via-cyan-400 to-indigo-500 opacity-70 blur-xl" />

        <div className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950 shadow-2xl shadow-slate-950/80">
          {/* Image très grande */}
          <div className="w-full h-72 sm:h-80 lg:h-96 bg-slate-900 relative">
            {current ? (
              <ResponsiveImage
                src={current.url}
                alt={current.title ?? "Black Waves Cheerleading"}
                fill
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center px-6 text-center">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Visuel à venir
                </div>
                <p className="text-xs text-slate-300 max-w-xs">
                  Ajoute des photos dans{" "}
                  <span className="font-semibold text-pink-300">
                    Bureau &gt; Gestion des photos
                  </span>{" "}
                  pour alimenter le bandeau d’accueil.
                </p>
              </div>
            )}
          </div>

          {/* Légende + indicateurs en bas de la photo */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0">
            <div className="bg-gradient-to-t from-slate-950/95 via-slate-950/80 to-transparent pt-10 pb-4 px-5">
              <div className="flex items-end justify-between gap-3">
                <div className="max-w-xs">
                  <p className="text-[11px] uppercase tracking-[0.26em] text-pink-300 mb-1">
                    Black Waves · Inside
                  </p>
                  <h3 className="text-sm font-semibold text-slate-50 line-clamp-2">
                    {current?.title ?? "Compétitions, entraînements, coulisses du club"}
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-300 line-clamp-2">
                    {current?.description ??
                      "Instantanés de la vie du club : équipes, entraînements et compétitions."}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {/* Indicateurs de slide */}
                  {photos.length > 1 && (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {photos.map((p, i) => (
                          <span
                            key={p.id}
                            className={[
                              "h-1.5 w-4 rounded-full transition-all",
                              i === index
                                ? "bg-pink-400"
                                : "bg-slate-600/70",
                            ].join(" ")}
                          />
                        ))}
                      </div>
                      <span className="text-[9px] uppercase tracking-[0.16em] text-slate-200 bg-slate-900/80 px-2 py-0.5 rounded-full border border-slate-600/70 backdrop-blur">
                        Slide auto
                      </span>
                    </div>
                  )}

                  {current?.section && (
                    <span className="inline-flex items-center rounded-full bg-pink-500/15 border border-pink-400/60 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.18em] text-pink-300">
                      {current.section}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>      
    </div>
  );
}
