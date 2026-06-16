"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { UserRole } from "@/lib/getUserRole";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  ContactRound,
  Home,
  Megaphone,
  Menu,
  Moon,
  Plus,
  ShoppingBag,
  Sun,
  Trophy,
} from "lucide-react";

export type HomePlanningEvent = {
  id: string;
  title: string;
  team: string | null;
  type: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  description: string | null;
};

export type HomeNewsItem = {
  id: string;
  title: string;
  slug: string;
  event_date: string;
  image_url: string | null;
  registrations_open?: boolean | null;
  teaser?: string;
};

type HomeLandingProps = {
  role: UserRole;
  planningEvents: HomePlanningEvent[];
  newsItems: HomeNewsItem[];
};

function roleHome(role: UserRole) {
  if (role === "athlete") return "/athlete";
  if (role === "parent") return "/parent";
  if (role === "coach") return "/coach";
  if (role === "bureau") return "/bureau";
  return "/login";
}

function planningLinkForRole(role: UserRole) {
  if (role === "athlete") return "/athlete/planning";
  if (role === "parent") return "/parent/planning";
  if (role === "coach") return "/coach/planning";
  if (role === "bureau") return "/bureau/planning";
  return "/planning";
}

function formatDay(dateIso: string) {
  return new Date(`${dateIso}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatEventDate(dateIso: string) {
  return new Date(dateIso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function eventTime(event: HomePlanningEvent) {
  if (event.start_time && event.end_time) return `${event.start_time} - ${event.end_time}`;
  if (event.start_time) return event.start_time;
  return "Horaire a definir";
}

function isCompetition(event: HomePlanningEvent) {
  const value = (event.type ?? "").toLowerCase();
  return value.includes("competition") || value.includes("compet");
}

function onlyFuture(events: HomePlanningEvent[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return events.filter((event) => new Date(`${event.date}T12:00:00`) >= today);
}

function nextTraining(events: HomePlanningEvent[]) {
  return onlyFuture(events).find((event) => !isCompetition(event)) ?? onlyFuture(events)[0] ?? null;
}

function nextCompetition(events: HomePlanningEvent[], news: HomeNewsItem[]) {
  const nextInPlanning = onlyFuture(events).find((event) => isCompetition(event));
  if (nextInPlanning) {
    return {
      title: nextInPlanning.title,
      date: nextInPlanning.date,
      location: nextInPlanning.location ?? "Lieu a confirmer",
      link: planningLinkForRole("public"),
    };
  }

  const nextNews = news[0];
  if (!nextNews) return null;

  return {
    title: nextNews.title,
    date: nextNews.event_date,
    location: "Evenement du club",
    link: `/evenements/${nextNews.slug}`,
  };
}

const quickLinks = [
  {
    href: "/contact",
    label: "Contact",
    icon: ContactRound,
    color: "text-blue-600",
  },
  {
    href: "/goodies",
    label: "Boutique",
    icon: ShoppingBag,
    color: "text-violet-500",
  },
  {
    href: "/evenements",
    label: "Evenements",
    icon: CalendarDays,
    color: "text-pink-500",
  },
  {
    href: "/histoire",
    label: "Palmares",
    icon: Trophy,
    color: "text-emerald-500",
  },
];

type QuickAction = {
  label: string;
  href: string;
};

function getCreateActions(role: UserRole): QuickAction[] {
  if (role === "bureau") {
    return [
      { label: "Ajouter ligne budget", href: "/bureau/budget" },
      { label: "Ajouter un evenement", href: "/bureau/evenements/create" },
      { label: "Ajouter une annonce (communication)", href: "/bureau/communications/create" },
      { label: "Ajouter une action", href: "/bureau/actions" },
    ];
  }

  if (role === "coach") {
    return [
      { label: "Ajouter une demande d'entrainement", href: "/coach/planning?new=training-request" },
      { label: "Ajouter une annonce", href: "/contact?type=annonce" },
      { label: "Declarer un incident/accident", href: "/contact?type=incident" },
      { label: "Ajouter une question au club", href: "/contact?type=question" },
      { label: "Ajouter une demande d'achat", href: "/contact?type=achat" },
      { label: "Ajouter une idee d'amelioration", href: "/contact?type=amelioration" },
    ];
  }

  const questionBase = role === "parent" ? "/parent/questions" : "/contact";
  return [
    { label: "Ajouter une absence", href: `${questionBase}?type=absence` },
    { label: "Ajouter une idee d'amelioration", href: `${questionBase}?type=amelioration` },
    { label: "Ajouter une question au club", href: `${questionBase}?type=question` },
  ];
}

export default function HomeLanding({ role, planningEvents, newsItems }: HomeLandingProps) {
  const [isDark, setIsDark] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState<string>("/hero-blackwaves-cheer.png");
  const createMenuRef = useRef<HTMLDivElement | null>(null);
  const nextTrain = nextTraining(planningEvents);
  const upcoming = onlyFuture(planningEvents).slice(0, 3);
  const nextComp = nextCompetition(planningEvents, newsItems);
  const planningHref = planningLinkForRole(role);
  const menuHref = roleHome(role);
  const createActions = getCreateActions(role);

  const bg = isDark ? "bg-[#08102a]" : "bg-[#f1f4fa]";
  const cardBg = isDark ? "bg-[#111c3a]" : "bg-white";
  const cardBorder = isDark ? "border border-[#1e2f5a]" : "";
  const textMain = isDark ? "text-white" : "text-slate-900";
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";
  const headerBg = isDark ? "bg-[#111c3a]" : "bg-white";
  const iconBtn = isDark ? "bg-[#1a2b52] text-blue-300" : "bg-slate-100 text-blue-700";
  const seanceCard = isDark ? "bg-[#0e1a38] border border-[#1e3060]" : "bg-slate-50 border border-slate-200";
  const navBg = isDark ? "bg-[#111c3a]" : "bg-white";

  useEffect(() => {
    if (!isCreateMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!createMenuRef.current) return;
      if (!createMenuRef.current.contains(event.target as Node)) {
        setIsCreateMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isCreateMenuOpen]);

  useEffect(() => {
    let isMounted = true;

    const loadRandomHeroImage = async () => {
      try {
        const response = await fetch("/api/public/hero-photos?prefix=hero&limit=24", { cache: "no-store" });
        if (!response.ok) return;

        const payload = await response.json();
        const items = Array.isArray(payload?.items) ? payload.items : [];
        if (!items.length || !isMounted) return;

        const randomItem = items[Math.floor(Math.random() * items.length)];
        if (randomItem?.url) {
          setHeroImageUrl(randomItem.url);
        }
      } catch {
        // Fallback silencieux sur l'image locale.
      }
    };

    loadRandomHeroImage();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className={`flex h-screen flex-col overflow-hidden ${bg} px-2 pt-2 pb-2 transition-colors duration-300`}>
      <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">

        {/* Header */}
        <header className={`flex shrink-0 items-center justify-between rounded-2xl ${headerBg} ${cardBorder} px-3 py-1.5 shadow-sm`}>
          <Link href="/" className="flex items-center gap-2">
            <Image src="/blackwaves-logo.png" alt="Black Waves" width={44} height={44} className="rounded-full" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">Black Waves</div>
              <div className={`text-[18px] font-extrabold leading-none ${textMain}`}>Cheerleading</div>
            </div>
          </Link>
          <div className="relative flex items-center gap-1.5" ref={createMenuRef}>
            <button
              type="button"
              onClick={() => setIsCreateMenuOpen((prev) => !prev)}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${iconBtn} transition-colors`}
              aria-label="Ajouter"
              aria-expanded={isCreateMenuOpen}
              aria-haspopup="menu"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => setIsDark(!isDark)} className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${iconBtn} transition-colors`} aria-label={isDark ? "Mode clair" : "Mode sombre"}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button type="button" className={`relative inline-flex h-9 w-9 items-center justify-center rounded-xl ${iconBtn}`} aria-label="Notifications">
              <Bell className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 rounded-full bg-blue-600 px-1 py-px text-[9px] font-bold text-white">3</span>
            </button>
            <Link href={menuHref} className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${iconBtn}`} aria-label="Menu">
              <Menu className="h-4 w-4" />
            </Link>

            {isCreateMenuOpen ? (
              <div
                className={`absolute right-0 top-11 z-30 w-[280px] rounded-2xl ${cardBg} ${cardBorder} p-2 shadow-xl`}
                role="menu"
              >
                <div className={`px-2 py-1 text-[11px] font-bold uppercase tracking-widest ${textMuted}`}>
                  Actions rapides
                </div>
                <div className="mt-1 flex flex-col gap-1">
                  {createActions.map((action) => (
                    <Link
                      key={action.label}
                      href={action.href}
                      role="menuitem"
                      onClick={() => setIsCreateMenuOpen(false)}
                      className={`rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-blue-500/10 ${textMain}`}
                    >
                      {action.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </header>

        {/* Hero cards + photo — ligne centrale */}
        <div className="grid min-h-0 shrink-0 grid-cols-2 gap-1.5 md:grid-cols-[1fr_1fr_1.2fr]">
          {/* Prochain entraînement */}
          <section className="rounded-2xl bg-[linear-gradient(140deg,#1d61ff,#0b3dad)] p-3 text-white shadow-md shadow-blue-500/25">
            <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-blue-100">Prochain entraînement</div>
            <div className="mt-1 text-3xl font-black leading-none">{nextTrain ? eventTime(nextTrain).split(" - ")[0] : "17:30"}</div>
            <div className="mt-0.5 text-xs font-bold">{nextTrain ? formatDay(nextTrain.date) : "Aujourd hui"}</div>
            <div className="mt-2 inline-flex rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">{nextTrain?.team ?? "U14 – Interm."}</div>
            <div className="mt-1 text-[10px] text-blue-100">{nextTrain?.location ?? "Gymnase Vallier"}</div>
          </section>

          {/* Prochaine compétition */}
          <section className="rounded-2xl bg-[linear-gradient(150deg,#1a2250,#0a1236)] p-3 text-white shadow-md">
            <div className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-200">Prochaine compétition</div>
            <div className="mt-0.5 text-3xl font-black leading-none text-blue-100">J-23</div>
            <div className="text-base font-extrabold text-blue-400 leading-tight">{nextComp?.title ?? "Coupe de France"}</div>
            <div className="mt-1 text-[10px] text-slate-200">{nextComp ? formatEventDate(nextComp.date) : "7 & 8 juin 2025"}</div>
            <div className="text-[10px] text-slate-300">{nextComp?.location ?? "Marseille"}</div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/20">
                <div className="h-full w-[68%] rounded-full bg-blue-500" />
              </div>
              <span className="text-xs font-bold">68%</span>
            </div>
          </section>

          {/* Photo hero */}
          <div className="hidden md:block" />
        </div>

        {/* Hero paysage full largeur, bandeau et message integres dans la photo */}
        <section className="relative -mx-2 min-h-0 flex-1 overflow-hidden bg-[#020b24] shadow-md">
          <Image
            src={heroImageUrl}
            alt="Black Waves"
            fill
            sizes="100vw"
            className="object-contain object-center"
            priority
          />

          <div className="absolute inset-0 bg-gradient-to-r from-[#010716]/86 via-[#010716]/48 to-transparent" />

          <div className="absolute left-2 right-2 top-2 flex items-center justify-between rounded-xl bg-[#061a4bcc] px-3 py-1.5 backdrop-blur-sm">
            <div className="text-white">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-200">🎉 Nouveau ici ?</div>
              <div className="text-[13px] font-bold leading-tight">Decouvre le club et rejoins l&apos;aventure !</div>
            </div>
            <Link href="/essai" className="shrink-0 rounded-full bg-blue-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-400">
              Faire un essai ✨
            </Link>
          </div>

          <div className="absolute bottom-4 left-3 text-white max-w-[55%] md:bottom-5 md:left-5 md:max-w-[25%]">
            <div className="text-[22px] font-semibold uppercase tracking-[0.12em] text-white/95 md:text-[28px]">Bienvenue</div>
            <div className="mt-1 text-[24px] font-light italic leading-none text-blue-300 md:text-[32px]">
              chez Black Waves
            </div>

            <div className="mt-3 space-y-1 text-[11px] font-medium text-slate-100/90 md:text-sm">
              <div>Club a Marseille</div>
              <div>Des 5 ans</div>
              <div>Ambition & Passion</div>
            </div>

            <Link href="/club" className="mt-3 inline-flex rounded-full bg-[#0b2c85] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#123aa7] md:text-sm">
              Decouvrir le club
            </Link>
          </div>

          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            <span className="h-1.5 w-5 rounded-full bg-white opacity-90" />
            <span className="h-1.5 w-1.5 rounded-full bg-white opacity-40" />
            <span className="h-1.5 w-1.5 rounded-full bg-white opacity-40" />
          </div>
        </section>

        {/* 3 prochaines séances */}
        <section className={`shrink-0 rounded-2xl ${cardBg} ${cardBorder} p-2 shadow-sm`}>
          <div className="mb-1.5 flex items-center justify-between">
            <h2 className={`text-xs font-extrabold uppercase tracking-wide ${textMain}`}>3 prochaines séances</h2>
            <Link href={planningHref} className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${textMuted}`}>
              Tout le planning <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {upcoming.length === 0 ? (
              <div className={`col-span-3 rounded-xl ${seanceCard} p-2 text-xs ${textMuted}`}>Aucune séance à venir.</div>
            ) : (
              upcoming.map((event) => (
                <article key={event.id} className={`rounded-xl ${seanceCard} p-2`}>
                  <div className="text-[9px] font-semibold uppercase tracking-wide text-blue-500">{formatDay(event.date)}</div>
                  <div className={`text-2xl font-black leading-none ${textMain}`}>{eventTime(event).split(" - ")[0]}</div>
                  <div className={`mt-0.5 text-[11px] font-semibold ${textMain} truncate`}>{event.team ?? "Equipe"}</div>
                </article>
              ))
            )}
          </div>
        </section>

        {/* Accès rapide */}
        <section className="shrink-0">
          <div className={`mb-1 text-[10px] font-bold uppercase tracking-widest ${textMuted}`}>Accès rapide</div>
          <div className="grid grid-cols-4 gap-1.5">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-1 rounded-2xl ${cardBg} ${cardBorder} py-2 px-1 shadow-sm transition hover:shadow-md`}>
                  <Icon className={`h-6 w-6 ${item.color}`} />
                  <span className={`text-center text-[10px] font-semibold leading-tight ${textMain}`}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Bandeau info */}
        <Link href="/contact" className={`flex shrink-0 items-center justify-between rounded-2xl ${cardBg} ${cardBorder} px-3 py-2 shadow-sm`}>
          <span className={`flex items-center gap-2 text-xs font-semibold ${textMain}`}>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <Megaphone className="h-3.5 w-3.5" />
            </span>
            Pensez à votre gourde et bonne humeur ! 😄
          </span>
          <ChevronRight className={`h-4 w-4 ${textMuted}`} />
        </Link>

        <div className={`shrink-0 py-1 text-center text-[10px] font-medium ${textMuted} md:hidden`}>
          2006 BlackWaves Cheerleading
        </div>

        {/* Nav basse */}
        <nav className={`hidden shrink-0 grid-cols-4 rounded-2xl ${navBg} ${cardBorder} px-1 py-1 shadow-md md:grid`}>
          <div className="flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-blue-500">
            <Home className="h-4 w-4" />
            <span className="text-[10px] font-semibold">Accueil</span>
          </div>
          <div className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 ${textMuted}`}>
            <CalendarDays className="h-4 w-4" />
            <span className="text-[10px] font-semibold">Planning</span>
          </div>
          <div className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 ${textMuted}`}>
            <ShoppingBag className="h-4 w-4" />
            <span className="text-[10px] font-semibold">Boutique</span>
          </div>
          <div className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 ${textMuted}`}>
            <ContactRound className="h-4 w-4" />
            <span className="text-[10px] font-semibold">Contact</span>
          </div>
        </nav>

      </div>
    </div>
  );
}
