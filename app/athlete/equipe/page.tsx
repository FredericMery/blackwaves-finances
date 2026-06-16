"use client";

import { useEffect, useState } from "react";
import { getAthleteAuthHeaders } from "@/lib/athleteAuthHeaders";

type Member = { id: number; prenom: string; nom: string };
type Coach = { id: number; prenom: string; nom: string; kind: "coach" | "assist" };
type TeamInfo = {
  label: string;
  type_code?: string;
  niveau?: string;
  saison?: string;
  max_athletes?: number;
};

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sm font-bold text-sky-300 ring-1 ring-sky-500/30">
      {initials}
    </div>
  );
}

export default function AthleteTeam() {
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const headers = await getAthleteAuthHeaders();
        const [teamRes, meRes] = await Promise.all([
          fetch("/api/athlete/team", { headers }),
          fetch("/api/athlete/me", { headers }),
        ]);
        if (teamRes.ok) {
          const data = await teamRes.json();
          setTeam(data.team ?? null);
          setMembers(data.members ?? []);
          setCoaches(data.coaches ?? []);
        }
        if (meRes.ok) {
          const me = await meRes.json();
          setMyId(me.athlete?.id ?? null);
        }
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

  const headCoaches = coaches.filter((c) => c.kind === "coach");
  const assistCoaches = coaches.filter((c) => c.kind === "assist");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Mon équipe</h1>
      </div>

      {/* Team info card */}
      {team ? (
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-sky-800/20 to-slate-900/40 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-sky-400">
                Équipe
              </div>
              <div className="mt-1 text-2xl font-bold">{team.label}</div>
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                {team.niveau && (
                  <span className="rounded-xl border border-sky-500/30 bg-sky-500/15 px-2.5 py-0.5 font-medium text-sky-200">
                    {team.niveau}
                  </span>
                )}
                {team.type_code && (
                  <span className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-0.5 text-slate-300">
                    {team.type_code}
                  </span>
                )}
                {team.saison && (
                  <span className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-0.5 text-slate-300">
                    Saison {team.saison}
                  </span>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center">
              <div className="text-3xl font-bold text-sky-300">{members.length}</div>
              <div className="text-[11px] text-slate-400">
                athlète{members.length > 1 ? "s" : ""}
                {team.max_athletes ? ` / ${team.max_athletes}` : ""}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
          Informations d'équipe non disponibles.
        </div>
      )}

      {/* Coaches */}
      {coaches.length > 0 && (
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Encadrement
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {headCoaches.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500/30 text-sm font-bold text-sky-200 ring-1 ring-sky-500/40">
                  {c.prenom[0]}{c.nom[0]}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{c.prenom} {c.nom}</div>
                  <div className="text-[11px] font-medium text-sky-400">Coach</div>
                </div>
              </div>
            ))}
            {assistCoaches.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-purple-500/20 bg-purple-500/10 px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500/30 text-sm font-bold text-purple-200 ring-1 ring-purple-500/40">
                  {c.prenom[0]}{c.nom[0]}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{c.prenom} {c.nom}</div>
                  <div className="text-[11px] font-medium text-purple-400">Coach assistant·e</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Members */}
      <section>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Athlètes ({members.length})
        </h2>
        {members.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
            Aucun athlète enregistré.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => {
              const isMe = m.id === myId;
              return (
                <div
                  key={m.id}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                    isMe
                      ? "border-sky-500/40 bg-sky-500/15 ring-1 ring-sky-500/20"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <Avatar name={`${m.prenom} ${m.nom}`} />
                  <div>
                    <div className="text-sm font-medium text-white">
                      {m.prenom} {m.nom}
                    </div>
                    {isMe && (
                      <div className="text-[11px] font-semibold text-sky-400">Moi</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
