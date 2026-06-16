"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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

  // champs de planning d’essai
  team_selected: string | null;
  trial_date: string | null;
  trial_time: string | null;
  trial_location: string | null;
  saison: string | null;
};

type LoadStatus = "idle" | "loading" | "success" | "error";

function computeSeasonLabel(d = new Date()) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const start = m >= 8 ? y : y - 1;
  return `${start}-${start + 1}`;
}

function seasonOptions() {
  const current = computeSeasonLabel();
  const start = Number(current.split("-")[0]);
  return [
    `${start - 1}-${start}`,
    `${start}-${start + 1}`,
    `${start + 1}-${start + 2}`,
  ];
}

const TEAM_OPTIONS = [
  { key: "Tiny", label: "Tiny" },
  { key: "Minimes", label: "Minimes" },
  { key: "Cadets", label: "Cadets" },
  { key: "Juniors", label: "Juniors" },
  { key: "Senior", label: "Senior" },
];

const STEPS: { key: TrialStatus; label: string }[] = [
  { key: "draft", label: "Brouillon" },
  { key: "pending", label: "À traiter" },
  { key: "parent-pending", label: "Lien parent" },
  { key: "parent-created", label: "Compte parent" },
  { key: "scheduled", label: "Essai planifié" },
  { key: "converted", label: "Converti" },
];

