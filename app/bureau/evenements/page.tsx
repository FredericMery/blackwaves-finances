"use client";

export const dynamic = "force-dynamic";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  createDefaultEventClubDetails,
  normalizeEventClubDetails,
  type EventClubDetails,
  type EventClubLink,
} from "@/lib/eventClub";

type EventRow = {
  id: string;
  title: string;
  slug: string;
  event_date: string;
  image_url: string | null;
  is_active: boolean;
  registrations_open: boolean;
  description?: string | null;
  location?: string | null;
  address?: string | null;
  price?: string | null;
  details_json?: unknown;
};

type ClubRegistration = {
  id: string;
  athlete_name: string | null;
  athlete_team: string | null;
  email: string | null;
  created_at: string;
};

type ExternalRegistration = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  birth_year: number | null;
  created_at: string;
};

type EditorState = {
  id: string | null;
  title: string;
  slug: string;
  eventDate: string;
  imageUrl: string;
  isActive: boolean;
  registrationsOpen: boolean;
  details: EventClubDetails;
};

type EventDetailsSource = Partial<EventClubDetails> & {
  heroTitle?: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function toLocalInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function createEmptyEditorState(): EditorState {
  return {
    id: null,
    title: "",
    slug: "",
    eventDate: "",
    imageUrl: "",
    isActive: true,
    registrationsOpen: true,
    details: createDefaultEventClubDetails(),
  };
}

function mapEventToEditor(event: EventRow): EditorState {
  const detailsSource =
    event.details_json && typeof event.details_json === "object"
      ? (event.details_json as EventDetailsSource)
      : {};

  return {
    id: event.id,
    title: event.title || "",
    slug: event.slug || "",
    eventDate: toLocalInputValue(event.event_date),
    imageUrl: event.image_url || "",
    isActive: Boolean(event.is_active),
    registrationsOpen: Boolean(event.registrations_open),
    details: normalizeEventClubDetails(
      {
        ...detailsSource,
        description: event.description,
        locationName: event.location,
        address: event.address,
        priceText: event.price,
        heroTitle: detailsSource.heroTitle || event.title,
      },
      event.event_date
    ),
  };
}

export default function BureauEvenementsPage() {
  return (
    <Suspense fallback={<EvenementsPageFallback />}>
      <BureauEvenementsPageContent />
    </Suspense>
  );
}

function BureauEvenementsPageContent() {
  const searchParams = useSearchParams();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(createEmptyEditorState());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [clubRegistrations, setClubRegistrations] = useState<ClubRegistration[]>([]);
  const [externalRegistrations, setExternalRegistrations] = useState<ExternalRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showParticipantsList, setShowParticipantsList] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) || null,
    [events, selectedEventId]
  );

  const clubParticipantsByTeam = useMemo(() => {
    const sorted = [...clubRegistrations].sort((a, b) => {
      const teamA = (a.athlete_team || "Sans équipe").toLowerCase();
      const teamB = (b.athlete_team || "Sans équipe").toLowerCase();
      if (teamA !== teamB) return teamA.localeCompare(teamB, "fr");

      const nameA = (a.athlete_name || "").toLowerCase();
      const nameB = (b.athlete_name || "").toLowerCase();
      return nameA.localeCompare(nameB, "fr");
    });

    const map = new Map<string, ClubRegistration[]>();
    for (const registration of sorted) {
      const team = registration.athlete_team || "Sans équipe";
      const list = map.get(team) || [];
      list.push(registration);
      map.set(team, list);
    }

    return Array.from(map.entries());
  }, [clubRegistrations]);

  const invitedParticipantsByAge = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const getAge = (birthYear: number | null) =>
      birthYear && birthYear >= 1900 && birthYear <= currentYear
        ? currentYear - birthYear
        : null;

    return [...externalRegistrations].sort((a, b) => {
      const ageA = getAge(a.birth_year);
      const ageB = getAge(b.birth_year);

      if (ageA === null && ageB === null) return a.full_name.localeCompare(b.full_name, "fr");
      if (ageA === null) return 1;
      if (ageB === null) return -1;
      if (ageA !== ageB) return ageA - ageB;
      return a.full_name.localeCompare(b.full_name, "fr");
    });
  }, [externalRegistrations]);

  useEffect(() => {
    void loadEvents();
  }, []);

  useEffect(() => {
    if (!selectedEventId) {
      setClubRegistrations([]);
      setExternalRegistrations([]);
      return;
    }

    void loadRegistrations(selectedEventId);
  }, [selectedEventId]);

  async function loadEvents() {
    setIsLoading(true);
    setError(null);

    const { data, error: loadError } = await supabase
      .from("events_club")
      .select("*")
      .order("event_date", { ascending: false });

    if (loadError) {
      setError(loadError.message || "Impossible de charger les événements.");
      setIsLoading(false);
      return;
    }

    const list = (data || []) as EventRow[];
    setEvents(list);
    setIsLoading(false);

    if (!list.length) {
      setSelectedEventId(null);
      setEditor(createEmptyEditorState());
    }
  }

  async function loadRegistrations(eventId: string) {
    const [clubResult, externalResult] = await Promise.all([
      supabase
        .from("event_registrations_club")
        .select("id, athlete_name, athlete_team, email, created_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false }),
      supabase
        .from("event_external_registrations_club")
        .select("id, full_name, email, phone, city, birth_year, created_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false }),
    ]);

    if (!clubResult.error) {
      setClubRegistrations((clubResult.data || []) as ClubRegistration[]);
    }

    if (!externalResult.error) {
      setExternalRegistrations((externalResult.data || []) as ExternalRegistration[]);
    }
  }

  const selectEvent = useCallback((eventId: string) => {
    const event = events.find((item) => item.id === eventId);
    if (!event) return;

    setSelectedEventId(event.id);
    setEditor(mapEventToEditor(event));
    setImageFile(null);
    setMessage(null);
    setError(null);
    setShowParticipantsList(false);
  }, [events]);

  useEffect(() => {
    if (!events.length || selectedEventId) return;

    const eventIdParam = searchParams.get("eventId");
    const slugParam = searchParams.get("slug");
    const preferred =
      (eventIdParam && events.find((event) => event.id === eventIdParam)?.id) ||
      (slugParam && events.find((event) => event.slug === slugParam)?.id) ||
      events[0]?.id ||
      null;

    if (preferred) {
      selectEvent(preferred);
    }
  }, [events, searchParams, selectedEventId, selectEvent]);

  function handleNewEvent() {
    setSelectedEventId(null);
    setEditor(createEmptyEditorState());
    setImageFile(null);
    setClubRegistrations([]);
    setExternalRegistrations([]);
    setShowParticipantsList(false);
    setMessage(null);
    setError(null);
  }

  function updateDetails(patch: Partial<EventClubDetails>) {
    setEditor((prev) => ({
      ...prev,
      details: { ...prev.details, ...patch },
    }));
  }

  function updatePracticalLink(index: number, patch: Partial<EventClubLink>) {
    setEditor((prev) => {
      const links = [...prev.details.practicalLinks];
      links[index] = { ...links[index], ...patch };
      return {
        ...prev,
        details: { ...prev.details, practicalLinks: links },
      };
    });
  }

  function addPracticalLink() {
    setEditor((prev) => ({
      ...prev,
      details: {
        ...prev.details,
        practicalLinks: [...prev.details.practicalLinks, { label: "Nouveau bouton", href: "/club" }],
      },
    }));
  }

  function removePracticalLink(index: number) {
    setEditor((prev) => ({
      ...prev,
      details: {
        ...prev.details,
        practicalLinks: prev.details.practicalLinks.filter((_, current) => current !== index),
      },
    }));
  }

  async function ensureUniqueSlug(baseSlug: string, currentId: string | null) {
    let candidate = baseSlug;
    let counter = 1;

    while (candidate) {
      let query = supabase.from("events_club").select("id").eq("slug", candidate);
      if (currentId) {
        query = query.neq("id", currentId);
      }
      const { data } = await query.maybeSingle();
      if (!data) return candidate;
      candidate = `${baseSlug}-${counter}`;
      counter += 1;
    }

    return `${Date.now()}`;
  }

  async function uploadImageIfNeeded(slug: string) {
    if (!imageFile) return editor.imageUrl || null;

    const ext = imageFile.name.split(".").pop() || "jpg";
    const path = `affiches/${Date.now()}-${slug}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("events-club")
      .upload(path, imageFile, { upsert: true });

    if (uploadError) {
      throw new Error(uploadError.message || "Upload image impossible.");
    }

    const { data } = supabase.storage.from("events-club").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSave() {
    setError(null);
    setMessage(null);

    if (!editor.title.trim() || !editor.eventDate) {
      setError("Titre et date de l'événement sont obligatoires.");
      return;
    }

    const baseSlug = slugify(editor.slug || editor.title);
    if (!baseSlug) {
      setError("Impossible de générer un slug valide pour cet événement.");
      return;
    }

    setIsSaving(true);

    try {
      const slug = await ensureUniqueSlug(baseSlug, editor.id);
      const imageUrl = await uploadImageIfNeeded(slug);
      const details = {
        ...editor.details,
        heroTitle: editor.details.heroTitle || editor.title,
      };
      const payload = {
        title: editor.title.trim(),
        slug,
        event_date: new Date(editor.eventDate).toISOString(),
        image_url: imageUrl,
        is_active: editor.isActive,
        registrations_open: editor.registrationsOpen,
        description: details.description,
        location: details.locationName,
        address: details.address,
        price: details.priceText,
        button_label: "S'inscrire",
        details_json: details,
      };

      const query = editor.id
        ? supabase.from("events_club").update(payload).eq("id", editor.id).select("*").single()
        : supabase.from("events_club").insert(payload).select("*").single();

      const { data, error: saveError } = await query;

      if (saveError || !data) {
        throw new Error(saveError?.message || "Enregistrement impossible.");
      }

      await loadEvents();
      setSelectedEventId(data.id);
      setEditor(mapEventToEditor(data as EventRow));
      setImageFile(null);
      setMessage("La fiche événement a bien été enregistrée.");
    } catch (saveErr: unknown) {
      setError(saveErr instanceof Error ? saveErr.message : "Erreur lors de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <header className="mb-8 flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">
              Espace bureau · événements
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">
              Fiche événement standardisée
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Un seul espace pour créer la fiche publique, piloter les inscriptions club et externes, et supprimer l&apos;ancien builder libre.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleNewEvent}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-amber-300 hover:text-amber-200"
            >
              Nouvel événement
            </button>
            {selectedEvent && (
              <Link
                href={`/evenements/${selectedEvent.slug}`}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-100"
              >
                Voir la page publique
              </Link>
            )}
          </div>
        </header>

        {message && (
          <div className="mb-4 rounded-2xl border border-emerald-500/40 bg-emerald-900/30 px-4 py-3 text-sm text-emerald-50">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-2xl border border-rose-500/40 bg-rose-900/30 px-4 py-3 text-sm text-rose-50">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
          <aside className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/30">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">
                Événements existants
              </h2>
              <span className="text-xs text-slate-400">{events.length}</span>
            </div>

            {isLoading ? (
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-6 text-sm text-slate-300">
                Chargement des événements...
              </div>
            ) : !events.length ? (
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-6 text-sm text-slate-300">
                Aucun événement créé pour le moment.
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => {
                  const selected = selectedEventId === event.id;
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => selectEvent(event.id)}
                      className={[
                        "w-full rounded-[1.6rem] border p-3 text-left transition",
                        selected
                          ? "border-amber-300 bg-amber-400/10"
                          : "border-white/10 bg-slate-950/40 hover:border-white/20",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3">
                        {event.image_url ? (
                          <Image
                            src={event.image_url}
                            alt={event.title}
                            width={64}
                            height={64}
                            sizes="64px"
                            className="h-16 w-16 rounded-2xl object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-[11px] text-slate-400">
                            Sans visuel
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-white">{event.title}</div>
                          <div className="mt-1 text-xs text-slate-400">
                            {new Date(event.event_date).toLocaleDateString("fr-FR")}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-wide">
                            <span className="rounded-full border border-white/10 px-2 py-1 text-slate-300">
                              {event.is_active ? "Actif" : "Masqué"}
                            </span>
                            <span className="rounded-full border border-white/10 px-2 py-1 text-slate-300">
                              {event.registrations_open ? "Inscriptions ouvertes" : "Inscriptions fermées"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <section className="rounded-[2rem] border border-white/10 bg-white/95 p-6 text-slate-900 shadow-2xl shadow-black/20">
            <div className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Paramétrage complet
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight">
                  {editor.id ? "Modifier la fiche événement" : "Créer un événement"}
                </h2>
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Enregistrement..." : "Enregistrer la fiche"}
              </button>
            </div>

            <div className="grid gap-8 xl:grid-cols-[1fr_0.95fr]">
              <div className="space-y-8">
                <SectionTitle title="Base événement" />
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField label="Titre" value={editor.title} onChange={(value) => setEditor((prev) => ({ ...prev, title: value }))} />
                  <TextField label="Slug" value={editor.slug} onChange={(value) => setEditor((prev) => ({ ...prev, slug: value }))} placeholder="showcase-2026" />
                  <TextField label="Date et heure" type="datetime-local" value={editor.eventDate} onChange={(value) => setEditor((prev) => ({ ...prev, eventDate: value }))} />
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Visuel de couverture
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <ToggleField label="Événement visible publiquement" checked={editor.isActive} onChange={(checked) => setEditor((prev) => ({ ...prev, isActive: checked }))} />
                  <ToggleField label="Inscriptions ouvertes" checked={editor.registrationsOpen} onChange={(checked) => setEditor((prev) => ({ ...prev, registrationsOpen: checked }))} />
                </div>

                <SectionTitle title="Contenu éditorial" />
                <TextField label="Titre hero" value={editor.details.heroTitle} onChange={(value) => updateDetails({ heroTitle: value })} placeholder="Laisser vide pour reprendre le titre de l'événement" />
                <TextAreaField label="Sous-titre hero" value={editor.details.heroSubtitle} onChange={(value) => updateDetails({ heroSubtitle: value })} rows={3} />
                <TextAreaField label="Résumé court" value={editor.details.summary} onChange={(value) => updateDetails({ summary: value })} rows={3} />
                <TextAreaField label="Description principale" value={editor.details.description} onChange={(value) => updateDetails({ description: value })} rows={6} />

                <SectionTitle title="Informations pratiques" />
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField label="Lieu" value={editor.details.locationName} onChange={(value) => updateDetails({ locationName: value })} />
                  <TextField label="Adresse" value={editor.details.address} onChange={(value) => updateDetails({ address: value })} />
                  <TextField label="Horaires / créneau" value={editor.details.scheduleText} onChange={(value) => updateDetails({ scheduleText: value })} />
                  <TextField label="Tarif" value={editor.details.priceText} onChange={(value) => updateDetails({ priceText: value })} />
                  <TextField label="Saison cible athlètes club" value={editor.details.targetSeason} onChange={(value) => updateDetails({ targetSeason: value })} placeholder="2025-2026" />
                </div>
                <TextAreaField label="Bloc infos pratiques" value={editor.details.practicalInfo} onChange={(value) => updateDetails({ practicalInfo: value })} rows={5} />

                <SectionTitle title="Bloc inscriptions" />
                <TextField label="Titre section inscriptions" value={editor.details.registrationsTitle} onChange={(value) => updateDetails({ registrationsTitle: value })} />
                <TextAreaField label="Texte d'introduction" value={editor.details.registrationsText} onChange={(value) => updateDetails({ registrationsText: value })} rows={4} />
                <TextField label="Titre formulaire athlète club" value={editor.details.clubAthleteFormTitle} onChange={(value) => updateDetails({ clubAthleteFormTitle: value })} />
                <TextAreaField label="Texte formulaire athlète club" value={editor.details.clubAthleteFormText} onChange={(value) => updateDetails({ clubAthleteFormText: value })} rows={3} />
                <TextField label="Titre formulaire externe" value={editor.details.externalFormTitle} onChange={(value) => updateDetails({ externalFormTitle: value })} />
                <TextAreaField label="Texte formulaire externe" value={editor.details.externalFormText} onChange={(value) => updateDetails({ externalFormText: value })} rows={3} />
              </div>

              <div className="space-y-8">
                <SectionTitle title="Boutons découverte club" />
                <div className="space-y-3">
                  {editor.details.practicalLinks.map((link, index) => (
                    <div key={`${link.label}-${index}`} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                        <TextField label="Label" value={link.label} onChange={(value) => updatePracticalLink(index, { label: value })} />
                        <TextField label="Lien" value={link.href} onChange={(value) => updatePracticalLink(index, { href: value })} />
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => removePracticalLink(index)}
                            className="w-full rounded-full border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addPracticalLink}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
                >
                  Ajouter un bouton
                </button>

                <SectionTitle title="Aperçu rapide" />
                <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-5 text-white">
                  {editor.imageUrl ? (
                    <Image
                      src={editor.imageUrl}
                      alt={editor.title || "Aperçu événement"}
                      width={1200}
                      height={384}
                      sizes="(max-width: 1280px) 100vw, 560px"
                      className="mb-4 h-48 w-full rounded-[1.5rem] object-cover"
                    />
                  ) : (
                    <div className="mb-4 flex h-48 items-center justify-center rounded-[1.5rem] bg-slate-800 text-sm text-slate-400">
                      Le visuel apparaîtra ici
                    </div>
                  )}
                  <div className="text-xs uppercase tracking-[0.28em] text-amber-300">{editor.eventDate ? new Date(editor.eventDate).toLocaleDateString("fr-FR") : "Date à définir"}</div>
                  <div className="mt-3 text-2xl font-black">{editor.details.heroTitle || editor.title || "Titre de l'événement"}</div>
                  <div className="mt-3 text-sm leading-6 text-slate-300">{editor.details.summary}</div>
                </div>

                <SectionTitle title="Inscriptions enregistrées" />
                <button
                  type="button"
                  onClick={() => setShowParticipantsList((prev) => !prev)}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
                >
                  {showParticipantsList ? "Masquer la liste des participants" : "Afficher la liste des participants"}
                </button>
                <div className="grid gap-4 md:grid-cols-2">
                  <RegistrationBox
                    title={`Athlètes du club (${clubRegistrations.length})`}
                    items={clubRegistrations.map((item) => `${item.athlete_name || "Athlète"}${item.athlete_team ? ` · ${item.athlete_team}` : ""}${item.email ? ` · ${item.email}` : ""}`)}
                  />
                  <RegistrationBox
                    title={`Participants externes (${externalRegistrations.length})`}
                    items={externalRegistrations.map((item) => `${item.full_name}${item.city ? ` · ${item.city}` : ""}${item.email ? ` · ${item.email}` : ""}`)}
                  />
                </div>

                {showParticipantsList && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="text-sm font-semibold text-slate-900">Athlètes triés par équipe</div>
                      <div className="mt-3 space-y-4 text-sm text-slate-600">
                        {clubParticipantsByTeam.length ? (
                          clubParticipantsByTeam.map(([team, participants]) => (
                            <div key={team} className="rounded-xl border border-slate-200 bg-white p-3">
                              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {team} ({participants.length})
                              </div>
                              <div className="mt-2 space-y-1">
                                {participants.map((participant) => (
                                  <div key={participant.id} className="text-sm text-slate-700">
                                    {participant.athlete_name || "Athlète"}
                                    {participant.email ? ` · ${participant.email}` : ""}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-xl bg-white px-3 py-2 text-slate-400">
                            Aucun athlète inscrit.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="text-sm font-semibold text-slate-900">Invités triés par âge (du plus jeune au plus âgé)</div>
                      <div className="mt-3 space-y-2 text-sm text-slate-600">
                        {invitedParticipantsByAge.length ? (
                          invitedParticipantsByAge.map((participant) => {
                            const currentYear = new Date().getFullYear();
                            const age =
                              participant.birth_year && participant.birth_year >= 1900 && participant.birth_year <= currentYear
                                ? currentYear - participant.birth_year
                                : null;

                            return (
                              <div key={participant.id} className="rounded-xl bg-white px-3 py-2">
                                <div className="font-semibold text-slate-800">{participant.full_name}</div>
                                <div className="text-xs text-slate-500">
                                  {age !== null ? `${age} ans` : "Âge inconnu"}
                                  {participant.city ? ` · ${participant.city}` : ""}
                                  {participant.email ? ` · ${participant.email}` : ""}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="rounded-xl bg-white px-3 py-2 text-slate-400">
                            Aucun invité inscrit.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function EvenementsPageFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 text-sm text-slate-300 shadow-2xl shadow-black/30">
          Chargement de l&apos;éditeur événements...
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</h3>;
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
      />
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900"
      />
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
    </label>
  );
}

function RegistrationBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-3 space-y-2 text-sm text-slate-600">
        {items.length ? (
          items.map((item, index) => (
            <div key={`${item}-${index}`} className="rounded-xl bg-white px-3 py-2">
              {item}
            </div>
          ))
        ) : (
          <div className="rounded-xl bg-white px-3 py-2 text-slate-400">
            Aucune inscription pour le moment.
          </div>
        )}
      </div>
    </div>
  );
}