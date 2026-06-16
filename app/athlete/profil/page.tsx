"use client";

import { useEffect, useState } from "react";
import { getAthleteAuthHeaders } from "@/lib/athleteAuthHeaders";

type Athlete = {
  id: number;
  prenom: string;
  nom: string;
  date_naissance?: string;
  saison?: string;
  equipe?: string;
  autorisation_photo?: boolean;
  autorisation_video?: boolean;
};
type Team = { label: string; niveau?: string; type_code?: string };

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 py-3 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium text-white">{value}</span>
    </div>
  );
}

export default function AthleteProfil() {
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const headers = await getAthleteAuthHeaders();
        const res = await fetch("/api/athlete/me", { headers });
        if (!res.ok) return;
        const data = await res.json();
        setAthlete(data.athlete ?? null);
        setTeam(data.team ?? null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
      </div>
    );
  }

  if (!athlete) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-slate-400">
        Impossible de charger votre profil.
      </div>
    );
  }

  const birthDate = athlete.date_naissance
    ? new Date(athlete.date_naissance).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const age =
    athlete.date_naissance
      ? Math.floor(
          (Date.now() - new Date(athlete.date_naissance).getTime()) /
            (1000 * 60 * 60 * 24 * 365.25)
        )
      : null;

  const initials = `${athlete.prenom[0] ?? ""}${athlete.nom[0] ?? ""}`.toUpperCase();

  return (
    <div className="space-y-8">
      {/* Header */}
      <h1 className="text-2xl font-bold">Mon profil</h1>

      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-gradient-to-br from-sky-800/20 to-slate-900/40 p-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sky-500/25 text-2xl font-bold text-sky-200 ring-2 ring-sky-500/30">
          {initials}
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">
            {athlete.prenom} {athlete.nom}
          </div>
          {team && (
            <div className="mt-1 text-sm font-medium text-sky-400">
              {team.label}
              {team.niveau ? ` · ${team.niveau}` : ""}
            </div>
          )}
          {athlete.saison && (
            <div className="mt-0.5 text-xs text-slate-400">Saison {athlete.saison}</div>
          )}
        </div>
      </div>

      {/* Identity info */}
      <section className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2">
        <div className="pb-2 pt-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Informations personnelles
        </div>
        <InfoRow label="Prénom" value={athlete.prenom} />
        <InfoRow label="Nom" value={athlete.nom} />
        {birthDate && (
          <InfoRow
            label="Date de naissance"
            value={`${birthDate}${age !== null ? ` (${age} ans)` : ""}`}
          />
        )}
        {athlete.equipe && <InfoRow label="Équipe" value={athlete.equipe} />}
        {athlete.saison && <InfoRow label="Saison" value={athlete.saison} />}
      </section>

      {/* Authorizations */}
      <section className="rounded-2xl border border-white/10 bg-white/5 px-5 py-2">
        <div className="pb-2 pt-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Autorisations
        </div>
        <InfoRow
          label="Droit à l'image (photo)"
          value={
            athlete.autorisation_photo === true ? (
              <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                Accordé
              </span>
            ) : athlete.autorisation_photo === false ? (
              <span className="rounded-lg border border-red-500/30 bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-300">
                Refusé
              </span>
            ) : (
              <span className="text-slate-500">Non renseigné</span>
            )
          }
        />
        <InfoRow
          label="Droit à l'image (vidéo)"
          value={
            athlete.autorisation_video === true ? (
              <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                Accordé
              </span>
            ) : athlete.autorisation_video === false ? (
              <span className="rounded-lg border border-red-500/30 bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-300">
                Refusé
              </span>
            ) : (
              <span className="text-slate-500">Non renseigné</span>
            )
          }
        />
      </section>

      <p className="text-center text-[11px] text-slate-500">
        Pour modifier vos informations, contactez le bureau du club.
      </p>
    </div>
  );
}
