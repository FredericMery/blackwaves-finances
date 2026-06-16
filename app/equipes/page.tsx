"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Block = {
  key: string;
  title: string | null;
  content_md: string;
  ordre: number;
};

type RandomPhoto = { path: string; url: string };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ✅ Effets optionnels
const ENABLE_WAVES_ANIMATION = true;
const ENABLE_HERO_PARALLAX = true;
const ENABLE_SCROLL_TO_BAND = true;

/* --------------------------- Utils --------------------------- */

function fillSlots(urls: string[], count: number): (string | null)[] {
  const cleaned = (urls || []).map((x) => String(x || "").trim()).filter(Boolean);
  if (count <= 0) return [];
  if (!cleaned.length) return Array.from({ length: count }, () => null);
  return Array.from({ length: count }, (_, i) => cleaned[i % cleaned.length]);
}

/* --------------------------- Icons / UI --------------------------- */

function Icon({
  name,
}: {
  name:
    | "wave"
    | "shield"
    | "target"
    | "users"
    | "spark"
    | "trophy"
    | "handshake"
    | "calendar"
    | "check";
}) {
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
    case "trophy":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M8 4h8v3a4 4 0 0 1-8 0V4z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M6 7H4a2 2 0 0 0 2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M18 7h2a2 2 0 0 1-2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 11v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 20h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M10 14h4v6h-4v-6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
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
    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
      {children}
    </span>
  );
}

function WavesWow() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[-1px]">
      <svg
        viewBox="0 0 1440 200"
        className={["h-32 w-full", ENABLE_WAVES_ANIMATION ? "bw-wave-anim" : ""].join(" ")}
        preserveAspectRatio="none"
      >
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

