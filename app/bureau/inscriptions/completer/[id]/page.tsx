"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type TrialStatus =
  | "draft"
  | "pending"
  | "parent-pending"
  | "parent-created"
  | "scheduled"
  | "converted";

type TrialRequest = {
  id: string;
  child_first_name: string;
  child_last_name: string;
  child_birthdate: string | null;
  wanted_team: string | null;
  parent_first_name: string;
  parent_last_name: string;
  parent_email: string;
  parent_phone: string;
  notes: string | null;
  status: TrialStatus;
  created_at: string;
  registration_token: string | null;
};

type Registration = {
  id: string;
  token: string;
  email_parent: string;
  telephone: string | null;
  adresse: string | null;
  nom_enfant: string;
  prenom_enfant: string;
  date_naissance: string | null;
  autorisation_photo: boolean;
  autorisation_video: boolean;
  statut: string;
  created_at: string;
};

type LoadStatus = "loading" | "error" | "ready" | "saving" | "saved";

export default function BureauInscriptionCompleterPage() {
  // 🔑 On lit l'id directement dans l'URL
  const params = useParams();
  const rawId = (params as any)?.id;
  const id =
    typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const [trial, setTrial] = useState<TrialRequest | null>(null);
  const [registration, setRegistration] = useState<Registration | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ✅ Nouveau : feedback spécifique email / accès parent
  const [parentAccessMessage, setParentAccessMessage] = useState<string | null>(
    null
  );
  const [parentAccessWarning, setParentAccessWarning] = useState<string | null>(
    null
  );

  // Chargement initial
  useEffect(() => {
    const load = async () => {
      setStatus("loading");
      setError(null);
      setSuccessMessage(null);
      setParentAccessMessage(null);
      setParentAccessWarning(null);

      try {
        const res = await fetch(`/api/get-full-registration?trial_id=${id}`);
        const data = await res.json();

        if (!res.ok) {
          setError(
            data.error || "Impossible de charger les informations d’inscription."
          );
          setStatus("error");
          return;
        }

        setTrial(data.trial as TrialRequest);
        setRegistration((data.registration || null) as Registration | null);

        setStatus("ready");
      } catch (err: any) {
        setError(
          err?.message ||
            "Erreur réseau lors du chargement des informations d’inscription."
        );
        setStatus("error");
      }
    };

    if (id) {
      load();
    } else {
      setError("Identifiant de demande d’essai manquant dans l’URL.");
      setStatus("error");
    }
  }, [id]);

  const handleConfirm = async () => {
    if (!trial) return;

    setError(null);
    setSuccessMessage(null);
    setParentAccessMessage(null);
    setParentAccessWarning(null);
    setStatus("saving");

    try {
      // ✅ 1) On garde ton fonctionnement actuel : confirm-registration
      const res = await fetch("/api/confirm-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ trial_id: trial.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error ||
            "Impossible de finaliser l’inscription. Merci de réessayer."
        );
        setStatus("error");
        return;
      }

      // Mettre à jour l’état local (inchangé)
      setTrial((prev) => (prev ? { ...prev, status: "converted" } : prev));
      setRegistration((prev) => (prev ? { ...prev, statut: "valide" } : prev));

      setSuccessMessage(data.message || "Inscription finalisée avec succès.");

      // ✅ 2) Ensuite seulement : génération du magic link + email parent
      // ⚠️ Si ça échoue, on ne casse pas la validation.
      try {
        const res2 = await fetch("/api/convert-trial-to-member", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trial_id: trial.id }),
        });

        const data2 = await res2.json().catch(() => ({} as any));

        if (!res2.ok) {
          setParentAccessWarning(
            data2?.error ||
              "Inscription validée, mais l’email d’accès parent n’a pas pu être envoyé. Vous pouvez relancer l’envoi."
          );
        } else {
          setParentAccessMessage(
            "Email d’accès à l’espace parent envoyé (magic link)."
          );
        }
      } catch (e: any) {
        setParentAccessWarning(
          e?.message ||
            "Inscription validée, mais l’email d’accès parent n’a pas pu être envoyé (erreur réseau)."
        );
      }

      setStatus("saved");
    } catch (err: any) {
      setError(
        err?.message || "Erreur réseau lors de la finalisation de l’inscription."
      );
      setStatus("error");
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("fr-FR");
  };

  const disabled = status === "saving" || status === "saved";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-10">
        {/* Header */}
        <header className="mb-6 border-b border-white/5 pb-4">
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-400">
            Espace bureau • Inscriptions
          </div>
          <h1 className="mt-2 text-3xl font-bold">Finaliser l’inscription</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Vérifiez les informations de la demande d’essai et de la fiche
            parent, puis validez l’inscription définitive.
          </p>
        </header>

        <div className="mb-4 flex items-center justify-between gap-2">
          <Link
            href="/bureau/inscriptions"
            className="inline-flex items-center rounded-full border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 hover:border-slate-400"
          >
            ← Retour à la liste
          </Link>
          {trial && (
            <div className="text-[11px] text-slate-400">
              Demande d’essai n°{" "}
              <span className="font-mono text-slate-200">{trial.id}</span>
            </div>
          )}
        </div>

        {status === "loading" && (
          <div className="rounded-xl border border-sky-500/40 bg-sky-900/30 px-4 py-3 text-sm text-sky-50">
            Chargement des informations d’inscription…
          </div>
        )}

        {status === "error" && error && (
          <div className="mb-4 rounded-xl border border-rose-500/60 bg-rose-900/40 px-4 py-3 text-sm text-rose-50">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded-xl border border-emerald-500/60 bg-emerald-900/40 px-4 py-3 text-sm text-emerald-50">
            {successMessage}
          </div>
        )}

        {/* ✅ Nouveau feedback magic link */}
        {parentAccessMessage && (
          <div className="mb-4 rounded-xl border border-emerald-500/60 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-50">
            {parentAccessMessage}
          </div>
        )}
        {parentAccessWarning && (
          <div className="mb-4 rounded-xl border border-amber-500/60 bg-amber-900/30 px-4 py-3 text-sm text-amber-50">
            {parentAccessWarning}
          </div>
        )}

        {(status === "ready" || status === "saving" || status === "saved") &&
          trial && (
            <div className="space-y-6">
              {/* Bloc récap enfant / essai */}
              <section className="rounded-2xl border border-indigo-500/40 bg-slate-900/60 p-4 shadow-lg shadow-black/40">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">
                  Récapitulatif de la demande d’essai
                </h2>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-indigo-500/30 bg-slate-950/40 p-4 text-sm">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-300">
                      Enfant
                    </h3>
                    <p className="text-slate-100">
                      {trial.child_first_name} {trial.child_last_name}
                    </p>
                    <p className="mt-1 text-slate-300">
                      Date de naissance :{" "}
                      <span className="font-medium">
                        {formatDate(trial.child_birthdate)}
                      </span>
                    </p>
                    <p className="mt-1 text-slate-300">
                      Équipe / catégorie souhaitée :{" "}
                      <span className="font-medium">
                        {trial.wanted_team || "-"}
                      </span>
                    </p>
                    <p className="mt-1 text-slate-400 text-xs">
                      Date de demande : {formatDate(trial.created_at)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-500/30 bg-slate-950/40 p-4 text-sm">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-300">
                      Parent (demande d’essai)
                    </h3>
                    <p className="text-slate-100">
                      {trial.parent_first_name} {trial.parent_last_name}
                    </p>
                    <p className="mt-1 text-slate-300">
                      Email :{" "}
                      <span className="font-medium">{trial.parent_email}</span>
                    </p>
                    <p className="mt-1 text-slate-300">
                      Téléphone :{" "}
                      <span className="font-medium">
                        {trial.parent_phone || "-"}
                      </span>
                    </p>
                    {trial.notes && (
                      <p className="mt-2 text-xs text-slate-400">
                        Notes : {trial.notes}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-slate-400">
                      Statut de la demande :{" "}
                      <span className="font-semibold text-slate-100">
                        {trial.status}
                      </span>
                    </p>
                  </div>
                </div>
              </section>

              {/* Bloc fiche parent */}
              <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-lg shadow-black/40">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">
                  Fiche d’inscription parent
                </h2>

                {!registration && (
                  <p className="mt-3 text-sm text-amber-300">
                    Aucune fiche d’inscription parent trouvée pour ce dossier.
                    Demandez au parent de compléter sa fiche via le lien envoyé
                    par email.
                  </p>
                )}

                {registration && (
                  <div className="mt-3 grid gap-4 md:grid-cols-2 text-sm">
                    <div className="rounded-xl border border-slate-600/40 bg-slate-950/40 p-4">
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
                        Informations parent
                      </h3>
                      <p className="text-slate-100">
                        Email :{" "}
                        <span className="font-medium">
                          {registration.email_parent}
                        </span>
                      </p>
                      <p className="mt-1 text-slate-100">
                        Téléphone :{" "}
                        <span className="font-medium">
                          {registration.telephone || "-"}
                        </span>
                      </p>
                      <p className="mt-2 text-slate-100 whitespace-pre-line">
                        Adresse :{" "}
                        <span className="font-medium">
                          {registration.adresse || "-"}
                        </span>
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        Statut fiche :{" "}
                        <span className="font-semibold text-slate-100">
                          {registration.statut}
                        </span>
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-600/40 bg-slate-950/40 p-4">
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
                        Informations enfant (fiche)
                      </h3>
                      <p className="text-slate-100">
                        {registration.prenom_enfant} {registration.nom_enfant}
                      </p>
                      <p className="mt-1 text-slate-300">
                        Date de naissance :{" "}
                        <span className="font-medium">
                          {formatDate(registration.date_naissance)}
                        </span>
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        Autorisation photo :{" "}
                        <span className="font-semibold text-slate-100">
                          {registration.autorisation_photo ? "Oui" : "Non"}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Autorisation vidéo :{" "}
                        <span className="font-semibold text-slate-100">
                          {registration.autorisation_video ? "Oui" : "Non"}
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </section>

              {/* Bloc validation */}
              <section className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
                  Valider l’inscription
                </h2>
                <p className="mt-2 text-sm text-emerald-100">
                  En validant l’inscription, la demande passera au statut{" "}
                  <span className="font-semibold">converti</span> et la fiche
                  parent au statut <span className="font-semibold">valide</span>.
                  Ensuite, un email d’accès (magic link) sera envoyé au parent.
                </p>

                {!registration && (
                  <p className="mt-2 text-xs text-amber-300">
                    Attention : aucune fiche parent n’est associée. Il est
                    recommandé d’attendre que le parent ait complété sa fiche
                    avant de valider.
                  </p>
                )}

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={disabled || !registration}
                    className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40 hover:bg-emerald-600 disabled:opacity-60"
                  >
                    {status === "saving"
                      ? "Validation en cours…"
                      : status === "saved"
                      ? "Inscription validée"
                      : "Valider l’inscription"}
                  </button>
                </div>
              </section>
            </div>
          )}
      </div>
    </div>
  );
}
