// lib/season.ts
export function getCurrentSeasonStartYear(d = new Date()) {
  const m = d.getMonth(); // 0..11
  const y = d.getFullYear();

  // Saison courante "Nov -> Oct" (comme ton besoin de verrouillage)
  // Si on est en Nov/Dec => saison démarre cette année, sinon elle a démarré l'an dernier.
  return m >= 10 ? y : y - 1;
}

export function formatSeason(startYear: number) {
  return `${startYear}-${startYear + 1}`;
}

export function getNextSeasonLabel(d = new Date()) {
  const currentStart = getCurrentSeasonStartYear(d);
  return formatSeason(currentStart + 1);
}

// Ouverture Juin (5) à Octobre (9) inclus
export function isReinscriptionOpen(d = new Date()) {
  const m = d.getMonth(); // 0..11
  return m >= 5 && m <= 9;
}