function stepIndex(status: TrialStatus) {
  const idx = STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

function computePillClass(kind: "neutral" | "info" | "success" | "warning") {
  switch (kind) {
    case "info":
      return "bg-sky-600/20 text-sky-100 border-sky-500/30";
    case "success":
      return "bg-emerald-600/20 text-emerald-100 border-emerald-500/30";
    case "warning":
      return "bg-amber-600/20 text-amber-100 border-amber-500/30";
    default:
      return "bg-slate-700/40 text-slate-100 border-white/10";
  }
}

const SEASON_STORAGE_KEY = "bw_bureau_trial_seasons";

export default function BureauInscriptionsPage() {
  const [requests, setRequests] = useState<TrialRequest[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>("idle");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [convertingId, setConvertingId] = useState<string | null>(null); // (inchangé, même si non utilisé ici)
  const [convertMessage, setConvertMessage] = useState<string | null>(null);
  const [convertError, setConvertError] = useState<string | null>(null);

  const [notifyMessage, setNotifyMessage] = useState<string | null>(null);
  const [notifyError, setNotifyError] = useState<string | null>(null);
  const [notifyingId, setNotifyingId] = useState<string | null>(null);

  // états pour la planification d’essai
  const [teamSelections, setTeamSelections] = useState<Record<string, string>>(
    {}
  );
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedTrialIds, setSelectedTrialIds] = useState<string[]>([]);
  const [deletingMany, setDeletingMany] = useState(false);

  // ✅ saison (pilotée par le bureau) — une valeur par demande
  const [seasonByTrialId, setSeasonByTrialId] = useState<
    Record<string, string>
  >({});

  const seasons = useMemo(() => seasonOptions(), []);
  const defaultSeason = useMemo(() => computeSeasonLabel(), []);

  const deletableRequests = useMemo(
    () => requests.filter((r) => r.status !== "converted"),
    [requests]
  );
  const selectedDeletableCount = useMemo(
    () =>
      deletableRequests.filter((r) => selectedTrialIds.includes(r.id)).length,
    [deletableRequests, selectedTrialIds]
  );
  const allDeletableSelected =
    deletableRequests.length > 0 &&
    selectedDeletableCount === deletableRequests.length;

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

  // Chargement des demandes
  useEffect(() => {
    const load = async () => {
      setLoadStatus("loading");
      setLoadError(null);

      try {
        const res = await fetch("/api/get-all-trial-requests");
        const data = await res.json();

        if (!res.ok) {
          setLoadError(data.error || "Erreur inconnue lors du chargement.");
          setLoadStatus("error");
          return;
        }

        const list = (data.requests || []) as TrialRequest[];
        setRequests(list);

        // pré-remplir la sélection d’équipe si déjà choisie
        const initialTeams: Record<string, string> = {};
        list.forEach((r) => {
          if (r.team_selected) {
            initialTeams[r.id] = r.team_selected;
          } else if (r.wanted_team) {
            initialTeams[r.id] = r.wanted_team;
          }
        });
        setTeamSelections(initialTeams);

        // Pré-remplir la saison depuis la demande si disponible, sinon défaut.
        let persistedSeasons: Record<string, string> = {};
        try {
          const raw = window.localStorage.getItem(SEASON_STORAGE_KEY);
          persistedSeasons = raw ? JSON.parse(raw) : {};
        } catch {
          persistedSeasons = {};
        }

        const initialSeasons: Record<string, string> = {};
        list.forEach((r) => {
          const fromDb =
            typeof r.saison === "string" && r.saison.trim().length > 0
              ? r.saison
              : "";
          const fromStorage =
            typeof persistedSeasons[r.id] === "string"
              ? persistedSeasons[r.id]
              : "";

          initialSeasons[r.id] = fromStorage || fromDb || defaultSeason;
        });
        setSeasonByTrialId(initialSeasons);

        setLoadStatus("success");
      } catch (err: any) {
        setLoadError(err.message || "Erreur réseau.");
        setLoadStatus("error");
      }
    };

    load();
  }, [defaultSeason]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        SEASON_STORAGE_KEY,
        JSON.stringify(seasonByTrialId)
      );
    } catch {
      // no-op
    }
  }, [seasonByTrialId]);

  useEffect(() => {
    setSelectedTrialIds((prev) => prev.filter((id) => requests.some((r) => r.id === id)));
  }, [requests]);

  // Bouton "Prévenir le coach"
  const handleNotifyCoach = async (request: TrialRequest) => {
    setNotifyMessage(null);
    setNotifyError(null);
    setNotifyingId(request.id);

    try {
      const res = await fetch("/api/notify-coach-trial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ request }),
      });

      const data = await res.json();

      if (!res.ok) {
        setNotifyError(
          data.error ||
            "Impossible d’envoyer le mail au coach. Merci de réessayer."
        );
      } else {
        setNotifyMessage("Le coach a été prévenu de cette demande d’essai.");
      }
    } catch (err: any) {
      setNotifyError(err.message || "Erreur réseau lors de l’envoi.");
    } finally {
      setNotifyingId(null);
    }
  };

  // Planifier l’essai + envoyer le mail au parent
  const handleScheduleTrial = async (request: TrialRequest) => {
    setScheduleMessage(null);
    setScheduleError(null);

    const selectedTeam =
      teamSelections[request.id] ||
      request.team_selected ||
      request.wanted_team ||
      "";
    const selectedSeason =
      seasonByTrialId[request.id] || request.saison || defaultSeason;

    if (!selectedTeam) {
      setScheduleError(
        "Merci de sélectionner une équipe avant de planifier l’essai."
      );
      return;
    }

    setSchedulingId(request.id);

    try {
      // 1) Planifier l’essai côté Supabase
      const resSchedule = await fetch("/api/schedule-trial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trial_id: request.id,
          team_key: selectedTeam,
          season: selectedSeason,
        }),
      });

      const dataSchedule = await resSchedule.json();

      if (!resSchedule.ok) {
        setScheduleError(
          dataSchedule.error ||
            "Impossible de planifier l’essai. Merci de réessayer."
        );
        setSchedulingId(null);
        return;
      }

      const updated = dataSchedule.trial as TrialRequest;

      // mise à jour dans la liste
      setRequests((prev) =>
        prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
      );

      // garder la saison choisie même si la colonne DB n'existe pas
      setSeasonByTrialId((prev) => ({
        ...prev,
        [request.id]: selectedSeason,
      }));

      // 2) Envoi du mail de confirmation d’essai
      const resMail = await fetch("/api/send-trial-confirmation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ trial_id: request.id }),
      });

      const dataMail = await resMail.json();

      if (!resMail.ok) {
        setScheduleError(
          dataMail.error ||
            "L’essai est planifié, mais l’email au parent n’a pas pu être envoyé."
        );
        setSchedulingId(null);
        return;
      }

      setScheduleMessage(
        "Essai planifié et email de confirmation envoyé au parent."
      );
    } catch (err: any) {
      setScheduleError(
        err?.message ||
          "Erreur réseau lors de la planification de l’essai ou de l’envoi de l’email."
      );
    } finally {
      setSchedulingId(null);
    }
  };

  const handleDeleteTrial = async (request: TrialRequest) => {
    setDeleteMessage(null);
    setDeleteError(null);
    setScheduleMessage(null);
    setScheduleError(null);

    if (request.status === "converted") {
      setDeleteError(
        "Impossible de supprimer une demande déjà convertie en inscription."
      );
      return;
    }

    const ok = window.confirm(
      `Supprimer la demande d'essai de ${request.child_first_name} ${request.child_last_name} ?`
    );

    if (!ok) return;

    setDeletingId(request.id);

    try {
      const res = await fetch("/api/delete-trial-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trial_id: request.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setDeleteError(
          data.error ||
            "Impossible de supprimer la demande d'essai. Merci de reessayer."
        );
        setDeletingId(null);
        return;
      }

      setRequests((prev) => prev.filter((r) => r.id !== request.id));

      setTeamSelections((prev) => {
        const next = { ...prev };
        delete next[request.id];
        return next;
      });

      setSeasonByTrialId((prev) => {
        const next = { ...prev };
        delete next[request.id];
        return next;
      });

      setSelectedTrialIds((prev) => prev.filter((id) => id !== request.id));

      setDeleteMessage("Demande d'essai supprimee avec succes.");
    } catch (err: any) {
      setDeleteError(
        err?.message ||
          "Erreur reseau lors de la suppression de la demande d'essai."
      );
    } finally {
      setDeletingId(null);
    }
  };

  const toggleSelection = (trialId: string, checked: boolean) => {
    setSelectedTrialIds((prev) => {
      if (checked) {
        if (prev.includes(trialId)) return prev;
        return [...prev, trialId];
      }
      return prev.filter((id) => id !== trialId);
    });
  };

  const toggleSelectAllDeletable = (checked: boolean) => {
    if (!checked) {
      setSelectedTrialIds([]);
      return;
    }

    setSelectedTrialIds(deletableRequests.map((r) => r.id));
  };

  const handleDeleteSelectedTrials = async () => {
    setDeleteMessage(null);
    setDeleteError(null);

    const ids = selectedTrialIds.filter((id) => {
      const req = requests.find((r) => r.id === id);
      return !!req && req.status !== "converted";
    });

    if (!ids.length) {
      setDeleteError("Aucune demande supprimable selectionnee.");
      return;
    }

    const ok = window.confirm(
      `Supprimer ${ids.length} demande${ids.length > 1 ? "s" : ""} d'essai selectionnee${ids.length > 1 ? "s" : ""} ?`
    );

    if (!ok) return;

    setDeletingMany(true);

    const failed: string[] = [];
    const deleted = new Set<string>();

    for (const trialId of ids) {
      try {
        const res = await fetch("/api/delete-trial-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trial_id: trialId }),
        });

        if (!res.ok) {
          failed.push(trialId);
          continue;
        }

        deleted.add(trialId);
      } catch {
        failed.push(trialId);
      }
    }

    if (deleted.size > 0) {
      setRequests((prev) => prev.filter((r) => !deleted.has(r.id)));
      setTeamSelections((prev) => {
        const next = { ...prev };
        deleted.forEach((id) => delete next[id]);
        return next;
      });
      setSeasonByTrialId((prev) => {
        const next = { ...prev };
        deleted.forEach((id) => delete next[id]);
        return next;
      });
      setSelectedTrialIds((prev) => prev.filter((id) => !deleted.has(id)));
    }

    if (failed.length > 0) {
      setDeleteError(
        `${failed.length} suppression${failed.length > 1 ? "s" : ""} en erreur. Merci de reessayer.`
      );
    }

    if (deleted.size > 0) {
      setDeleteMessage(
        `${deleted.size} demande${deleted.size > 1 ? "s" : ""} supprimee${deleted.size > 1 ? "s" : ""} avec succes.`
      );
    }

    setDeletingMany(false);
  };

  const formatDate = (value: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleDateString("fr-FR");
  };

  const formatStatusLabel = (status: TrialStatus) => {
    switch (status) {
      case "draft":
        return "Brouillon";
      case "pending":
        return "À traiter";
      case "parent-pending":
        return "Lien parent envoyé";
      case "parent-created":
        return "Compte parent créé";
      case "scheduled":
        return "Essai planifié";
      case "converted":
        return "Converti";
      default:
        return status;
    }
  };

  const statusPillKind = (s: TrialStatus) => {
    if (s === "converted") return "success";
    if (s === "scheduled") return "info";
    if (s === "pending") return "warning";
    return "neutral";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-10">
        {/* Header */}
        <header className="mb-8 border-b border-white/5 pb-6">
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-400">
            Espace bureau • inscriptions
          </div>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">
            Demandes d’essai & pré-inscriptions
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Retrouvez ici toutes les demandes d’essai reçues. Chaque dossier
            pourra ensuite être complété et converti en inscription.
          </p>
        </header>

        {/* Messages notif coach */}
        {notifyMessage && (
          <div className="mb-2 rounded-xl border border-emerald-500/50 bg-emerald-900/40 px-4 py-3 text-sm text-emerald-50">
            {notifyMessage}
          </div>
        )}
        {notifyError && (
          <div className="mb-2 rounded-xl border border-rose-500/50 bg-rose-900/40 px-4 py-3 text-sm text-rose-50">
            {notifyError}
          </div>
        )}

        {/* Messages planning essai */}
        {scheduleMessage && (
          <div className="mb-2 rounded-xl border border-emerald-500/50 bg-emerald-900/40 px-4 py-3 text-sm text-emerald-50">
            {scheduleMessage}
          </div>
        )}
        {scheduleError && (
          <div className="mb-2 rounded-xl border border-amber-500/60 bg-amber-900/40 px-4 py-3 text-sm text-amber-50">
            {scheduleError}
          </div>
        )}

        {deleteMessage && (
          <div className="mb-2 rounded-xl border border-emerald-500/50 bg-emerald-900/40 px-4 py-3 text-sm text-emerald-50">
            {deleteMessage}
          </div>
        )}

        {deleteError && (
          <div className="mb-2 rounded-xl border border-rose-500/50 bg-rose-900/40 px-4 py-3 text-sm text-rose-50">
            {deleteError}
          </div>
        )}

        {/* Contenu principal */}
        {loadStatus === "loading" && (
          <div className="rounded-xl border border-sky-500/40 bg-sky-900/30 px-4 py-3 text-sm text-sky-50">
            Chargement des demandes d’essai…
          </div>
        )}

        {loadStatus === "error" && (
          <div className="rounded-xl border border-rose-500/50 bg-rose-900/40 px-4 py-3 text-sm text-rose-50">
            {loadError || "Impossible de charger les demandes d’essai."}
          </div>
        )}

        {loadStatus === "success" && (
          <section className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-xl shadow-black/40">
            <div className="mb-3 flex items-center justify-between text-xs text-slate-300">
              <span>
                {requests.length} demande{requests.length > 1 ? "s" : ""} d’essai
              </span>
              <div className="flex items-center gap-2">
                <span>{selectedDeletableCount} selectionnee{selectedDeletableCount > 1 ? "s" : ""}</span>
                <button
                  type="button"
                  onClick={handleDeleteSelectedTrials}
                  disabled={selectedDeletableCount === 0 || deletingMany || deletingId !== null}
                  className="rounded-full bg-rose-600 px-3 py-1 text-[11px] font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingMany ? "Suppression..." : "Supprimer la selection"}
                </button>
              </div>
            </div>

            <div className="max-h-[650px] overflow-auto rounded-xl border border-white/5 bg-slate-950/40 text-xs">
              <table className="min-w-full border-collapse">
                <thead className="sticky top-0 bg-slate-900/95 text-[11px] uppercase tracking-wide text-slate-300">
                  <tr>
                    <th className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        aria-label="Selectionner toutes les demandes supprimables"
                        checked={allDeletableSelected}
                        onChange={(e) => toggleSelectAllDeletable(e.target.checked)}
                        className="h-3.5 w-3.5"
                      />
                    </th>
                    <th className="px-3 py-2 text-left">Enfant</th>
                    <th className="px-3 py-2 text-left">Naissance / Age</th>
                    <th className="px-3 py-2 text-left">Équipe souhaitée</th>
                    <th className="px-3 py-2 text-left">Parent</th>
                    <th className="px-3 py-2 text-left">Contact</th>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Statut</th>
                    <th className="px-3 py-2 text-center">Workflow</th>
                  </tr>
                </thead>

                <tbody>
                  {requests.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-6 text-center text-xs text-slate-400"
                      >
                        Aucune demande d’essai enregistrée pour le moment.
                      </td>
                    </tr>
                  )}

                  {requests.map((r, idx) => {
                    const seasonValue =
                      seasonByTrialId[r.id] || r.saison || defaultSeason;
                    const si = stepIndex(r.status);

                    // règles UI (sans changer les handlers / logique)
                    const isConverted = r.status === "converted";
                    const isScheduled = r.status === "scheduled";
                    const hasRegistrationToken =
                      typeof r.registration_token === "string" &&
                      r.registration_token.trim().length > 0;
                    const canEditTeam = !isScheduled && !isConverted;
                    const canEditSeason =
                      r.status === "draft" || r.status === "pending";

                    const canNotify = !isConverted;
                    const canPrepare = !isConverted && r.status !== "parent-created";
                    const canFinalize =
                      r.status !== "converted" && hasRegistrationToken;
                    const canSchedule = !isConverted;

                    return (
                      <tr
                        key={r.id}
                        className={
                          idx % 2 === 0 ? "bg-slate-900/40" : "bg-slate-900/10"
                        }
                      >
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            aria-label={`Selectionner la demande de ${r.child_first_name} ${r.child_last_name}`}
                            checked={selectedTrialIds.includes(r.id)}
                            disabled={r.status === "converted" || deletingMany}
                            onChange={(e) => toggleSelection(r.id, e.target.checked)}
                            className="h-3.5 w-3.5"
                          />
                        </td>
                        <td className="px-3 py-2 text-slate-50">
                          {r.child_first_name} {r.child_last_name}
                        </td>

                        <td className="px-3 py-2 text-slate-100">
                          <div>{formatDate(r.child_birthdate)}</div>
                          <div className="text-[11px] text-slate-400">
                            {getAge(r.child_birthdate)}
                          </div>
                        </td>

                        <td className="px-3 py-2 text-slate-100">
                          {r.wanted_team || "-"}
                        </td>

                        <td className="px-3 py-2 text-slate-100">
                          {r.parent_first_name} {r.parent_last_name}
                        </td>

                        <td className="px-3 py-2 text-slate-200">
                          <div className="truncate">{r.parent_email}</div>
                          <div className="text-[11px] text-slate-400">
                            {r.parent_phone}
                          </div>
                        </td>

                        <td className="px-3 py-2 text-slate-200">
                          {formatDate(r.created_at)}
                        </td>

                        <td className="px-3 py-2">
                          <span
                            className={[
                              "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
                              computePillClass(statusPillKind(r.status) as any),
                            ].join(" ")}
                          >
                            {formatStatusLabel(r.status)}
                          </span>

                          {(r.team_selected || r.trial_date || r.trial_time) && (
                            <div className="mt-1 text-[11px] text-slate-400">
                              Essai&nbsp;:
                              {r.team_selected && <span> {r.team_selected} •</span>}{" "}
                              {r.trial_date && <span> {formatDate(r.trial_date)}</span>}
                              {r.trial_time && <span> – {r.trial_time}</span>}
                            </div>
                          )}
                        </td>

                        {/* ====== WORKFLOW VISUEL (UI only) ====== */}
                        <td className="px-3 py-2">
                          <div className="mx-auto w-full max-w-[520px]">
                            
                            <div className="mb-2 grid gap-2 md:grid-cols-[1fr_auto]">
                              {/* Selects compacts */}
                              <div className="flex items-center justify-start gap-2 md:justify-end">
                                <select
                                  className="rounded-full border border-slate-600 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                  value={seasonValue}
                                  onChange={(e) =>
                                    setSeasonByTrialId((prev) => ({
                                      ...prev,
                                      [r.id]: e.target.value,
                                    }))
                                  }
                                  disabled={!canEditSeason}
                                  title="Saison d’inscription (pilotée par le bureau)"
                                >
                                  {seasons.map((s) => (
                                    <option key={s} value={s}>
                                      Saison {s}
                                    </option>
                                  ))}
                                </select>

                                <select
                                  className="rounded-full border border-slate-600 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                  value={teamSelections[r.id] || ""}
                                  onChange={(e) =>
                                    setTeamSelections((prev) => ({
                                      ...prev,
                                      [r.id]: e.target.value,
                                    }))
                                  }
                                  disabled={!canEditTeam}
                                  title="Équipe (pour planifier l’essai)"
                                >
                                  <option value="">Équipe d’essai</option>
                                  {TEAM_OPTIONS.map((opt) => (
                                    <option key={opt.key} value={opt.key}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Stepper */}
                            <div className="mb-2">
                              <div className="flex items-center gap-1">
                                {STEPS.map((s, i) => {
                                  const done = i < si;
                                  const current = i === si;

                                  return (
                                    <div key={s.key} className="flex-1">
                                      <div
                                        className={[
                                          "h-1.5 rounded-full",
                                          done
                                            ? "bg-emerald-500/70"
                                            : current
                                            ? "bg-sky-500/70"
                                            : "bg-white/10",
                                        ].join(" ")}
                                        title={s.label}
                                      />
                                      <div
                                        className={[
                                          "mt-1 truncate text-[10px]",
                                          done
                                            ? "text-emerald-200"
                                            : current
                                            ? "text-sky-200"
                                            : "text-slate-500",
                                        ].join(" ")}
                                        title={s.label}
                                      >
                                        {s.label}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Ligne 2 : boutons alignés, ordre workflow, grisage */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                              {/* 1) Coach */}
                              <button
                                type="button"
                                onClick={() => handleNotifyCoach(r)}
                                disabled={notifyingId === r.id || !canNotify}
                                className={[
                                  "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition",
                                  notifyingId === r.id
                                    ? "bg-emerald-600 text-white opacity-80"
                                    : canNotify
                                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                                    : "bg-slate-700/50 text-slate-300 opacity-60 cursor-not-allowed",
                                ].join(" ")}
                                title="Prévenir le coach"
                              >
                                {notifyingId === r.id ? "Envoi…" : "Coach"}
                              </button>

                              {/* 2) Préparer fiche parent (workflow) */}
                              {r.status === "parent-created" || r.status === "converted" ? (
                                <span
                                  className="shrink-0 rounded-full bg-slate-700/50 px-3 py-1 text-[11px] font-semibold text-slate-300 opacity-70"
                                  title="Fiche parent déjà préparée"
                                >
                                  Fiche parent ✓
                                </span>
                              ) : (
                                <Link
                                  href={`/bureau/inscriptions/preparer/${r.id}?season=${encodeURIComponent(
                                    seasonValue
                                  )}`}
                                  className={[
                                    "shrink-0 inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold transition",
                                    canPrepare
                                      ? "bg-sky-500 text-white hover:bg-sky-600"
                                      : "bg-slate-700/50 text-slate-300 opacity-60 pointer-events-none",
                                  ].join(" ")}
                                  title="Préparer la fiche parent"
                                >
                                  {hasRegistrationToken ? "Renvoyer lien" : "Préparer"}
                                </Link>
                              )}

                              {/* 3) Planifier essai + mail */}
                              <button
                                type="button"
                                onClick={() => handleScheduleTrial(r)}
                                disabled={schedulingId === r.id || !canSchedule}
                                className={[
                                  "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition",
                                  schedulingId === r.id
                                    ? "bg-violet-500 text-white opacity-80"
                                    : canSchedule
                                    ? "bg-violet-500 text-white hover:bg-violet-600"
                                    : "bg-slate-700/50 text-slate-300 opacity-60 cursor-not-allowed",
                                ].join(" ")}
                                title="Planifier l’essai et envoyer l’email"
                              >
                                {schedulingId === r.id ? "Planif…" : "Planifier"}
                              </button>

                              {/* 4) Finaliser (si parent-created) / Validé */}
                              {r.status === "converted" ? (
                                <span
                                  className="shrink-0 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold text-emerald-100 border border-emerald-500/30"
                                  title="Inscription validée"
                                >
                                  Validée ✓
                                </span>
                              ) : canFinalize ? (
                                <Link
                                  href={`/bureau/inscriptions/completer/${r.id}`}
                                  className={[
                                    "shrink-0 inline-flex items-center justify-center rounded-full px-3 py-1 text-[11px] font-semibold transition",
                                    canFinalize
                                      ? "bg-amber-500 text-white hover:bg-amber-600"
                                      : "bg-slate-700/50 text-slate-300 opacity-60 pointer-events-none",
                                  ].join(" ")}
                                  title="Finaliser l’inscription"
                                >
                                  Finaliser
                                </Link>
                              ) : (
                                <span
                                  className="shrink-0 rounded-full bg-slate-700/50 px-3 py-1 text-[11px] font-semibold text-slate-300 opacity-60"
                                  title="Finaliser (disponible après création du compte parent)"
                                >
                                  Finaliser
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteTrial(r)}
                                disabled={
                                  deletingId === r.id ||
                                  r.status === "converted" ||
                                  deletingMany
                                }
                                className={[
                                  "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition",
                                  deletingId === r.id
                                    ? "bg-rose-600 text-white opacity-80"
                                    : r.status !== "converted"
                                    ? "bg-rose-600 text-white hover:bg-rose-700"
                                    : "bg-slate-700/50 text-slate-300 opacity-60 cursor-not-allowed",
                                ].join(" ")}
                                title={
                                  r.status === "converted"
                                    ? "Suppression bloquée pour une inscription déjà convertie"
                                    : "Supprimer cette demande d'essai"
                                }
                              >
                                {deletingId === r.id ? "Suppression..." : "Supprimer"}
                              </button>
                            </div>
                          </div>
                        </td>
                        {/* ====== FIN WORKFLOW VISUEL ====== */}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* (optionnel) messages convert (conservés) */}
            {convertMessage && (
              <div className="mt-3 rounded-xl border border-emerald-500/50 bg-emerald-900/40 px-4 py-3 text-sm text-emerald-50">
                {convertMessage}
              </div>
            )}
            {convertError && (
              <div className="mt-3 rounded-xl border border-rose-500/50 bg-rose-900/40 px-4 py-3 text-sm text-rose-50">
                {convertError}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
