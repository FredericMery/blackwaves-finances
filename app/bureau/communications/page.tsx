"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

function isSurveyType(type?: string) {
  const t = (type || "").toLowerCase()
  return t.includes("sondage") || t.includes("survey")
}

export default function CommunicationsPage() {
  const [communications, setCommunications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [sendingId, setSendingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const res = await fetch("/api/bureau/communications/list")
    const data = await res.json()
    if (data.ok) setCommunications(data.data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const visibleCommunications = useMemo(
    () => communications.filter((c) => !isSurveyType(c.type)),
    [communications]
  )

  const totals = useMemo(() => {
    const total = visibleCommunications.length
    const drafts = visibleCommunications.filter((c) => !c.sent_at && (c.status === 'draft' || !c.status)).length
    const sent = visibleCommunications.filter((c) => c.sent_at).length
    return { total, drafts, sent }
  }, [visibleCommunications])

  const filtered = useMemo(() => {
    return visibleCommunications.filter((c) => {
      if (statusFilter !== 'all') {
        const isSent = !!c.sent_at
        if (statusFilter === 'sent' && !isSent) return false
        if (statusFilter === 'draft' && isSent) return false
      }
      if (typeFilter !== 'all') {
        if ((c.type || '').toLowerCase() !== typeFilter) return false
      }
      if (query.trim() !== '') {
        const q = query.toLowerCase()
        if (!(`${c.title} ${c.subject || ''}`.toLowerCase().includes(q))) return false
      }
      return true
    })
  }, [visibleCommunications, statusFilter, typeFilter, query])

  async function handleSend(id: string) {
    if (!confirm('Confirmer envoi de cette communication ?')) return
    setSendingId(id)
    try {
      await fetch('/api/bureau/communications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communication_id: id })
      })
      await load()
      alert('Envoi déclenché')
    } catch (e) {
      alert('Erreur lors de l envoi')
    } finally { setSendingId(null) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200 mb-3">
                Module communications
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Gestion des communications</h1>
              <p className="mt-2 text-sm text-slate-300 max-w-3xl">
                Créez, segmentez et suivez vos campagnes d&apos;information avec une vue claire des brouillons et envois.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={load}
                className="h-10 px-4 rounded-lg border border-white/15 bg-white/5 text-sm font-medium text-slate-200 hover:bg-white/10 transition"
              >
                ⟳ Rafraîchir
              </button>
              <Link
                href="/bureau/communications/create"
                className="h-10 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold hover:bg-violet-500 transition"
              >
                + Nouvelle communication
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Total" value={totals.total} icon="📨" />
          <StatCard title="Envoyées" value={totals.sent} icon="✅" />
          <StatCard title="Brouillons" value={totals.drafts} icon="📝" />
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex flex-col xl:flex-row xl:items-center gap-3 xl:justify-between">
            <div className="flex flex-col md:flex-row gap-2 md:items-center w-full xl:w-auto">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher titre ou sujet..."
                className="h-10 w-full md:w-80 px-3 rounded-lg bg-slate-900/90 border border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 rounded-lg bg-slate-900/90 border border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                <option value="all">Tous statuts</option>
                <option value="sent">Envoyées</option>
                <option value="draft">Brouillons</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-10 px-3 rounded-lg bg-slate-900/90 border border-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                <option value="all">Tous types</option>
                <option value="information">Information</option>
                <option value="autre">Autre</option>
              </select>
            </div>

            <div className="text-sm text-slate-400 xl:text-right">{filtered.length} résultat(s)</div>
          </div>
        </section>

        <section className="space-y-3">
          {loading ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-slate-300">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-slate-300">
              Aucune communication trouvée.
            </div>
          ) : (
            filtered.map((c) => (
              <article
                key={c.id}
                className="rounded-xl border border-white/10 bg-slate-900/70 p-4 md:p-5 shadow-sm hover:border-white/20 hover:bg-slate-900 transition"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h2 className="text-lg font-semibold truncate max-w-full">{c.title || "Sans titre"}</h2>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-700/60 text-slate-200">
                        {(c.type || "autre").toUpperCase()}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          c.sent_at ? "bg-emerald-600/20 text-emerald-200" : "bg-amber-500/20 text-amber-200"
                        }`}
                      >
                        {c.sent_at ? "Envoyée" : "Brouillon"}
                      </span>
                    </div>

                    <p className="text-sm text-slate-300 line-clamp-2">
                      {c.subject || (c.content && String(c.content).slice(0, 160)) || "Aucun contenu"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 lg:justify-end">
                    <Link
                      href={`/bureau/communications/${c.id}`}
                      className="h-9 inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-3 text-sm font-medium hover:bg-white/10 transition"
                    >
                      Voir
                    </Link>
                    <Link
                      href={`/bureau/communications/${c.id}/reporting`}
                      className="h-9 inline-flex items-center rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 text-sm font-medium text-sky-100 hover:bg-sky-500/20 transition"
                    >
                      📊 Rapport
                    </Link>
                    {!c.sent_at && (
                      <button
                        disabled={sendingId === c.id}
                        onClick={() => handleSend(c.id)}
                        className="h-9 inline-flex items-center rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {sendingId === c.id ? "Envoi..." : "Envoyer"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon }: { title: string; value: number; icon: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-300">{title}</p>
        <span className="text-lg opacity-80">{icon}</span>
      </div>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
    </div>
  )
}