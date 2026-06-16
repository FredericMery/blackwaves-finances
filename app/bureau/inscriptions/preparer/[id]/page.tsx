// app/bureau/inscriptions/preparer/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";

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
};

type LoadStatus = "loading" | "ready" | "error" | "saving" | "saved";

function computeSeasonLabel(d = new Date()) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const start = m >= 8 ? y : y - 1;
  return `${start}-${start + 1}`;
}

function normalizeSeason(input: string | null) {
  if (!input) return null;
  const s = input.trim();

  // Format attendu: YYYY-YYYY
  const m = s.match(/^(\d{4})-(\d{4})$/);
  if (!m) return null;

  const a = Number(m[1]);
  const b = Number(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (b !== a + 1) return null; // robustesse
  if (a < 2000 || a > 2100) return null;

  return `${a}-${b}`;
}

export default function BureauInscriptionPreparerPage() {
  const params = useParams<{ id: string }>();
  const trialId = params?.id;
  const router = useRouter();
  const searchParams = useSearchParams();

  // ✅ Saison lue depuis l’URL
  const seasonFromUrl = useMemo(() => {
    const raw = searchParams?.get("season") ?? null;
    return normalizeSeason(raw);
  }, [searchParams]);

  const season = seasonFromUrl || computeSeasonLabel();

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [trial, setTrial] = useState<TrialRequest | null>(null);

  // Chargement de la demande d’essai
  useEffect(() => {
    const load = async () => {
      if (!trialId || typeof trialId !== "string") {
        setError("Identifiant de demande d’essai introuvable dans l’URL.");
        setStatus("error");
        return;
      }

      setStatus("loading");
      setError(null);
      setSuccessMessage(null);

      try {
        const res = await fetch(
          `/api/get-trial-request?id=${encodeURIComponent(trialId)}`
        );
        const data = await res.json();

        if (!res.ok) {
          setError(
            data.error ||
              "Impossible de charger la demande d’essai. Merci de réessayer."
          );
          setStatus("error");
          return;
        }

        setTrial(data.request as TrialRequest);
        setStatus("ready");
      } catch (err: any) {
        setError(
          err?.message ||
            "Erreur réseau lors du chargement de la demande d’essai."
        );
        setStatus("error");
      }
    };

    load();
  }, [trialId]);

  // 🔁 Quand la fiche est envoyée → retour à la liste après 3 s
  useEffect(() => {
    if (status !== "saved") return;

    const timer = setTimeout(() => {
      router.push("/bureau/inscriptions");
    }, 3000);

    return () => clearTimeout(timer);
  }, [status, router]);

  const formatDate = (value: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("fr-FR");
  };

  const getAge = (value: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";

    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
      age--;
    }

    return `${age} ans`;
  };

  // Bouton "Préparer la fiche"
  const handlePrepare = async () => {
    setError(null);
    setSuccessMessage(null);

    if (!trial) {
      setError(
        "Impossible de préparer la fiche : la demande d’essai n’a pas été chargée."
      );
      return;
    }

    setStatus("saving");

    try {
      const res = await fetch("/api/prepare-trial-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // ✅ on envoie la saison choisie depuis la liste
        body: JSON.stringify({ trial_id: trial.id, season }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error ||
            "Impossible de préparer la fiche d’inscription. Merci de réessayer."
        );
        setStatus("error");
        return;
      }

      setSuccessMessage(
        data.message ||
          "La fiche d’inscription parent a été générée et l’e-mail a été envoyé."
      );
      setStatus("saved");
    } catch (err: any) {
      setError(
        err?.message ||
          "Erreur réseau lors de la préparation de la fiche d’inscription."
      );
      setStatus("error");
    }
  };

  const isSaving = status === "saving" || status === "saved";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-10">
        {/* Header */}
        <header className="mb-6 border-b border-white/5 pb-4">
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-400">
            Espace bureau • Inscriptions
          </div>

          <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h1 className="text-3xl font-bold">
              Préparer la fiche d’inscription parent
            </h1>

            {/* ✅ Badge saison */}
            <span className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
              Saison&nbsp;
              <span className="ml-1 font-semibold text-slate-50">{season}</span>
            </span>
          </div>

          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Cette étape permet de générer un lien unique d’inscription parent à
            partir de la demande d’essai, puis d’envoyer un email automatique
            avec toutes les informations nécessaires.
          </p>

          {!seasonFromUrl && (
            <p className="mt-2 text-xs text-amber-200/90">
              Note : aucune saison valide n’a été transmise dans l’URL — saison
              appliquée par défaut ({computeSeasonLabel()}).
            </p>
          )}
        </header>

        <div className="mb-4">
          <Link
            href="/bureau/inscriptions"
            className="inline-flex items-center rounded-full border border-slate-600 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 hover:border-slate-400"
          >
            ← Retour à la liste
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/60 bg-rose-900/40 px-4 py-3 text-sm text-rose-50">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded-xl border border-emerald-500/60 bg-emerald-900/40 px-4 py-3 text-sm text-emerald-50">
            {successMessage}
            <span className="ml-2 text-xs text-emerald-200">
              (redirection vers le tableau dans 3 secondes…)
            </span>
          </div>
        )}

        {status === "loading" && (
          <div className="rounded-xl border border-sky-500/40 bg-sky-900/30 px-4 py-3 text-sm text-sky-50">
            Chargement de la demande d’essai…
          </div>
        )}

        {(status === "ready" || status === "saving" || status === "saved") &&
          trial && (
            <div className="space-y-6">
              {/* Récap enfant / parent */}
              <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-sky-500/40 bg-slate-900/70 p-4">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-sky-300">
                    Enfant
                  </h2>
                  <p className="mt-2 text-sm font-medium text-slate-50">
                    {trial.child_first_name} {trial.child_last_name}
                  </p>
                  <p className="mt-1 text-sm text-slate-200">
                    Date de naissance :{" "}
                    <span className="font-semibold">
                      {formatDate(trial.child_birthdate)}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    Âge : {getAge(trial.child_birthdate)}
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    Équipe / catégorie souhaitée :{" "}
                    <span className="font-semibold">
                      {trial.wanted_team || "Non renseigné"}
                    </span>
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    Date de demande : {formatDate(trial.created_at)}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-500/40 bg-slate-900/70 p-4">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                    Parent
                  </h2>
                  <p className="mt-2 text-sm font-medium text-slate-50">
                    {trial.parent_first_name} {trial.parent_last_name}
                  </p>
                  <p className="mt-1 text-sm text-slate-200">
                    Email :{" "}
                    <span className="font-semibold">{trial.parent_email}</span>
                  </p>
                  <p className="mt-1 text-sm text-slate-200">
                    Téléphone :{" "}
                    <span className="font-semibold">
                      {trial.parent_phone || "-"}
                    </span>
                  </p>
                  {trial.notes && (
                    <p className="mt-2 text-xs text-slate-300">
                      Notes : {trial.notes}
                    </p>
                  )}
                </div>
              </section>

              {/* Bloc action */}
              <section className="rounded-2xl border border-emerald-500/50 bg-emerald-900/20 p-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-emerald-300">
                  Préparer et envoyer la fiche d’inscription
                </h2>
                <p className="mt-2 text-sm text-emerald-100">
                  Cette action va générer un lien unique d’inscription parent,
                  mettre à jour la demande et envoyer un email automatique au
                  parent avec toutes les informations nécessaires.
                </p>

                <div className="mt-3 text-xs text-emerald-100/90">
                  Saison utilisée pour l’inscription :{" "}
                  <span className="font-semibold text-white">{season}</span>
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handlePrepare}
                    disabled={isSaving}
                    className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/40 hover:bg-emerald-600 disabled:opacity-60"
                  >
                    {status === "saved"
                      ? "Fiche envoyée"
                      : isSaving
                      ? "Préparation en cours…"
                      : "Préparer la fiche d’inscription"}
                  </button>
                </div>
              </section>
            </div>
          )}
      </div>
    </div>
  );
}