function HeroBackdrop({ url, parallaxOffset = 0 }: { url?: string | null; parallaxOffset?: number }) {
  return (
    <div className="absolute inset-0">
      {url ? (
        <img
          src={url}
          alt="Black Waves"
          className="h-full w-full object-cover"
          style={{
            objectPosition: "50% 35%",
            filter: "saturate(1.05) contrast(1.05)",
            transform: `translateY(${parallaxOffset}px) scale(1.03)`,
            willChange: "transform",
          }}
        />
      ) : (
        <div className="h-full w-full bg-slate-900" />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/35 to-white" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(14,165,233,0.35),transparent_55%)]" />
      <div className="absolute inset-0 opacity-[0.16] [background-image:radial-gradient(#ffffff_1px,transparent_1px)] [background-size:26px_26px]" />
    </div>
  );
}

function PhotoFrame({ src, label, ratio = "aspect-[4/3]" }: { src?: string | null; label: string; ratio?: string }) {
  return (
    <div className="group relative overflow-hidden rounded-3xl bg-white shadow-[0_30px_120px_rgba(2,6,23,0.10)]">
      <div className={`relative w-full ${ratio}`}>
        {src ? (
          <img
            src={src}
            alt={label}
            className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 bg-slate-100" />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/70 via-white/20 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0)_55%,rgba(255,255,255,0.85)_100%)]" />
      </div>

      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div className="text-sm font-extrabold text-slate-900">{label}</div>
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700">
          <span className="text-sky-700">
            <Icon name="wave" />
          </span>
          BlackWaves
        </span>
      </div>
    </div>
  );
}

function ContentCard({ icon, title, content }: { icon: "users" | "trophy" | "calendar" | "target"; title: string; content: string }) {
  return (
    <section className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_80px_rgba(2,6,23,0.10)]">
      <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-[radial-gradient(circle_at_30%_0%,rgba(14,165,233,0.16),transparent_55%)]" />
      <div className="relative">
        <div className="mb-4 inline-flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-700">
            <Icon name={icon === "users" ? "users" : icon === "trophy" ? "trophy" : icon === "calendar" ? "calendar" : "target"} />
          </span>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 md:text-2xl">{title}</h2>
        </div>
        <div className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">{content}</div>
      </div>
    </section>
  );
}

/* --------------------------- Page --------------------------- */

export default function EquipesPageWow() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  const bandRef = useRef<HTMLDivElement | null>(null);
  const [heroParallax, setHeroParallax] = useState(0);

  // ✅ blocs DB (modifiables)
  useEffect(() => {
    const fetchBlocks = async () => {
      const { data, error } = await supabase
        .from("public_content_blocks")
        .select("key,title,content_md,ordre")
        .eq("page", "teams")
        .eq("is_active", true)
        .order("ordre", { ascending: true });

      if (error) {
        console.error("Erreur chargement blocks teams", error);
        setBlocks([]);
        return;
      }
      setBlocks((data as Block[]) ?? []);
    };
    fetchBlocks();
  }, []);

  // ✅ photos aléatoires sur TOUT le bucket (récursif via endpoint public)
  useEffect(() => {
    const loadPhotos = async () => {
      try {
        const NEEDED = 5; // hero + 4 band
        const r = await fetch(`/api/public/photos/random?n=${NEEDED}`, { cache: "no-store" });
        const j = await r.json();

        const items = Array.isArray(j && j.items) ? (j.items as RandomPhoto[]) : [];
        const urls = items.map((x) => x && x.url).filter(Boolean) as string[];

        setPhotoUrls(urls);
      } catch (e) {
        console.error("Erreur chargement photos random", e);
        setPhotoUrls([]);
      }
    };
    loadPhotos();
  }, []);

  // ✅ parallax léger
  useEffect(() => {
    if (!ENABLE_HERO_PARALLAX) return;
    const onScroll = () => {
      const y = window.scrollY || 0;
      const offset = Math.min(18, y * 0.06);
      setHeroParallax(offset);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const get = (k: string, fallbackTitle: string, fallbackContent: string) => {
    const b = blocks.find((x) => x.key === k);
    return {
      title: (b && b.title ? b.title : "").trim() || fallbackTitle,
      content: (b && b.content_md ? b.content_md : "").trim() || fallbackContent,
    };
  };

  const intro = useMemo(() => get("teams_intro", "Les équipes", "Contenu à venir."), [blocks]);
  const palmares = useMemo(() => get("teams_palmares", "Palmarès du club", "Contenu à venir."), [blocks]);
  const planning = useMemo(() => get("teams_planning", "Planning des entraînements", "Contenu à venir."), [blocks]);
  const compet = useMemo(() => get("teams_compets", "Les compétitions", "Contenu à venir."), [blocks]);

  // ✅ toujours des images : wrap si < NEEDED
  const [heroBg, bandA, bandB, bandC, bandD] = fillSlots(photoUrls, 5);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-slate-200">
        <HeroBackdrop url={heroBg} parallaxOffset={ENABLE_HERO_PARALLAX ? heroParallax : 0} />

        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-14 md:pb-24 md:pt-20">
          <div className="max-w-2xl">
            <div className="flex flex-wrap gap-2">
              <Pill>
                <span className="text-sky-200">
                  <Icon name="users" />
                </span>
                Âges & niveaux
              </Pill>
              <Pill>
                <span className="text-sky-200">
                  <Icon name="trophy" />
                </span>
                Compétition & palmarès
              </Pill>
              <Pill>
                <span className="text-sky-200">
                  <Icon name="calendar" />
                </span>
                Planning clair
              </Pill>
            </div>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white md:text-6xl">Les équipes</h1>
            <p className="mt-4 text-base text-white/90 md:text-lg">
              Une organisation lisible pour les familles : tranches d’âge, niveaux, objectifs, entraînements et compétitions.
              Le club met l’accent sur la progression, la sécurité et l’esprit d’équipe.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="/essai"
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-slate-900/20 transition hover:bg-slate-50"
              >
                Demander un essai
              </a>

              {ENABLE_SCROLL_TO_BAND && (
                <button
                  type="button"
                  onClick={() => bandRef.current && bandRef.current.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className="rounded-full border border-white/30 bg-white/10 px-5 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
                >
                  Voir l’énergie ↓
                </button>
              )}

              <a
                href="/planning"
                className="rounded-full border border-white/30 bg-white/10 px-5 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
              >
                Voir le planning
              </a>

              <a
                href="/contact"
                className="rounded-full border border-white/30 bg-white/10 px-5 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
              >
                Contact sponsor
              </a>
            </div>
          </div>

          <WavesWow />
        </div>
      </section>

      {/* Bande photos */}
      <section ref={bandRef} className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        <div className="grid gap-5 md:grid-cols-12 md:items-stretch">
          <div className="md:col-span-7">
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_80px_rgba(2,6,23,0.10)]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_10%,rgba(14,165,233,0.20),transparent_55%)]" />
              <div className="relative p-7">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">Structure & progression</div>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
                  Des équipes adaptées, une montée en puissance maîtrisée
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">
                  Les groupes sont définis selon l’âge et le niveau technique. L’objectif : apprendre les bases, progresser en sécurité,
                  renforcer la cohésion, puis viser la performance en compétition — sans brûler d’étapes.
                </p>
              </div>
            </div>
          </div>

          <div className="md:col-span-5 grid gap-5">
            <PhotoFrame src={bandA} label="Cohésion & esprit d’équipe" ratio="aspect-[16/10]" />
            <PhotoFrame src={bandB} label="Technique & précision" ratio="aspect-[16/10]" />
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <PhotoFrame src={bandC} label="Énergie sur le tapis" ratio="aspect-[21/9]" />
          <PhotoFrame src={bandD} label="Fierté & représentation du club" ratio="aspect-[21/9]" />
        </div>
      </section>

      {/* CONTENU DB (modifiables) */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="grid gap-8 md:grid-cols-2 md:items-start">
          <div className="space-y-6">
            <ContentCard icon="users" title={intro.title} content={intro.content} />
            <ContentCard icon="calendar" title={planning.title} content={planning.content} />
          </div>
          <div className="space-y-6">
            <ContentCard icon="trophy" title={palmares.title} content={palmares.content} />
            <ContentCard icon="target" title={compet.title} content={compet.content} />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">Black Waves — Marseille</div>
              <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">Rejoindre une équipe</h3>
              <p className="mt-2 max-w-2xl text-sm text-slate-700">
                Vous voulez connaître le niveau adapté, les entraînements, ou les compétitions ? Faites une demande d’essai et on vous guide.
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

      {/* CSS waves */}
      <style jsx global>{`
        .bw-wave-anim {
          animation: bwWaveFloat 6s ease-in-out infinite;
          transform-origin: center;
        }
        @keyframes bwWaveFloat {
          0% { transform: translateY(0px); }
          50% { transform: translateY(6px); }
          100% { transform: translateY(0px); }
        }
      `}</style>
    </main>
  );
}
