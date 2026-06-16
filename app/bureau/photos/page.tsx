"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

type Photo = {
  id: string;
  url: string;
  title: string | null;
  section: string | null;
  description: string | null;
  created_at: string;
};

const SECTION_OPTIONS = [
  "Non définie",
  "Page d'accueil",
  "Page galerie",
  "Page équipes",
  "Page parents",
  "Bannière compétition",
  "Autre section",
];

export default function PhotosPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [section, setSection] = useState("Non définie");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(true);

  // Chargement initial des photos depuis la table "photos"
  useEffect(() => {
    const fetchPhotos = async () => {
      setIsLoadingPhotos(true);
      const { data, error } = await supabase
        .from("photos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur chargement photos", error);
        setError("Impossible de charger les photos.");
      } else {
        setPhotos(data as Photo[]);
      }
      setIsLoadingPhotos(false);
    };

    fetchPhotos();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!file) {
      setError("Merci de sélectionner une image avant de valider.");
      return;
    }

    try {
      setIsSubmitting(true);

      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `site/${fileName}`;

      // 1️⃣ Upload dans le bucket "photos"
      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(filePath, file);

      if (uploadError) {
        console.error("Erreur upload storage", uploadError);
        setError("Impossible de téléverser l’image (Storage).");
        setIsSubmitting(false);
        return;
      }

      // 2️⃣ Récupérer l’URL publique
      const {
        data: { publicUrl },
      } = supabase.storage.from("photos").getPublicUrl(filePath);

      // 3️⃣ Insertion dans la table "photos"
      const { error: insertError } = await supabase.from("photos").insert({
        url: publicUrl,
        title: title.trim() || null,
        section: section || null,
        description: description.trim() || null,
      });

      if (insertError) {
        console.error("Erreur insertion base", insertError);
        setError("Impossible d'enregistrer la photo en base.");
        setIsSubmitting(false);
        return;
      }

      // 4️⃣ Rechargement de la liste
      const { data: refreshData, error: refreshError } = await supabase
        .from("photos")
        .select("*")
        .order("created_at", { ascending: false });

      if (!refreshError && refreshData) {
        setPhotos(refreshData as Photo[]);
      }

      setSuccess("Photo ajoutée avec succès !");
      setFile(null);
      setTitle("");
      setSection("Non définie");
      setDescription("");

      const input = document.getElementById("photo-file-input") as HTMLInputElement | null;
      if (input) input.value = "";

      setIsSubmitting(false);
    } catch (err) {
      console.error(err);
      setError("Erreur inattendue lors de l’envoi de la photo.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50 pb-16">
      <div className="max-w-6xl mx-auto px-4 pt-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs tracking-[0.25em] text-pink-400 uppercase mb-2">
              Espace bureau • Gestion des médias
            </p>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Gestion des photos du site
            </h1>
            <p className="text-sm md:text-base text-slate-300 max-w-2xl">
              Télécharge et organise les photos à utiliser sur les différentes pages du site. Les fichiers sont stockés
              dans Supabase Storage (bucket{" "}
              <span className="font-mono text-pink-300">photos</span>).
            </p>
          </div>

          {/* NEW (n’impacte rien) */}
          <Link
            href="/bureau/photos/reporting"
            className="inline-flex items-center justify-center rounded-full border border-pink-500/40 bg-pink-500/10 px-4 py-2 text-sm font-semibold text-pink-100 hover:bg-pink-500/20 transition"
            title="Voir le reporting des votes (👍/👎)"
          >
            Reporting votes 👍👎
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 text-red-100 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-100 px-4 py-3 text-sm">
            {success}
          </div>
        )}

        {/* Formulaire d'ajout */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur"
          >
            <h2 className="text-lg font-semibold mb-4">Ajouter une nouvelle photo</h2>
            <p className="text-xs text-slate-400 mb-4">
              Formats conseillés : JPG ou PNG, poids &lt; 2 Mo. Donne un titre et une section pour faciliter la sélection
              dans les pages.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Fichier image *
                </label>
                <input
                  id="photo-file-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-xs text-slate-200
                    file:mr-4 file:py-2.5 file:px-4
                    file:rounded-full file:border-0
                    file:text-xs file:font-semibold
                    file:bg-pink-500 file:text-white
                    hover:file:bg-pink-400
                    cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Titre (optionnel)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                  placeholder="Ex : Clara & Leeloo – Finale championnat de France"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Section du site
                </label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                >
                  {SECTION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Description (optionnel)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 resize-none"
                  placeholder="Contexte de la photo, nom de la compétition, équipe, année…"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-full bg-pink-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-pink-500/30 hover:bg-pink-400 disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  {isSubmitting ? "Téléversement en cours…" : "Ajouter la photo"}
                </button>
              </div>
            </div>
          </form>

          {/* Panneau d’info / instructions */}
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 text-sm text-slate-200">
            <h2 className="text-lg font-semibold mb-3">Comment utiliser ?</h2>
            <ul className="space-y-2 text-xs md:text-sm text-slate-300">
              <li>
                • Les fichiers sont stockés dans le bucket{" "}
                <span className="font-mono text-pink-300">photos</span> de Supabase Storage.
              </li>
              <li>
                • La table <span className="font-mono text-pink-300">photos</span> sert à référencer les images (titre,
                section, description).
              </li>
              <li>• Tu pourras ensuite utiliser ces URLs dans les différentes pages du site (galerie, bannières, etc.).</li>
              <li>• On pourra plus tard ajouter un copier/coller rapide de l’URL ou un bouton « Utiliser dans une page ».</li>
            </ul>
          </div>
        </div>

        {/* Liste des photos */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Photos enregistrées</h2>

          {isLoadingPhotos ? (
            <p className="text-sm text-slate-400">Chargement des photos…</p>
          ) : photos.length === 0 ? (
            <p className="text-sm text-slate-400">Aucune photo enregistrée pour le moment.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden"
                >
                  <div className="aspect-video bg-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.title ?? ""}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-slate-100 truncate">
                      {photo.title || "Sans titre"}
                    </p>
                    <p className="text-[11px] text-pink-300 mt-1">
                      {photo.section || "Section non définie"}
                    </p>
                    {photo.description && (
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                        {photo.description}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-500 mt-2">
                      Ajoutée le{" "}
                      {new Date(photo.created_at).toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
