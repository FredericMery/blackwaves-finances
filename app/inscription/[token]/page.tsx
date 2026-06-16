"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type LoadStatus = "loading" | "error" | "ready" | "saving" | "saved";

type Registration = {
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
};

export default function ParentInscriptionPage() {
  const params = useParams<{ token?: string | string[] }>();

  const token = useMemo(() => {
    const t =
      typeof params?.token === "string"
        ? params.token
        : Array.isArray(params?.token)
        ? params.token[0]
        : "";
    return (t || "").trim();
  }, [params]);

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const [emailParent, setEmailParent] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [nomEnfant, setNomEnfant] = useState("");
  const [prenomEnfant, setPrenomEnfant] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [autorPhoto, setAutorPhoto] = useState(false);
  const [autorVideo, setAutorVideo] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setError("Token d’inscription manquant dans l’URL.");
        setStatus("error");
        return;
      }

      setStatus("loading");
      setError(null);

      try {
        const url = `/api/get-registration?token=${encodeURIComponent(token)}`;
        const res = await fetch(url, { cache: "no-store" });

        // Si jamais Next renvoie du HTML (route manquante), on le détecte
        const contentType = res.headers.get("content-type") || "";
        const rawText = await res.text();

        if (!contentType.includes("application/json")) {
          console.error("[inscription/[token]] Réponse non-JSON:", {
            url,
            status: res.status,
            contentType,
            rawText: rawText.slice(0, 300),
          });
          setError(
            "Erreur technique : réponse invalide du serveur (JSON attendu)."
          );
          setStatus("error");
          return;
        }

        const data = JSON.parse(rawText);

        if (!res.ok) {
          setError(
            data.error ||
              "Impossible de charger votre fiche d’inscription. Le lien semble invalide."
          );
          setStatus("error");
          return;
        }

        const reg: Registration = data.registration;

        setEmailParent(reg.email_parent || "");
        setTelephone(reg.telephone || "");
        setAdresse(reg.adresse || "");
        setNomEnfant(reg.nom_enfant || "");
        setPrenomEnfant(reg.prenom_enfant || "");
        setDateNaissance(reg.date_naissance ? reg.date_naissance.substring(0, 10) : "");
        setAutorPhoto(reg.autorisation_photo ?? false);
        setAutorVideo(reg.autorisation_video ?? false);

        setStatus("ready");
      } catch (err: any) {
        console.error("[inscription/[token]] load error:", err);
        setError(err?.message || "Erreur réseau lors du chargement de la fiche.");
        setStatus("error");
      }
    };

    load();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!token) {
      setError("Token d’inscription manquant dans l’URL.");
      setStatus("error");
      return;
    }

    setStatus("saving");

    try {
      const res = await fetch("/api/update-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email_parent: emailParent,
          telephone,
          adresse,
          nom_enfant: nomEnfant,
          prenom_enfant: prenomEnfant,
          date_naissance: dateNaissance || null,
          autorisation_photo: autorPhoto,
          autorisation_video: autorVideo,
        }),
      });

      const contentType = res.headers.get("content-type") || "";
      const rawText = await res.text();

      if (!contentType.includes("application/json")) {
        console.error("[inscription/[token]] update non-JSON:", {
          status: res.status,
          contentType,
          rawText: rawText.slice(0, 300),
        });
        setError("Erreur technique : réponse invalide du serveur.");
        setStatus("error");
        return;
      }

      const data = JSON.parse(rawText);

      if (!res.ok) {
        setError(
          data.error ||
            "Impossible d’enregistrer votre fiche. Merci de réessayer."
        );
        setStatus("error");
        return;
      }

      const successBase =
        data.message || "Merci, votre fiche d’inscription a bien été complétée.";
      setSuccessMessage(
        `${successBase} Pensez a surveiller vos e-mails (et vos spams) pour les prochaines etapes.`
      );
      setStatus("saved");
    } catch (err: any) {
      console.error("[inscription/[token]] submit error:", err);
      setError(err?.message || "Erreur réseau lors de l’enregistrement.");
      setStatus("error");
    }
  };

  const disabled = status === "saving" || status === "saved";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-10">
        <header className="mb-8 text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-pink-400">
            Black Waves Cheerleading
          </div>
          <h1 className="mt-2 text-3xl font-bold">Fiche d’inscription parent</h1>
          <p className="mt-2 text-sm text-slate-300">
            Merci de compléter les informations ci-dessous pour finaliser
            l’inscription de votre enfant.
          </p>
        </header>

        {status === "loading" && (
          <div className="rounded-xl border border-sky-500/40 bg-sky-900/30 px-4 py-3 text-sm text-sky-50">
            Chargement de votre fiche d’inscription…
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

        {(status === "ready" || status === "saving" || status === "saved") && (
          <form
            onSubmit={handleSubmit}
            className="mt-4 space-y-6 rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-black/40"
          >
            {/* Infos parent */}
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">
                Informations parent
              </h2>
              <div className="mt-3 space-y-3 text-sm">
                <div>
                  <label className="block text-slate-300">
                    Adresse email du parent
                  </label>
                  <input
                    type="email"
                    required
                    className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500"
                    value={emailParent}
                    onChange={(e) => setEmailParent(e.target.value)}
                    disabled={disabled}
                  />
                </div>

                <div>
                  <label className="block text-slate-300">
                    Téléphone du parent
                  </label>
                  <input
                    type="tel"
                    className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    disabled={disabled}
                  />
                </div>

                <div>
                  <label className="block text-slate-300">
                    Adresse postale
                  </label>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500"
                    rows={3}
                    value={adresse}
                    onChange={(e) => setAdresse(e.target.value)}
                    disabled={disabled}
                  />
                </div>
              </div>
            </section>

            {/* Infos enfant */}
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">
                Informations de l’enfant
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <label className="block text-slate-300">Nom</label>
                  <input
                    type="text"
                    required
                    className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500"
                    value={nomEnfant}
                    onChange={(e) => setNomEnfant(e.target.value)}
                    disabled={disabled}
                  />
                </div>

                <div>
                  <label className="block text-slate-300">Prénom</label>
                  <input
                    type="text"
                    required
                    className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500"
                    value={prenomEnfant}
                    onChange={(e) => setPrenomEnfant(e.target.value)}
                    disabled={disabled}
                  />
                </div>

                <div>
                  <label className="block text-slate-300">
                    Date de naissance
                  </label>
                  <input
                    type="date"
                    className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-500"
                    value={dateNaissance}
                    onChange={(e) => setDateNaissance(e.target.value)}
                    disabled={disabled}
                  />
                </div>
              </div>
            </section>

            {/* Autorisations */}
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-200">
                Autorisations
              </h2>
              <div className="mt-3 space-y-2 text-sm text-slate-200">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autorPhoto}
                    onChange={(e) => setAutorPhoto(e.target.checked)}
                    disabled={disabled}
                  />
                  <span>
                    J’autorise l’utilisation de l’image de mon enfant sur les
                    photos de communication du club.
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autorVideo}
                    onChange={(e) => setAutorVideo(e.target.checked)}
                    disabled={disabled}
                  />
                  <span>
                    J’autorise l’utilisation de l’image de mon enfant sur les
                    vidéos de communication du club.
                  </span>
                </label>
              </div>
            </section>

            <div className="pt-2">
              <button
                type="submit"
                disabled={disabled}
                className="w-full rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 disabled:opacity-60"
              >
                {status === "saving"
                  ? "Enregistrement en cours…"
                  : status === "saved"
                  ? "Fiche enregistrée"
                  : "Valider la fiche d’inscription"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
