"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Block = {
  key: string;
  title: string | null;
  content_md: string;
  ordre: number;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/* --------------------------- Utils --------------------------- */

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

function uniq(arr: string[]) {
  const s = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    if (!x) continue;
    if (s.has(x)) continue;
    s.add(x);
    out.push(x);
  }
  return out;
}

const FALLBACKS = [
  // ✅ fallback absolu (si jamais “site” est vide) : on force des placeholders visuels cohérents
  // (pas d'appel externe)
  "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#0b1220"/>
            <stop offset="0.6" stop-color="#0f172a"/>
            <stop offset="1" stop-color="#e0f2fe"/>
          </linearGradient>
          <radialGradient id="r" cx="25%" cy="15%" r="60%">
            <stop offset="0" stop-color="rgba(56,189,248,0.35)"/>
            <stop offset="1" stop-color="rgba(0,0,0,0)"/>
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)"/>
        <rect width="100%" height="100%" fill="url(#r)"/>
        <text x="70" y="120" fill="rgba(255,255,255,0.92)" font-family="Arial" font-size="48" font-weight="700">
          Black Waves
        </text>
        <text x="70" y="180" fill="rgba(255,255,255,0.72)" font-family="Arial" font-size="22">
          Photo manquante — ajoute des images dans photos/site
        </text>
      </svg>`
    ),
];

function pickNWithFallback(all: string[], needed: number) {
  const base = uniq(all);
  const fb = [...FALLBACKS];

  const out: string[] = [];
  for (let i = 0; i < needed; i++) {
    out.push(base[i] || fb[i % fb.length]);
  }
  return out;
}

/**
 * ✅ photos depuis la galerie validée uniquement:
 * bucket = photos, folder = site
 *
 * ⚠️ On ne charge qu'un petit lot (batch) puis on shuffle et on prend seulement ce dont on a besoin.
 */
async function fetchApprovedSitePhotosBatch(batch = 80): Promise<string[]> {
  const bucket = "photos";
  const folder = "site";

  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    limit: batch,
    sortBy: { column: "name", order: "desc" },
  });

  if (error || !data?.length) return [];

  const urls: string[] = [];
  for (const file of data) {
    if (!file?.name) continue;
    if ((file.name || "").endsWith("/")) continue;
    // supabase list peut aussi contenir des "folders" (sans id). On filtre:
    if (!file.id) continue;

    const path = `${folder}/${file.name}`;
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    if (pub?.publicUrl) urls.push(pub.publicUrl);
  }

  return urls;
}

/* --------------------------- UI bits “wow” --------------------------- */

type IconName =
  | "wave"
  | "trophy"
  | "calendar"
  | "users"
  | "target"
  | "shield"
  | "spark"
  | "check"
  | "star";

function Icon({ name }: { name: IconName }) {
  const common = "h-5 w-5";
  switch (name) {
    case "wave":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M2 15c2.2-2.2 4.4-2.2 6.6 0s4.4 2.2 6.6 0 4.4-2.2 6.8 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M2 10c2.2-2.2 4.4-2.2 6.6 0s4.4 2.2 6.6 0 4.4-2.2 6.8 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.55"
          />
        </svg>
      );

    case "trophy":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M8 4h8v3a4 4 0 0 1-8 0V4z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M6 7H4a2 2 0 0 0 2 2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M18 7h2a2 2 0 0 1-2 2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path d="M12 11v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 20h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path
            d="M10 14h4v6h-4v-6z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "calendar":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path d="M7 2v3M17 2v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M3 9h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path
            d="M5 5h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "users":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M22 21v-2a4 4 0 0 0-3-3.87"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.65"
          />
          <path
            d="M16 3.13a4 4 0 0 1 0 7.75"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.65"
          />
        </svg>
      );

    case "target":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 22a10 10 0 1 1 10-10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M12 18a6 6 0 1 1 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.7"
          />
          <path
            d="M12 14a2 2 0 1 1 2-2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.7"
          />
          <path d="M22 2l-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 2h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case "shield":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2l7 4v6c0 5-3 9-7 10-4-1-7-5-7-10V6l7-4z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M9 12l2 2 4-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case "spark":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2l1.6 6.2L20 10l-6.4 1.8L12 18l-1.6-6.2L4 10l6.4-1.8L12 2z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );

    case "star":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2l3.2 6.6 7.3 1-5.3 5.1 1.3 7.3L12 18.7 5.5 22l1.3-7.3L1.5 9.6l7.3-1L12 2z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );

    default:
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
      {children}
    </span>
  );
}

function WavesWow() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[-1px]">
      <svg viewBox="0 0 1440 200" className="h-32 w-full" preserveAspectRatio="none">
        <path
          d="M0,90 C160,140 320,160 480,146 C640,132 800,86 960,88 C1120,90 1280,124 1440,92 L1440,200 L0,200 Z"
          fill="rgba(2,132,199,0.35)"
        />
        <path
          d="M0,120 C160,170 320,190 480,176 C640,162 800,112 960,116 C1120,120 1280,150 1440,120 L1440,200 L0,200 Z"
          fill="rgba(15,23,42,0.25)"
        />
      </svg>
    </div>
  );
}

function HeroBackdrop({ url }: { url?: string | null }) {
  return (
    <div className="absolute inset-0">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Black Waves"
          className="h-full w-full object-cover"
          style={{ objectPosition: "50% 35%", filter: "saturate(1.05) contrast(1.05)" }}
          loading="eager"
          decoding="async"
        />
      ) : (
        <div className="h-full w-full bg-slate-950" />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/35 to-white" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(14,165,233,0.35),transparent_55%)]" />
      <div className="absolute inset-0 opacity-[0.16] [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:26px_26px]" />
    </div>
  );
}

function ContentCard({
  icon,
  title,
  content,
}: {
  icon: "users" | "trophy" | "calendar" | "target";
  title: string;
  content: string;
}) {
  return (
    <section className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_80px_rgba(2,6,23,0.10)]">
      <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-[radial-gradient(circle_at_30%_0%,rgba(14,165,233,0.14),transparent_55%)]" />
      <div className="relative">
        <div className="mb-4 inline-flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-700">
            <Icon name={icon} />
          </span>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 md:text-2xl">
            {title}
          </h2>
        </div>
        <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">{content}</div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-sky-300 blur-3xl opacity-20" />
      </div>
    </section>
  );
}

function DiagonalPhotoBand({
  photos,
}: {
  photos: Array<{ url?: string | null; label: string }>;
}) {
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[42px] bg-gradient-to-r from-sky-100 via-white to-sky-50" />
      <div className="grid gap-4 md:grid-cols-3">
        {photos.map((p, idx) => (
          <div
            key={idx}
            className={[
              "relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_25px_90px_rgba(2,6,23,0.10)]",
              "transition hover:-translate-y-1 hover:shadow-[0_35px_120px_rgba(2,6,23,0.14)]",
              idx === 0 ? "-rotate-2" : idx === 1 ? "rotate-1" : "-rotate-1",
            ].join(" ")}
          >
            {p.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.url}
                alt={p.label}
                className="h-[240px] w-full object-cover"
                style={{ objectPosition: idx === 1 ? "50% 40%" : "50% 30%" }}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="h-[240px] w-full bg-slate-100" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/16 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/18 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
                <span className="text-sky-200">
                  <Icon name="wave" />
                </span>
                {p.label}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhotoTile({
  src,
  tall = false,
  pos = "50% 35%",
}: {
  src?: string | null;
  tall?: boolean;
  pos?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_30px_120px_rgba(2,6,23,0.10)]">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt="Black Waves"
          className={tall ? "h-[520px] w-full object-cover" : "h-[260px] w-full object-cover"}
          style={{ objectPosition: pos, filter: "saturate(1.06) contrast(1.02)" }}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className={tall ? "h-[520px] w-full bg-slate-100" : "h-[260px] w-full bg-slate-100"} />
      )}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0)_58%,rgba(255,255,255,0.85)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
    </div>
  );
}

/* --------------------------- Page --------------------------- */

export default function ClubPage() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [trialFlash, setTrialFlash] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const trial = params.get("trial");

    if (!trial) {
      return;
    }

    if (trial === "ok") {
      setTrialFlash(
        "Demande d’essai envoyée avec succès. Le parent va recevoir un e-mail de confirmation. Pensez a surveiller vos e-mails (et vos spams) pour la suite du processus."
      );
    } else if (trial === "ok-no-mail") {
      setTrialFlash(
        "Demande d’essai envoyée avec succès. Le club a bien recu la demande, mais l’e-mail parent n’a pas pu etre confirme. Pensez a surveiller vos e-mails (et vos spams) pour les prochaines informations."
      );
    }

    params.delete("trial");
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  }, []);

  useEffect(() => {
    if (!trialFlash) {
      return;
    }

    const dismiss = () => setTrialFlash(null);

    window.addEventListener("pointerdown", dismiss, { once: true });
    window.addEventListener("mousedown", dismiss, { once: true });
    window.addEventListener("touchstart", dismiss, { once: true });

    return () => {
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("mousedown", dismiss);
      window.removeEventListener("touchstart", dismiss);
    };
  }, [trialFlash]);

  // ✅ DB blocks (inchangé)
  useEffect(() => {
    const fetchBlocks = async () => {
      const { data, error } = await supabase
        .from("public_content_blocks")
        .select("key,title,content_md,ordre")
        .eq("page", "club")
        .eq("is_active", true)
        .order("ordre", { ascending: true });

      if (error) {
        console.error("Erreur chargement blocks club", error);
        setBlocks([]);
        return;
      }
      setBlocks((data as Block[]) ?? []);
    };

    fetchBlocks();
  }, []);

  // ✅ photos validées : on ne charge qu’un petit batch, puis on prend EXACTEMENT le nb nécessaire (7)
  useEffect(() => {
    const load = async () => {
      try {
        const needed = 7; // hero(1) + band(3) + mosaic(3)
        const batch = 80; // petit lot pour “randomiser” sans exploser le navigateur
        const urls = await fetchApprovedSitePhotosBatch(batch);
        const mixed = shuffle(urls);
        const chosen = pickNWithFallback(mixed, needed);
        setPhotos(chosen);
      } catch (e) {
        console.error("Erreur chargement photos club", e);
        setPhotos(pickNWithFallback([], 7));
      }
    };
    load();
  }, []);

  const get = (k: string, fallbackTitle: string, fallbackContent: string) => {
    const b = blocks.find((x) => x.key === k);
    return {
      title: ((b && b.title) || "").trim() || fallbackTitle,
      content: ((b && b.content_md) || "").trim() || fallbackContent,
    };
  };

  const histoire = useMemo(
    () => get("club_histoire", "Histoire du club", "Contenu à venir."),
    [blocks]
  );
  const valeurs = useMemo(
    () => get("club_valeurs", "Nos valeurs", "Contenu à venir."),
    [blocks]
  );
  const projet = useMemo(
    () => get("club_projet", "Le projet sportif", "Contenu à venir."),
    [blocks]
  );
  const encadrement = useMemo(
    () => get("club_encadrement", "L’encadrement", "Contenu à venir."),
    [blocks]
  );

  // ✅ slots photo garantis
  const heroBg = photos[0] || FALLBACKS[0];

  const band1 = photos[1] || FALLBACKS[0];
  const band2 = photos[2] || FALLBACKS[0];
  const band3 = photos[3] || FALLBACKS[0];

  const tileA = photos[4] || FALLBACKS[0];
  const tileB = photos[5] || FALLBACKS[0];
  const tileC = photos[6] || FALLBACKS[0];

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {trialFlash && (
        <div className="sticky top-2 z-50 mx-auto w-full max-w-6xl px-6 pt-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 shadow-[0_8px_30px_rgba(5,150,105,0.15)]">
            {trialFlash}
          </div>
        </div>
      )}

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-slate-200">
        <HeroBackdrop url={heroBg} />

        <div className="relative mx-auto max-w-6xl px-6 pb-14 pt-20 md:pb-20 md:pt-28">
          <div className="grid gap-10 md:grid-cols-[1.25fr_0.75fr] md:items-start">
            {/* Colonne gauche */}
            <div className="max-w-3xl space-y-6">
              <div className="flex flex-wrap gap-2">
                <Pill>
                  <span className="text-sky-200">
                    <Icon name="wave" />
                  </span>
                  BlackWaves — Marseille
                </Pill>
                <Pill>
                  <span className="text-sky-200">
                    <Icon name="shield" />
                  </span>
                  Sécurité & encadrement
                </Pill>
                <Pill>
                  <span className="text-sky-200">
                    <Icon name="trophy" />
                  </span>
                  Ambition compétition
                </Pill>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-6xl">
                Le Club
              </h1>

              <p className="text-white/90 leading-relaxed md:text-lg">
                Un club exigeant et bienveillant : progression, cohésion, rigueur — et une visibilité forte en compétition.
              </p>

              <div className="flex flex-wrap gap-3">
                <a
                  href="/essai"
                  className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-black/20 transition hover:bg-sky-50"
                >
                  Demander un essai
                </a>
                <a
                  href="/equipes"
                  className="rounded-full border border-white/30 bg-white/10 px-5 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
                >
                  Découvrir les équipes
                </a>
                <a
                  href="/contact"
                  className="rounded-full border border-white/30 bg-white/10 px-5 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
                >
                  Contact
                </a>
              </div>
            </div>

            {/* Colonne droite (nouvelle position blocs : résumé compact + repères) */}
            <div className="space-y-4">
              <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl shadow-[0_18px_70px_rgba(2,6,23,0.22)]">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-200/40 bg-white/10 text-sky-200">
                    <Icon name="spark" />
                  </span>
                  <div>
                    <div className="text-sm font-extrabold text-white">Une organisation claire</div>
                    <div className="text-[12px] text-white/80">Planning, infos, repères, progression.</div>
                  </div>
                </div>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-white/12 bg-slate-950/25 p-3 text-[12px] text-white/85">
                    <span className="font-semibold text-white">Encadrement :</span>{" "}
                    exigence, bienveillance, sécurité.
                  </div>
                  <div className="rounded-2xl border border-white/12 bg-slate-950/25 p-3 text-[12px] text-white/85">
                    <span className="font-semibold text-white">Objectif :</span>{" "}
                    progresser et performer en compétition.
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl shadow-[0_18px_70px_rgba(2,6,23,0.22)]">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-200/40 bg-white/10 text-sky-200">
                    <Icon name="users" />
                  </span>
                  <div>
                    <div className="text-sm font-extrabold text-white">Esprit d’équipe</div>
                    <div className="text-[12px] text-white/80">Cohésion, discipline, fierté.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <WavesWow />
        </div>
      </section>

      {/* Bande diagonale */}
      <section className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        <div className="mb-6 flex items-end justify-between gap-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
              Photos approuvées (galerie validée)
            </div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
              Identité & énergie
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-700">
              Un aperçu visuel cohérent — alimenté uniquement par photos/site.
            </p>
          </div>

          <span className="hidden md:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700">
            <span className="text-sky-700">
              <Icon name="check" />
            </span>
            Galerie (photos/site)
          </span>
        </div>

        <DiagonalPhotoBand
          photos={[
            { url: band1, label: "Cohésion" },
            { url: band2, label: "Rigueur" },
            { url: band3, label: "Fierté" },
          ]}
        />
      </section>

      {/* Contenu DB + mosaïque (blocs repositionnés) */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-10 md:grid-cols-2 md:items-start">
          {/* ✅ Nouveau positionnement : 2 gros blocs d’abord, puis 2 blocs */}
          <div className="space-y-6">
            <ContentCard icon="trophy" title={projet.title} content={projet.content} />
            <ContentCard icon="users" title={encadrement.title} content={encadrement.content} />

            <div className="grid gap-6 md:grid-cols-2">
              <ContentCard icon="target" title={valeurs.title} content={valeurs.content} />
              <ContentCard icon="calendar" title={histoire.title} content={histoire.content} />
            </div>
          </div>

          {/* mosaïque */}
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <PhotoTile src={tileA} tall={false} pos="50% 30%" />
              <PhotoTile src={tileB} tall={false} pos="50% 45%" />
            </div>

            <PhotoTile src={tileC} tall={true} pos="50% 35%" />

            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-slate-50 p-6 shadow-[0_18px_70px_rgba(2,6,23,0.08)]">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1 text-[11px] font-semibold text-sky-800">
                <span className="text-sky-700">
                  <Icon name="star" />
                </span>
                Galerie validée
              </div>
              <div className="mt-3 text-lg font-extrabold text-slate-900">
                100% photos approuvées
              </div>
              <p className="mt-2 text-sm text-slate-700">
                Toutes les images viennent du bucket <span className="font-semibold">photos</span>, dossier{" "}
                <span className="font-semibold">site</span> — et on ne charge que ce dont la page a besoin.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
                Black Waves — Marseille
              </div>
              <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
                Envie de rejoindre l’aventure ?
              </h3>
              <p className="mt-2 max-w-2xl text-sm text-slate-700">
                Essai, équipes, organisation : tout est pensé pour être clair, agréable, et performant sur le tapis.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/essai"
                className="rounded-full bg-[#0f1c3f] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-900"
              >
                Faire une demande d’essai
              </a>
              <a
                href="/contact"
                className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
              >
                Nous contacter
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
