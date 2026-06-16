"use client";

import { useState, useEffect, FormEvent } from "react";
import { supabase } from "@/lib/supabaseClient";

type StaffRoleType = "bureau" | "coach";

type StaffContact = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role_type: StaffRoleType;
  role_label: string;
  team: string | null;
  notify_trainings: boolean;
  notify_compets: boolean;
  notify_events: boolean;
  is_active: boolean;
};

type StaffForm = {
  first_name: string;
  last_name: string;
  email: string;
  role_type: StaffRoleType;
  role_label: string;
  team: string;
  notify_trainings: boolean;
  notify_compets: boolean;
  notify_events: boolean;
  is_active: boolean;
};

const emptyForm: StaffForm = {
  first_name: "",
  last_name: "",
  email: "",
  role_type: "bureau",
  role_label: "",
  team: "",
  notify_trainings: true,
  notify_compets: true,
  notify_events: true,
  is_active: true,
};

export default function StaffAdminPage() {
  const [staff, setStaff] = useState<StaffContact[]>([]);
  const [form, setForm] = useState<StaffForm>(emptyForm);
  const [loading, setLoading] = useState(false);

  async function loadStaff() {
    const { data, error } = await supabase
      .from("staff_contacts")
      .select("*")
      .order("last_name", { ascending: true });

    if (error) {
      console.error("Erreur chargement staff:", error.message);
      return;
    }
    if (data) setStaff(data as StaffContact[]);
  }

  useEffect(() => {
    loadStaff();
  }, []);

  function updateField<K extends keyof StaffForm>(field: K, value: StaffForm[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submitForm(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...form,
      team: form.team ? form.team : null,
    };

    const { error } = await supabase.from("staff_contacts").insert([payload]);

    setLoading(false);

    if (error) {
      console.error(error);
      alert("Erreur lors de l'ajout : " + error.message);
      return;
    }

    alert("Membre ajouté !");
    setForm(emptyForm);
    loadStaff();
  }

  async function deleteStaff(id: string) {
    const ok = confirm("Confirmer la suppression de ce membre ?");
    if (!ok) return;

    const { error } = await supabase.from("staff_contacts").delete().eq("id", id);

    if (error) {
      console.error(error);
      alert("Erreur lors de la suppression : " + error.message);
      return;
    }

    loadStaff();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-bw-dark via-slate-900 to-bw-dark pt-28 pb-16">
      <div className="max-w-5xl mx-auto px-4 text-white">
        <h1 className="text-3xl font-bold mb-2">Administration — Staff & Coachs</h1>
        <p className="text-sm text-bw-light/70 mb-8">
          Ajoutez ici les membres du bureau et les coachs. Ces informations
          serviront pour les notifications automatiques du planning.
        </p>

        {/* FORMULAIRE */}
        <div className="bg-black/60 backdrop-blur-sm p-6 md:p-8 rounded-2xl border border-bw-blue/60 shadow-xl mb-10">
          <h2 className="text-xl font-semibold mb-4">Ajouter un membre</h2>

          <form onSubmit={submitForm} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Prénom */}
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase tracking-wide text-bw-light/70">
                Prénom
              </label>
              <input
                type="text"
                value={form.first_name}
                onChange={(e) => updateField("first_name", e.target.value)}
                className="p-2 rounded-md bg-slate-900 border border-bw-light/40 focus:outline-none focus:border-bw-blue"
                required
              />
            </div>

            {/* Nom */}
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase tracking-wide text-bw-light/70">
                Nom
              </label>
              <input
                type="text"
                value={form.last_name}
                onChange={(e) => updateField("last_name", e.target.value)}
                className="p-2 rounded-md bg-slate-900 border border-bw-light/40 focus:outline-none focus:border-bw-blue"
                required
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase tracking-wide text-bw-light/70">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                className="p-2 rounded-md bg-slate-900 border border-bw-light/40 focus:outline-none focus:border-bw-blue"
                required
              />
            </div>

            {/* Type */}
            <div className="flex flex-col gap-1">
              <label className="text-xs uppercase tracking-wide text-bw-light/70">
                Type
              </label>
              <select
                value={form.role_type}
                onChange={(e) =>
                  updateField("role_type", e.target.value as StaffRoleType)
                }
                className="p-2 rounded-md bg-slate-900 border border-bw-light/40 focus:outline-none focus:border-bw-blue"
              >
                <option value="bureau">Bureau</option>
                <option value="coach">Coach</option>
              </select>
            </div>

            {/* Rôle */}
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-xs uppercase tracking-wide text-bw-light/70">
                Rôle
              </label>
              <input
                type="text"
                placeholder="Président, Vice-présidente, Coach Minis..."
                value={form.role_label}
                onChange={(e) => updateField("role_label", e.target.value)}
                className="p-2 rounded-md bg-slate-900 border border-bw-light/40 focus:outline-none focus:border-bw-blue"
                required
              />
            </div>

            {/* Équipe (si coach) */}
            {form.role_type === "coach" && (
              <div className="flex flex-col gap-1 md:col-span-2">
                <label className="text-xs uppercase tracking-wide text-bw-light/70">
                  Équipe (facultatif)
                </label>
                <input
                  type="text"
                  placeholder="Ex : Black Waves Juniors"
                  value={form.team}
                  onChange={(e) => updateField("team", e.target.value)}
                  className="p-2 rounded-md bg-slate-900 border border-bw-light/40 focus:outline-none focus:border-bw-blue"
                />
              </div>
            )}

            {/* Notifs + Actif */}
            <div className="md:col-span-2 mt-2 flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.notify_trainings}
                  onChange={(e) => updateField("notify_trainings", e.target.checked)}
                />
                <span>Notifier pour les entraînements</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.notify_compets}
                  onChange={(e) => updateField("notify_compets", e.target.checked)}
                />
                <span>Notifier pour les compétitions</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.notify_events}
                  onChange={(e) => updateField("notify_events", e.target.checked)}
                />
                <span>Notifier pour les événements club</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => updateField("is_active", e.target.checked)}
                />
                <span>Actif</span>
              </label>
            </div>

            <div className="md:col-span-2 mt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto px-6 py-2 bg-bw-blue rounded-md font-semibold hover:bg-bw-light transition disabled:opacity-50"
              >
                {loading ? "Enregistrement..." : "Ajouter le membre"}
              </button>
            </div>
          </form>
        </div>

        {/* LISTE */}
        <h2 className="text-xl font-semibold mb-4">Membres enregistrés</h2>
        <div className="bg-black/60 backdrop-blur-sm p-6 rounded-2xl border border-bw-blue/60 shadow-xl space-y-2">
          {staff.length === 0 && (
            <p className="text-sm text-bw-light/70">
              Aucun membre pour l&apos;instant. Ajoutez un premier membre avec le
              formulaire ci-dessus.
            </p>
          )}

          {staff.map((s: StaffContact) => (
            <div
              key={s.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-bw-light/20 py-2 gap-2"
            >
              <div className="text-sm">
                <span className="font-semibold">
                  {s.first_name} {s.last_name}
                </span>{" "}
                – {s.role_label} ({s.role_type})
                {s.team && <span> – {s.team}</span>}
                {!s.is_active && (
                  <span className="ml-2 text-xs text-red-300">(inactif)</span>
                )}
                <div className="text-bw-light/60 text-xs">{s.email}</div>
              </div>

              <button
                onClick={() => deleteStaff(s.id)}
                className="self-start sm:self-auto text-xs text-red-400 hover:text-red-200"
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

