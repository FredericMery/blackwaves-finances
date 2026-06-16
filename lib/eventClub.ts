export type EventClubLink = {
  label: string;
  href: string;
};

export type EventClubDetails = {
  heroTitle: string;
  heroSubtitle: string;
  summary: string;
  description: string;
  locationName: string;
  address: string;
  scheduleText: string;
  priceText: string;
  practicalInfo: string;
  registrationsTitle: string;
  registrationsText: string;
  clubAthleteFormTitle: string;
  clubAthleteFormText: string;
  externalFormTitle: string;
  externalFormText: string;
  targetSeason: string;
  practicalLinks: EventClubLink[];
};

export const DEFAULT_EVENT_CLUB_LINKS: EventClubLink[] = [
  { label: "Infos pratiques club", href: "/parents" },
  { label: "Découvrir le club", href: "/club" },
  { label: "Voir les équipes", href: "/equipes" },
];

export function computeSeasonFromDate(dateValue?: string | null) {
  const base = dateValue ? new Date(dateValue) : new Date();
  const safe = Number.isNaN(base.getTime()) ? new Date() : base;
  const year = safe.getFullYear();
  const month = safe.getMonth() + 1;
  const start = month >= 8 ? year : year - 1;
  return `${start}-${start + 1}`;
}

export function createDefaultEventClubDetails(dateValue?: string | null): EventClubDetails {
  return {
    heroTitle: "",
    heroSubtitle: "Un rendez-vous Black Waves ouvert au club et aux participants extérieurs.",
    summary: "Une page événement claire, rapide à parcourir et simple pour s'inscrire.",
    description: "Décris ici l'événement, son objectif, son déroulé et ce qu'il faut savoir avant de venir.",
    locationName: "",
    address: "",
    scheduleText: "",
    priceText: "Gratuit",
    practicalInfo: "Accès, stationnement, tenue recommandée, matériel à prévoir, restauration sur place...",
    registrationsTitle: "Inscriptions",
    registrationsText: "Les athlètes du club peuvent s'inscrire en sélectionnant leur profil. Les externes disposent d'un formulaire dédié.",
    clubAthleteFormTitle: "Athlète Black Waves",
    clubAthleteFormText: "Sélectionne l'athlète concerné puis confirme l'inscription à l'événement.",
    externalFormTitle: "Participant externe",
    externalFormText: "Renseigne les informations du participant externe pour enregistrer son inscription.",
    targetSeason: computeSeasonFromDate(dateValue),
    practicalLinks: DEFAULT_EVENT_CLUB_LINKS,
  };
}

export function normalizeEventClubLink(input: unknown): EventClubLink | null {
  if (!input || typeof input !== "object") return null;

  const source = input as { label?: unknown; href?: unknown };
  const label = String(source.label || "").trim();
  const href = String(source.href || "").trim();

  if (!label || !href) return null;

  return { label, href };
}

export function normalizeEventClubDetails(input: unknown, dateValue?: string | null): EventClubDetails {
  const defaults = createDefaultEventClubDetails(dateValue);
  if (!input || typeof input !== "object") {
    return defaults;
  }

  const source = input as Record<string, unknown>;
  const practicalLinks = Array.isArray(source.practicalLinks)
    ? source.practicalLinks
        .map(normalizeEventClubLink)
        .filter((item): item is EventClubLink => item !== null)
    : defaults.practicalLinks;

  return {
    heroTitle: String(source.heroTitle || defaults.heroTitle).trim(),
    heroSubtitle: String(source.heroSubtitle || defaults.heroSubtitle).trim(),
    summary: String(source.summary || defaults.summary).trim(),
    description: String(source.description || defaults.description).trim(),
    locationName: String(source.locationName || defaults.locationName).trim(),
    address: String(source.address || defaults.address).trim(),
    scheduleText: String(source.scheduleText || defaults.scheduleText).trim(),
    priceText: String(source.priceText || defaults.priceText).trim(),
    practicalInfo: String(source.practicalInfo || defaults.practicalInfo).trim(),
    registrationsTitle: String(source.registrationsTitle || defaults.registrationsTitle).trim(),
    registrationsText: String(source.registrationsText || defaults.registrationsText).trim(),
    clubAthleteFormTitle: String(source.clubAthleteFormTitle || defaults.clubAthleteFormTitle).trim(),
    clubAthleteFormText: String(source.clubAthleteFormText || defaults.clubAthleteFormText).trim(),
    externalFormTitle: String(source.externalFormTitle || defaults.externalFormTitle).trim(),
    externalFormText: String(source.externalFormText || defaults.externalFormText).trim(),
    targetSeason: String(source.targetSeason || defaults.targetSeason).trim() || defaults.targetSeason,
    practicalLinks: practicalLinks.length ? practicalLinks : defaults.practicalLinks,
  };
}
