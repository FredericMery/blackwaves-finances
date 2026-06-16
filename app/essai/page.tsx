"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

type StatusMessage = {
  type: "success" | "error";
  text: string;
} | null;

function cleanInput(value: string) {
  return value.trim();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hasFutureDate(dateValue: string) {
  if (!dateValue) return false;
  const selected = new Date(dateValue);
  if (Number.isNaN(selected.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return selected > today;
}

function normalizePhone(value: string) {
  return value.replace(/\s+/g, "").trim();
}

function mapApiError(errorCode?: string) {
  switch (errorCode) {
    case "INVALID_BODY":
      return "La requête envoyée est invalide. Merci de réessayer.";
    case "CHILD_FIELDS_MISSING":
      return "Merci de compléter toutes les informations de l’enfant.";
    case "PARENT_FIELDS_MISSING":
      return "Merci de compléter toutes les coordonnées du parent.";
    case "INVALID_EMAIL":
      return "L’adresse e-mail renseignée n’est pas valide.";
    case "SUPABASE_CONFIG_MISSING":
      return "Le service d’inscription est momentanément indisponible. Réessaie un peu plus tard.";
    case "DB_INSERT_FAILED":
      return "Impossible d’enregistrer la demande pour le moment. Merci de réessayer un peu plus tard.";
    default:
      return "Une erreur est survenue. Merci de réessayer un peu plus tard ou de contacter le club.";
  }
}

export default function EssaiPage() {
  const router = useRouter();

  // Champs enfant
  const [childFirstName, setChildFirstName] = useState("");
  const [childLastName, setChildLastName] = useState("");
  const [childBirthdate, setChildBirthdate] = useState("");

  // Champs équipe
  const [wantedTeam, setWantedTeam] = useState("");

  // Champs parent
  const [parentFirstName, setParentFirstName] = useState("");
  const [parentLastName, setParentLastName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");

  // Commentaires
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<StatusMessage>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);

    const payload = {
      childFirstName: cleanInput(childFirstName),
      childLastName: cleanInput(childLastName),
      childBirthdate: cleanInput(childBirthdate),
      wantedTeam: cleanInput(wantedTeam),
      parentFirstName: cleanInput(parentFirstName),
      parentLastName: cleanInput(parentLastName),
      parentEmail: cleanInput(parentEmail).toLowerCase(),
      parentPhone: normalizePhone(parentPhone),
      notes: cleanInput(notes),
    };

    if (hasFutureDate(payload.childBirthdate)) {
      setMessage({
        type: "error",
        text: "La date de naissance de l’enfant ne peut pas être dans le futur.",
      });
      return;
    }

    if (!isValidEmail(payload.parentEmail)) {
      setMessage({
        type: "error",
        text: "Merci de renseigner une adresse e-mail valide.",
      });
      return;
    }

    if (payload.parentPhone.replace(/\D/g, "").length < 10) {
      setMessage({
        type: "error",
        text: "Merci de renseigner un numéro de téléphone valide (10 chiffres minimum).",
      });
      return;
    }

    setIsSubmitting(true);

    let timeout: ReturnType<typeof setTimeout> | undefined;

    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 15000);

      const res = await fetch("/api/trial-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const contentType = res.headers.get("content-type") ?? "";
      const j = contentType.includes("application/json")
        ? await res.json().catch(() => null)
        : null;

      if (!res.ok || !j?.ok) {
        console.error("trial-request error:", res.status, j);
        setMessage({
          type: "error",
          text: mapApiError(j?.error),
        });
        return;
      }

      const trialNotice = j?.parentEmailOk === false ? "ok-no-mail" : "ok";
      router.push(`/club?trial=${trialNotice}`);
      return;
    } catch (err) {
      console.error(err);
      setMessage({
        type: "error",
        text:
          err instanceof DOMException && err.name === "AbortError"
            ? "Le serveur met trop de temps à répondre. Merci de réessayer dans quelques instants."
            : "Une erreur est survenue. Merci de réessayer un peu plus tard ou de contacter le club.",
      });
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50 py-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* En-tête */}
        <div className="mb-10">
          <p className="text-xs tracking-[0.35em] text-pink-400 mb-3 uppercase">
            Inscription Black Waves
          </p>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Demande de cours d’essai
          </h1>
          <p className="text-sm md:text-base text-slate-300 max-w-2xl">
            Remplissez ce formulaire pour demander un cours d’essai pour votre
            enfant. Nous vous recontacterons rapidement avec une proposition de
            créneau adaptée à son âge et à son niveau.
          </p>
        </div>

        {/* Message global */}
        {message && (
          <div
            className={`mb-6 rounded-xl border px-4 py-3 text-sm md:text-base ${
              message.type === "error"
                ? "border-red-500/50 bg-red-500/10 text-red-100"
                : "border-emerald-500/50 bg-emerald-500/10 text-emerald-100"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Carte formulaire */}
        <div className="bg-slate-900/60 border border-slate-700/70 rounded-2xl shadow-2xl shadow-black/40 backdrop-blur-md p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <fieldset disabled={isSubmitting} className="space-y-8 disabled:opacity-95">
            {/* Bloc enfant */}
            <section>
              <h2 className="text-lg font-semibold mb-4 text-slate-100">
                Informations sur l’enfant
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Prénom de l’enfant *
                  </label>
                  <input
                    type="text"
                    required
                    value={childFirstName}
                    onChange={(e) => setChildFirstName(e.target.value)}
                    maxLength={80}
                    className="w-full rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/70 focus:border-pink-400 placeholder:text-slate-500"
                    placeholder="Clara"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nom de l’enfant *
                  </label>
                  <input
                    type="text"
                    required
                    value={childLastName}
                    onChange={(e) => setChildLastName(e.target.value)}
                    maxLength={80}
                    className="w-full rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/70 focus:border-pink-400 placeholder:text-slate-500"
                    placeholder="Dupont"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Date de naissance de l’enfant *
                  </label>
                  <input
                    type="date"
                    required
                    value={childBirthdate}
                    onChange={(e) => setChildBirthdate(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className="w-full rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/70 focus:border-pink-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Équipe / catégorie souhaitée (si vous avez une idée)
                  </label>
                  <select
                    value={wantedTeam}
                    onChange={(e) => setWantedTeam(e.target.value)}
                    className="w-full rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/70 focus:border-pink-400 text-slate-100"
                  >
                    <option value="">Je ne sais pas encore</option>
                    <option value="Tinys">Tinys</option>
                    <option value="Minimes">Minimes</option>
                    <option value="Cadets">Cadets</option>
                    <option value="Juniors">Juniors</option>
                    <option value="Seniors">Seniors</option>
                    <option value="Loisirs">Loisirs</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Bloc parent */}
            <section>
              <h2 className="text-lg font-semibold mb-4 text-slate-100">
                Coordonnées du parent
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Prénom du parent *
                  </label>
                  <input
                    type="text"
                    required
                    value={parentFirstName}
                    onChange={(e) => setParentFirstName(e.target.value)}
                    maxLength={80}
                    className="w-full rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/70 focus:border-pink-400 placeholder:text-slate-500"
                    placeholder="Prénom"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nom du parent *
                  </label>
                  <input
                    type="text"
                    required
                    value={parentLastName}
                    onChange={(e) => setParentLastName(e.target.value)}
                    maxLength={80}
                    className="w-full rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/70 focus:border-pink-400 placeholder:text-slate-500"
                    placeholder="Nom"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    E-mail du parent *
                  </label>
                  <input
                    type="email"
                    required
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    maxLength={160}
                    className="w-full rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/70 focus:border-pink-400 placeholder:text-slate-500"
                    placeholder="parent@email.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Téléphone du parent *
                  </label>
                  <input
                    type="tel"
                    required
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    inputMode="tel"
                    maxLength={20}
                    className="w-full rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/70 focus:border-pink-400 placeholder:text-slate-500"
                    placeholder="06…"
                  />
                </div>
              </div>
            </section>

            {/* Bloc commentaires */}
            <section>
              <h2 className="text-lg font-semibold mb-4 text-slate-100">
                Informations complémentaires
              </h2>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Commentaire / précisions (optionnel)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  maxLength={1500}
                  className="w-full rounded-xl border border-slate-600 bg-slate-900/70 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/70 focus:border-pink-400 placeholder:text-slate-500 resize-none"
                  placeholder="Niveau de pratique, contraintes particulières, remarques…"
                />
              </div>
            </section>

            {/* Actions */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-2">
              <p className="text-xs text-slate-400 max-w-md">
                En envoyant ce formulaire, vous acceptez que le club vous
                contacte par e-mail et/ou téléphone pour organiser le cours
                d’essai de votre enfant.
              </p>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-full bg-pink-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-pink-500/40 hover:bg-pink-400 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {isSubmitting ? "Envoi en cours…" : "Envoyer ma demande"}
              </button>
            </div>
            </fieldset>
          </form>
        </div>
      </div>
    </div>
  );
}
