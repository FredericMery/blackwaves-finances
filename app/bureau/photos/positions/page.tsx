
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

type Photo = {
  id: string;
  url: string;          // colonne `url` dans la table `photos`
  title: string | null;
  section: string | null;
  description: string | null;
  created_at: string;
};

type PhotoSlot = {
  id: string;
  zone: string;
  photo_id: string | null;
  updated_at: string;
};

type ZoneConfig = {
  id: string;
  label: string;
  description: string;
};

const ZONES: ZoneConfig[] = [
  {
    id: "home_hero",
    label: "Accueil – Image principale (hero)",
    description: "Grande image en haut de la page d’accueil."
  },
  {
    id: "home_gallery",
    label: "Accueil – Bandeau galerie",
    description: "Bandeau de photos sous l’entête de la page d’accueil."
  },
  {
    id: "parents_banner",
    label: "Page Parents – Bandeau",
    description: "Image en haut de la page Parents."
  },
  {
    id: "competition_banner",
    label: "Page Compétitions – Bandeau",
    description: "Bandeau en haut de la page Compétitions."
  },
  {
    id: "gallery_header",
    label: "Page Galerie – Image d’en-tête",
    description: "Visuel principal de la page Galerie."
  }
];

export default function PhotoPositionsPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [slots, setSlots] = useState<PhotoSlot[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Charger les photos + les emplacements
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        // 1) Photos
        const { data: photosData, error: photosError } = await supabase
          .from("photos")
          .select("*")
          .order("created_at", { ascending: false });

        if (photosError) throw photosError;

        // 2) Emplacements (photo_slots)
        const { data: slotsData, error: slotsError } = await supabase
          .from("photo_slots")
          .select("*");

        if (slotsError) throw slotsError;

        setPhotos(photosData || []);
        setSlots(slotsData || []);

        // Zone par défaut = la première
        if (!selectedZoneId && ZONES.length > 0) {
          setSelectedZoneId(ZONES[0].id);

          const firstZoneSlot = (slotsData || []).find(
            (s) => s.zone === ZONES[0].id
          );
          setSelectedPhotoId(firstZoneSlot?.photo_id ?? null);
        }
      } catch (err: any) {
        console.error("Erreur chargement photos/slots :", err);
        setError("Impossible de charger les photos ou les emplacements.");
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quand on change de zone, on sélectionne la photo déjà associée
  const handleSelectZone = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    setSuccess(null);
    setError(null);

    const slot = slots.find((s) => s.zone === zoneId);
    setSelectedPhotoId(slot?.photo_id ?? null);
  };

  // Quand on clique sur une photo dans la colonne de droite
  const handleSelectPhoto = (photoId: string) => {
    if (!selectedZoneId) return;
    setSelectedPhotoId(photoId);
    setSuccess(null);
    setError(null);
  };

  // Enregistrer le couple zone ↔ photo
  const handleSave = async () => {
    if (!selectedZoneId || !selectedPhotoId) {
      setError("Merci de choisir une zone et une photo avant d’enregistrer.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error: upsertError } = await supabase
        .from("photo_slots")
        .upsert(
          {
            zone: selectedZoneId,
            photo_id: selectedPhotoId
          },
          {
            onConflict: "zone"
          }
        )
        .select();

      if (upsertError) throw upsertError;

      // Mettre à jour le state local
      const updatedSlot = data && data[0];

      setSlots((prev) => {
        const other = prev.filter((s) => s.zone !== selectedZoneId);
        return updatedSlot ? [...other, updatedSlot] : other;
      });

      setSuccess("Emplacement mis à jour avec succès.");
    } catch (err: any) {
      console.error("Erreur enregistrement emplacement photo :", err);
      setError("Impossible d’enregistrer l’emplacement. Merci de réessayer.");
    } finally {
      setSaving(false);
    }
  };

  // Photo actuellement associée à la zone sélectionnée
  const currentPhotoForSelectedZone = (() => {
    if (!selectedZoneId) return null;
    const slot = slots.find((s) => s.zone === selectedZoneId);
    if (!slot?.photo_id) return null;
    return photos.find((p) => p.id === slot.photo_id) ?? null;
  })();

    return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-900 to-black text-slate-100 pb-16">
      <div className="max-w-6xl mx-auto px-4 pt-16">
        <div className="text-xs tracking-[0.35em] text-pink-400 mb-3 uppercase">
          Espace bureau · Gestion des médias
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-3">
          Gestion des emplacements photos
        </h1>
        <p className="text-sm md:text-base text-slate-300 mb-8 max-w-3xl">
          Choisis une zone du site (bandeau, hero, galerie), puis associe-lui
          une photo parmi les images téléchargées. Les pages publiques iront
          chercher ces emplacements pour afficher la bonne photo automatiquement.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg border border-emerald-500/60 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {success}
          </div>
        )}

        {loading ? (
          <div className="mt-10 text-sm text-slate-300">Chargement…</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr,1.3fr] gap-6 mt-4">
            {/* Colonne 1 : zones */}
            <div className="rounded-2xl bg-slate-900/70 border border-slate-700/70 p-4 md:p-5 shadow-lg shadow-black/40">
              <h2 className="text-sm font-semibold text-slate-100 mb-1">
                1. Choisir une zone du site
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Sélectionne la zone pour laquelle tu veux définir une photo.
              </p>

              <div className="space-y-3">
                {ZONES.map((zone) => {
                  const slot = slots.find((s) => s.zone === zone.id);
                  const isActive = selectedZoneId === zone.id;

                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => handleSelectZone(zone.id)}
                      className={`w-full text-left rounded-xl border px-4 py-3 transition ${
                        isActive
                          ? "border-pink-500 bg-pink-500/10 shadow-[0_0_0_1px_rgba(236,72,153,0.4)]"
                          : "border-slate-700/80 bg-slate-900/70 hover:border-pink-400/70 hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                            {zone.label}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Zone ID :{" "}
                            <span className="font-mono text-[10px] bg-slate-800/80 px-1.5 py-0.5 rounded">
                              {zone.id}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            {zone.description}
                          </div>
                        </div>
                        <div className="text-right text-[11px] text-slate-400">
                          {slot?.photo_id ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300 border border-emerald-500/40">
                              Photo définie
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-slate-300 border border-slate-600">
                              Aucune photo définie
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Colonne 2 : photos */}
            <div className="rounded-2xl bg-slate-900/70 border border-slate-700/70 p-4 md:p-5 shadow-lg shadow-black/40 flex flex-col">
              <h2 className="text-sm font-semibold text-slate-100 mb-1">
                2. Choisir la photo à afficher
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Clique sur une photo pour l’associer à la zone sélectionnée.
              </p>

              {photos.length === 0 ? (
                <div className="text-xs text-slate-400">
                  Aucune photo disponible pour l’instant. Ajoute des photos dans
                  l’onglet « Gestion des photos ».
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 overflow-y-auto max-h-[430px] pr-1">
                  {photos.map((photo) => {
                    const isSelected = selectedPhotoId === photo.id;
                    const isCurrent =
                      currentPhotoForSelectedZone &&
                      currentPhotoForSelectedZone.id === photo.id;

                    return (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => handleSelectPhoto(photo.id)}
                        className={`group relative rounded-xl border overflow-hidden text-left transition focus:outline-none focus:ring-2 focus:ring-pink-500/70 ${
                          isSelected
                            ? "border-pink-500 shadow-[0_0_0_1px_rgba(236,72,153,0.4)] bg-slate-900"
                            : "border-slate-700/70 bg-slate-900/70 hover:border-pink-400/70 hover:bg-slate-900"
                        }`}
                      >
                        {/* Image preview */}
                        <div className="aspect-[4/3] w-full bg-slate-800/80 overflow-hidden">
                          {photo.url ? (
                            <img
                              src={photo.url}
                              alt={photo.title ?? "Photo"}
                              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-[10px] text-slate-500">
                              Aucune prévisualisation
                            </div>
                          )}
                        </div>

                        {/* Texte */}
                        <div className="px-3 py-2">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="text-xs font-semibold text-slate-100 truncate">
                              {photo.title || "Sans titre"}
                            </div>
                            {isCurrent && (
                              <span className="inline-flex items-center rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-medium text-emerald-300 border border-emerald-500/40">
                                Utilisée
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            Section : {photo.section || "Autre section"}
                          </div>
                          {photo.description && (
                            <div className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                              {photo.description}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="text-[11px] text-slate-400">
                  Zone sélectionnée :{" "}
                  <span className="font-semibold text-slate-100">
                    {selectedZoneId
                      ? ZONES.find((z) => z.id === selectedZoneId)?.label ??
                        selectedZoneId
                      : "aucune"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !selectedZoneId || !selectedPhotoId}
                  className={`inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold shadow-lg shadow-pink-500/30 transition ${
                    saving || !selectedZoneId || !selectedPhotoId
                      ? "bg-pink-500/30 text-pink-100 cursor-not-allowed"
                      : "bg-pink-500 text-white hover:bg-pink-400"
                  }`}
                >
                  {saving ? "Enregistrement…" : "Enregistrer l’emplacement"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
