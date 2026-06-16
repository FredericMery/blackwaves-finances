"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ClubAthlete = {
  id: string;
  prenom: string | null;
  nom: string | null;
  equipe: string | null;
};

type Props = {
  eventId: string;
  eventTitle: string;
  registrationsOpen: boolean;
  clubTitle: string;
  clubText: string;
  externalTitle: string;
  externalText: string;
};

type Message = {
  type: "success" | "error";
  text: string;
} | null;

export default function EventRegistrationPanels({
  eventId,
  eventTitle,
  registrationsOpen,
  clubTitle,
  clubText,
  externalTitle,
  externalText,
}: Props) {
  const [parentLoggedIn, setParentLoggedIn] = useState(false);
  const [clubAthletes, setClubAthletes] = useState<ClubAthlete[]>([]);
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [clubBusy, setClubBusy] = useState(false);
  const [clubMessage, setClubMessage] = useState<Message>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [notes, setNotes] = useState("");
  const [externalBusy, setExternalBusy] = useState(false);
  const [externalMessage, setExternalMessage] = useState<Message>(null);

  const groupedAthletes = useMemo(() => {
    const grouped = new Map<string, ClubAthlete[]>();
    for (const athlete of clubAthletes) {
      const team = athlete.equipe || "Sans équipe";
      const list = grouped.get(team) || [];
      list.push(athlete);
      grouped.set(team, list);
    }
    return Array.from(grouped.entries());
  }, [clubAthletes]);

  useEffect(() => {
    let mounted = true;

    async function loadChildren() {
      setLoadingChildren(true);
      setParentLoggedIn(false);
      setClubAthletes([]);
      setSelectedAthleteIds([]);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        if (mounted) setLoadingChildren(false);
        return;
      }

      const response = await fetch("/api/events-club/my-athletes", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!mounted) return;

      if (!response.ok) {
        setLoadingChildren(false);
        return;
      }

      const json = await response.json();
      setParentLoggedIn(true);
      setClubAthletes((json?.athletes || []) as ClubAthlete[]);
      setLoadingChildren(false);
    }

    void loadChildren();

    return () => {
      mounted = false;
    };
  }, []);

  function toggleAthleteSelection(athleteId: string, checked: boolean) {
    setSelectedAthleteIds((prev) => {
      if (checked) {
        if (prev.includes(athleteId)) return prev;
        return [...prev, athleteId];
      }
      return prev.filter((id) => id !== athleteId);
    });
  }

  async function handleClubSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setClubMessage(null);

    if (!selectedAthleteIds.length) {
      setClubMessage({ type: "error", text: "Sélectionne au moins un enfant." });
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) {
      setClubMessage({ type: "error", text: "Tu dois être connecté pour inscrire un enfant." });
      return;
    }

    setClubBusy(true);

    try {
      let successCount = 0;
      const errors: string[] = [];

      for (const athleteId of selectedAthleteIds) {
        const res = await fetch("/api/events-club/register-club", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ eventId, athleteId }),
        });

        const json = await res.json();
        if (!res.ok) {
          errors.push(json?.error || "Inscription club impossible.");
          continue;
        }

        successCount += 1;
      }

      if (successCount) {
        setSelectedAthleteIds([]);
        setClubMessage({
          type: errors.length ? "error" : "success",
          text: errors.length
            ? `${successCount} inscription(s) validée(s) pour ${eventTitle}. ${errors[0]}`
            : `${successCount} inscription(s) validée(s) pour ${eventTitle}.`,
        });
      } else {
        setClubMessage({
          type: "error",
          text: errors[0] || "Inscription club impossible.",
        });
      }
    } catch (error: unknown) {
      setClubMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erreur réseau lors de l'inscription club.",
      });
    } finally {
      setClubBusy(false);
    }
  }

  async function handleExternalSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setExternalMessage(null);

    if (!fullName.trim() || !email.trim()) {
      setExternalMessage({
        type: "error",
        text: "Nom complet et email sont obligatoires.",
      });
      return;
    }

    setExternalBusy(true);

    try {
      const res = await fetch("/api/events-club/register-external", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          fullName,
          email,
          phone,
          city,
          birthYear,
          notes,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setExternalMessage({
          type: "error",
          text: json?.error || "Inscription externe impossible.",
        });
        return;
      }

      setExternalMessage({
        type: "success",
        text: json?.message || `Inscription externe validée pour ${eventTitle}.`,
      });
      setFullName("");
      setEmail("");
      setPhone("");
      setCity("");
      setBirthYear("");
      setNotes("");
    } catch (error: unknown) {
      setExternalMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Erreur réseau lors de l'inscription externe.",
      });
    } finally {
      setExternalBusy(false);
    }
  }

  const messageClass = (message: Message) =>
    message?.type === "success"
      ? "border-emerald-500/50 bg-emerald-900/30 text-emerald-50"
      : "border-rose-500/50 bg-rose-900/30 text-rose-50";

  const showClubPanel = parentLoggedIn;

  return (
    <div className={`grid gap-6 ${showClubPanel ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}>
      {showClubPanel && (
        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Club</p>
            <h3 className="mt-2 text-2xl font-bold text-slate-950">{clubTitle}</h3>
            <p className="mt-2 text-sm text-slate-600">{clubText}</p>
          </div>

          {loadingChildren ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Chargement de tes enfants...
            </div>
          ) : !registrationsOpen ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Les inscriptions sont actuellement fermées pour cet événement.
            </div>
          ) : !clubAthletes.length ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Aucun enfant associé à ton compte parent.
            </div>
          ) : (
            <form onSubmit={handleClubSubmit} className="space-y-4">
              <div className="space-y-3">
                {groupedAthletes.map(([team, athletes]) => (
                  <div key={team} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {team}
                    </div>
                    <div className="mt-2 space-y-2">
                      {athletes.map((athlete) => {
                        const label = `${athlete.prenom || ""} ${athlete.nom || ""}`.trim() || "Enfant";
                        const checked = selectedAthleteIds.includes(athlete.id);

                        return (
                          <label key={athlete.id} className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 text-sm text-slate-800">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => toggleAthleteSelection(athlete.id, e.target.checked)}
                              className="h-4 w-4"
                            />
                            <span>{label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {clubMessage && (
                <div className={`rounded-2xl border px-4 py-3 text-sm ${messageClass(clubMessage)}`}>
                  {clubMessage.text}
                </div>
              )}

              <button
                type="submit"
                disabled={clubBusy || !registrationsOpen || !selectedAthleteIds.length}
                className="inline-flex rounded-full bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {clubBusy ? "Inscription..." : "Inscrire les enfants sélectionnés"}
              </button>
            </form>
          )}
        </section>
      )}

      <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-700">Externe</p>
          <h3 className="mt-2 text-2xl font-bold text-slate-950">{externalTitle}</h3>
          <p className="mt-2 text-sm text-slate-600">{externalText}</p>
        </div>

        {!registrationsOpen ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Les inscriptions sont actuellement fermées pour cet événement.
          </div>
        ) : (
          <form onSubmit={handleExternalSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-pink-500"
                placeholder="Nom complet *"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-pink-500"
                placeholder="Email *"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-pink-500"
                placeholder="Téléphone"
              />
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-pink-500"
                placeholder="Ville"
              />
              <input
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                inputMode="numeric"
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-pink-500 sm:col-span-2"
                placeholder="Année de naissance"
              />
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-pink-500"
              placeholder="Informations complémentaires"
            />

            {externalMessage && (
              <div className={`rounded-2xl border px-4 py-3 text-sm ${messageClass(externalMessage)}`}>
                {externalMessage.text}
              </div>
            )}

            <button
              type="submit"
              disabled={externalBusy || !registrationsOpen}
              className="inline-flex rounded-full bg-pink-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-pink-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {externalBusy ? "Inscription..." : "Inscrire un participant externe"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
