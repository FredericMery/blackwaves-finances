"use client"

import { useEffect, useMemo, useState } from "react"
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

export default function BureauAccessPage() {
  const [users, setUsers] = useState<AccessUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "parent" as Role,
  })
  const [creating, setCreating] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [query, setQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all")

  const [editedRoles, setEditedRoles] = useState<Record<string, Role>>({})

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/bureau/access/users")
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || "Erreur chargement")
      setUsers(data.users || [])
      const initial: Record<string, Role> = {}
      for (const u of data.users || []) initial[u.id] = u.role
      setEditedRoles(initial)
    } catch (e: any) {
      setError(e.message || "Erreur")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false
      if (query.trim()) {
        const q = query.toLowerCase()
        if (!`${u.full_name} ${u.email}`.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [users, roleFilter, query])

  const totals = useMemo(() => {
    return {
      total: users.length,
      bureau: users.filter((u) => u.role === "bureau").length,
      coach: users.filter((u) => u.role === "coach").length,
      parent: users.filter((u) => u.role === "parent").length,
    }
  }, [users])

  const createUser = async () => {
    setFormErrors({})
    setSuccessMsg("")
    
    // Validations
    const errors: Record<string, string> = {}
    if (!form.full_name.trim()) errors.full_name = "Le nom est requis"
    if (!form.email.trim()) errors.email = "L'email est requis"
    if (!form.email.includes("@")) errors.email = "Email invalide"
    if (!form.password || form.password.length < 6) errors.password = "Au minimum 6 caractères"
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setCreating(true)
    setError("")
    try {
      const res = await fetch("/api/bureau/access/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || "Création impossible")

      setSuccessMsg(`✓ ${form.full_name} a été créé avec succès!`)
      setForm({ full_name: "", email: "", password: "", role: "parent" })
      await load()
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMsg(""), 3000)
    } catch (e: any) {
      setError(e.message || "Erreur création")
    } finally {
      setCreating(false)
    }
  }

  const saveRole = async (u: AccessUser) => {
    const nextRole = editedRoles[u.id]
    if (!nextRole || nextRole === u.role) return

    setSavingId(u.id)
    setError("")
    try {
      const res = await fetch("/api/bureau/access/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: u.id,
          role: nextRole,
          full_name: u.full_name,
        }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || "Mise à jour impossible")
      await load()
    } catch (e: any) {
      setError(e.message || "Erreur mise à jour")
    } finally {
      setSavingId(null)
    }
  }

  const deleteUser = async (u: AccessUser) => {
    if (!confirm(`Supprimer l'accès de ${u.full_name || u.email} ?`)) return

    setDeletingId(u.id)
    setError("")
    try {
      const res = await fetch("/api/bureau/access/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: u.id }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || "Suppression impossible")
      await load()
    } catch (e: any) {
      setError(e.message || "Erreur suppression")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-3 border-b border-white/10 pb-6">
          <Link href="/bureau" className="inline-flex items-center text-sm text-sky-400 hover:text-sky-300 transition">
            <span className="mr-2">←</span> Retour Bureau
          </Link>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Gestion des droits d'accès
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              Créez des utilisateurs et affectez leur rôle pour gérer les accès aux différents modules.
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-red-200 flex items-start gap-3 animate-in fade-in">
            <span className="text-lg">⚠️</span>
            <div>{error}</div>
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm text-emerald-200 flex items-start gap-3 animate-in fade-in">
            <span className="text-lg">✓</span>
            <div>{successMsg}</div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric icon="👥" title="Total" value={totals.total} color="from-blue-600 to-blue-700" />
          <Metric icon="🏢" title="Bureau" value={totals.bureau} color="from-purple-600 to-purple-700" />
          <Metric icon="🎯" title="Coach" value={totals.coach} color="from-orange-600 to-orange-700" />
          <Metric icon="👨‍👩‍👧" title="Parent" value={totals.parent} color="from-green-600 to-green-700" />
        </div>

        {/* Create Form */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/40 backdrop-blur p-6 md:p-8">
          <div className="flex items-center gap-3 mb-8 pb-6 border-b border-white/10">
            <span className="text-3xl">➕</span>
            <div>
              <h2 className="text-2xl font-semibold">Ajouter un utilisateur</h2>
              <p className="text-sm text-slate-400 mt-1">Complétez le formulaire pour créer un nouveau compte</p>
            </div>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            {/* Column 1: Name & Email */}
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  👤 Nom complet <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.full_name}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, full_name: e.target.value }))
                    setFormErrors((e) => ({ ...e, full_name: "" }))
                  }}
                  placeholder="Ex: Jean Dupont"
                  className={`w-full px-4 py-3 rounded-lg bg-slate-800/50 border transition text-white placeholder-slate-500 focus:ring-1 focus:ring-sky-500 ${
                    formErrors.full_name ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-sky-500"
                  }`}
                />
                {formErrors.full_name && <p className="text-red-400 text-xs mt-1">{formErrors.full_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  📧 Email <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.email}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, email: e.target.value }))
                    setFormErrors((e) => ({ ...e, email: "" }))
                  }}
                  placeholder="utilisateur@example.com"
                  type="email"
                  className={`w-full px-4 py-3 rounded-lg bg-slate-800/50 border transition text-white placeholder-slate-500 focus:ring-1 focus:ring-sky-500 ${
                    formErrors.email ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-sky-500"
                  }`}
                />
                {formErrors.email && <p className="text-red-400 text-xs mt-1">{formErrors.email}</p>}
              </div>
            </div>

            {/* Column 2: Password & Role */}
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  🔐 Mot de passe <span className="text-red-400">*</span>
                </label>
                <input
                  value={form.password}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, password: e.target.value }))
                    setFormErrors((e) => ({ ...e, password: "" }))
                  }}
                  placeholder="Minimum 6 caractères"
                  type="password"
                  className={`w-full px-4 py-3 rounded-lg bg-slate-800/50 border transition text-white placeholder-slate-500 focus:ring-1 focus:ring-sky-500 ${
                    formErrors.password ? "border-red-500/50 focus:border-red-500" : "border-white/10 focus:border-sky-500"
                  }`}
                />
                {formErrors.password && <p className="text-red-400 text-xs mt-1">{formErrors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  🎯 Rôle <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-white/10 text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
                >
                  <option value="parent">👨‍👩‍👧 Parent</option>
                  <option value="coach">🎯 Coach</option>
                  <option value="bureau">🏢 Bureau</option>
                </select>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={createUser}
            disabled={creating}
            className="w-full mt-8 px-6 py-3 rounded-lg bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:opacity-50 font-semibold transition shadow-lg hover:shadow-violet-500/20 text-white"
          >
            {creating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span> Création en cours...
              </span>
            ) : (
              "Créer l'utilisateur"
            )}
          </button>
        </div>

        {/* Users Table */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-800/40 backdrop-blur p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">👤</span>
              <h2 className="text-xl font-semibold">Utilisateurs & affectations</h2>
              <span className="text-xs bg-slate-700/50 text-slate-300 px-3 py-1 rounded-full">{filteredUsers.length}</span>
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher par nom ou email..."
                className="flex-1 md:w-64 px-4 py-2.5 rounded-lg bg-slate-800/50 border border-white/10 text-white placeholder-slate-500 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as any)}
                className="px-4 py-2.5 rounded-lg bg-slate-800/50 border border-white/10 text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
              >
                <option value="all">Tous rôles</option>
                <option value="bureau">Bureau</option>
                <option value="coach">Coach</option>
                <option value="parent">Parent</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <div className="text-center">
                <div className="inline-block animate-spin mb-3 text-2xl">⏳</div>
                <p>Chargement des utilisateurs...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-300 border-b border-white/10">
                    <th className="text-left py-3 px-4 font-semibold">Nom</th>
                    <th className="text-left py-3 px-4 font-semibold">Email</th>
                    <th className="text-left py-3 px-4 font-semibold">Rôle</th>
                    <th className="text-left py-3 px-4 font-semibold">Dernière connexion</th>
                    <th className="text-left py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition">
                      <td className="py-4 px-4 font-medium">{u.full_name || "—"}</td>
                      <td className="py-4 px-4 text-slate-300 break-all">{u.email}</td>
                      <td className="py-4 px-4">
                        <select
                          value={editedRoles[u.id] || u.role}
                          onChange={(e) => setEditedRoles((prev) => ({ ...prev, [u.id]: e.target.value as Role }))}
                          className="px-3 py-1.5 rounded-lg bg-slate-800/70 border border-white/10 text-white focus:border-sky-500 transition text-sm"
                        >
                          <option value="bureau">Bureau</option>
                          <option value="coach">Coach</option>
                          <option value="parent">Parent</option>
                        </select>
                      </td>
                      <td className="py-4 px-4 text-slate-400 text-xs">
                        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("fr-FR") : "Jamais connecté"}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex gap-2">
                          <Link
                            href={`/bureau/access/${u.id}`}
                            className="px-3 py-1.5 rounded-lg bg-violet-600/80 hover:bg-violet-600 text-white font-medium text-xs transition"
                          >
                            Voir fiche
                          </Link>
                          <button
                            type="button"
                            onClick={() => saveRole(u)}
                            disabled={savingId === u.id || (editedRoles[u.id] || u.role) === u.role}
                            className="px-3 py-1.5 rounded-lg bg-sky-600/80 hover:bg-sky-600 text-white disabled:opacity-30 disabled:cursor-not-allowed font-medium text-xs transition"
                          >
                            {savingId === u.id ? "Mise à jour..." : "Mettre à jour"}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteUser(u)}
                            disabled={deletingId === u.id}
                            className="px-3 py-1.5 rounded-lg bg-red-600/60 hover:bg-red-600 text-white disabled:opacity-30 disabled:cursor-not-allowed font-medium text-xs transition"
                          >
                            {deletingId === u.id ? "Suppression..." : "Retirer"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        <span className="text-2xl mb-2 block">📭</span>
                        Aucun utilisateur trouvé.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Metric({ icon, title, value, color }: { icon: string; title: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl border border-white/10 bg-gradient-to-br ${color} bg-opacity-10 p-5 hover:border-white/20 transition`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">{title}</div>
          <div className="text-4xl font-bold mt-2">{value}</div>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  )
}
