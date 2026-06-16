"use client";

import { useState, FormEvent } from "react";

export default function QuestionsClubPage() {
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [childName, setChildName] = useState("");
  const [team, setTeam] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // Ici, plus tard : appel API / enregistrement en base / envoi mail
    console.log({
      topic,
      message,
      contactEmail,
      childName,
      team,
    });
    setSubmitted(true);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pb-16">
      {/* En-tête */}
      <div className="mt-10 mb-6">
        <p className="text-xs uppercase tracking-[0.3em] text-blue-500">
          Espace parent
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mt-2">
          Questions au club
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          Utilisez ce formulaire pour poser vos questions au club : organisation,
          planning, compétitions, tenue, etc.
        </p>
      </div>

      {/* Formulaire */}
      <div className="bg-white rounded-2xl shadow-md border border-neutral-200 p-5 md:p-6">
        {submitted ? (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
            Merci, votre message a bien été enregistré.  
            <span className="block text-xs mt-1">
              Le club vous répondra dans les meilleurs délais.
            </span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 text-sm">
            {/* Infos parent / enfant */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Nom / Prénom de l&apos;enfant
                </label>
                <input
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/80 focus:border-blue-500"
                  placeholder="[Nom / Prénom]"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Équipe de l&apos;enfant
                </label>
                <input
                  type="text"
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/80 focus:border-blue-500"
                  placeholder="[Nom de l'équipe]"
                  required
                />
              </div>
            </div>

            {/* Contact email */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Votre adresse e-mail
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/80 focus:border-blue-500"
                placeholder="parent@email.com"
                required
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                Cette adresse sera utilisée pour vous répondre.
              </p>
            </div>

            {/* Sujet */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Sujet de votre question
              </label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/80 focus:border-blue-500 bg-white"
                required
              >
                <option value="">Sélectionnez un sujet</option>
                <option value="planning">Planning / entraînements</option>
                <option value="competition">Compétitions / déplacements</option>
                <option value="tenue">Tenue / uniforme</option>
                <option value="inscription">Inscriptions / licence</option>
                <option value="sante">Santé / sécurité</option>
                <option value="autre">Autre question</option>
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Votre question
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/80 focus:border-blue-500 resize-y min-h-[120px]"
                placeholder="Expliquez votre question ou votre situation le plus clairement possible."
                required
              />
              <p className="text-[11px] text-neutral-500 mt-1">
                Merci d&apos;indiquer les dates, horaires et équipes concernées si
                nécessaire.
              </p>
            </div>

            {/* Bouton */}
            <div className="pt-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-blue-600 text-white text-sm font-semibold shadow-md hover:bg-blue-700 transition"
              >
                Envoyer ma question au club
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Bas de page : autres moyens de contact */}
      <div className="mt-8 bg-white rounded-2xl shadow-md border border-neutral-200 p-5 md:p-6 text-xs text-neutral-600">
        <h2 className="text-sm font-semibold text-neutral-800 mb-3">
          Autres moyens de contact
        </h2>
        <p>
          Pour les urgences liées à un entraînement en cours, merci de contacter
          directement le coach de l&apos;équipe ou un membre du bureau.
        </p>
        <p className="mt-2">
          Les coordonnées officielles (adresse e-mail du club, téléphone du
          bureau, réseaux sociaux) sont disponibles sur la page{" "}
          <a href="/contact" className="text-blue-600 font-semibold hover:underline">
            Contact
          </a>
          .
        </p>
      </div>
    </div>
  );
}
