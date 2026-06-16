"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type Role = "parent" | "coach" | "bureau"

type AccessUser = {
  id: string
  email: string
  full_name: string
  role: Role
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
  disabled: boolean
}

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<AccessUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    full_name: "",
    role: "parent" as Role,
    password: "",
  })

  useEffect(() => {
    loadUser()
  }, [params.id])

  const loadUser = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/bureau/access/users/${params.id}`)
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || "Erreur chargement")
      
      setUser(data.user)
      setForm({
        full_name: data.user.full_name || "",
        role: data.user.role,
        password: "",
      })
    } catch (e: any) {
      setError(e.message || "Erreur")
    } finally {
      setLoading(false)
    }
  }

  const saveChanges = async () => {
    setSaving(true)
    setError("")
    try {
      const res = await fetch(`/api/bureau/access/users/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name,
          role: form.role,
          ...(form.password && { password: form.password }),
        }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || "Erreur mise à jour")
      
      await loadUser()
    } catch (e: any) {
      setError(e.message || "Erreur")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-slate-300">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/bureau/access" className="text-sky-400 hover:text-sky-300 mb-4 inline-block">
            ← Retour à la gestion des accès
          </Link>
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
            Utilisateur non trouvé
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-4 border-b border-white/10 pb-6">
          <Link href="/bureau/access" className="inline-flex items-center text-sm text-sky-400 hover:text-sky-300 transition">
            <span className="mr-2">←</span> Gestion des droits d'accès
          </Link>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Fiche utilisateur
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              Modifiez les informations et l'accès de cet utilisateur
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-red-200 flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div>{error}</div>
          </div>
        )}

        {/* Fiche Utilisateur */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/40 backdrop-blur p-8 space-y-8">
          {/* Section Infos de Base */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
              <span className="text-3xl">👤</span>
              <h2 className="text-2xl font-semibold">Informations personnelles</h2>
            </div>

            {/* Email - Read Only */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Email</label>
              <div className="px-4 py-3 rounded-lg bg-slate-800/50 border border-white/10 text-white font-mono text-sm">
                {user.email}
              </div>
              <p className="text-xs text-slate-500 mt-1">Email de connexion (non modifiable)</p>
            </div>

            {/* Nom complet */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Nom complet</label>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                placeholder="Ex: Jean Dupont"
                className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-white/10 text-white placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
              />
            </div>
          </div>

          {/* Section Accès */}
          <div className="space-y-6 pt-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
              <span className="text-3xl">🔐</span>
              <h2 className="text-2xl font-semibold">Accès & permissions</h2>
            </div>

            {/* Rôle */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Rôle</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
                className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-white/10 text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
              >
                <option value="parent">👨‍👩‍👧 Parent</option>
                <option value="coach">🎯 Coach</option>
                <option value="bureau">🏢 Bureau</option>
              </select>
              <div className="mt-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/50 text-xs text-slate-300">
                <p className="font-medium mb-1">Permissions du rôle:</p>
                {form.role === "parent" && <p>Accès à la section Parent - gestion des enfants et documents</p>}
                {form.role === "coach" && <p>Accès à la section Coach - gestion de l'équipe et plannings</p>}
                {form.role === "bureau" && <p>Accès administrateur - gestion complète du bureau</p>}
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Nouveau mot de passe (optionnel)</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Laisser vide pour ne pas modifier"
                className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-white/10 text-white placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
              />
              <p className="text-xs text-slate-500 mt-1">Si rempli, le mot de passe sera changé</p>
            </div>
          </div>

          {/* Section Métadonnées */}
          <div className="space-y-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
              <span className="text-3xl">📋</span>
              <h2 className="text-lg font-semibold">Historique</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Créé le</p>
                <p className="text-sm text-slate-200 mt-1">
                  {user.created_at ? new Date(user.created_at).toLocaleString("fr-FR") : "—"}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Dernière connexion</p>
                <p className="text-sm text-slate-200 mt-1">
                  {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("fr-FR") : "Jamais connecté"}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Email confirmé</p>
                <p className="text-sm text-slate-200 mt-1">
                  {user.email_confirmed_at ? (
                    <span className="text-emerald-400">✓ Confirmé</span>
                  ) : (
                    <span className="text-amber-400">⏳ En attente</span>
                  )}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
                <p className="text-xs text-slate-400 uppercase tracking-wide">État du compte</p>
                <p className="text-sm text-slate-200 mt-1">
                  {user.disabled ? (
                    <span className="text-red-400">🔒 Désactivé</span>
                  ) : (
                    <span className="text-emerald-400">✓ Actif</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <button
              onClick={saveChanges}
              disabled={saving}
              className="px-6 py-3 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 font-semibold transition shadow-lg hover:shadow-emerald-500/20"
            >
              {saving ? "Mise à jour..." : "Enregistrer les modifications"}
            </button>
            <Link
              href="/bureau/access"
              className="px-6 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 font-semibold transition"
            >
              Annuler
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
