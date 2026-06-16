"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type Comm = {
  id: string
  title: string
  type: string
  created_at?: string
  status?: string
}

export default function CommunicationsReportingList() {
  const [list, setList] = useState<Comm[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aggregating, setAggregating] = useState(false)
  const [aggregate, setAggregate] = useState<any>(null)

  useEffect(() => {
    fetch("/api/bureau/communications/list")
      .then(r => r.json())
      .then(j => {
        if (j.ok) setList(j.data || [])
        else setError("Erreur récupération communications")
      })
      .catch(() => setError("Erreur réseau"))
      .finally(() => setLoading(false))
  }, [])

  const sondages = list.filter((c) => (c.type || "").toLowerCase().includes("sondage"))

  const computeAggregate = async () => {
    setAggregating(true)
    try {
      const reports = await Promise.all(
        sondages.map(async (c) => {
          const r = await fetch(`/api/bureau/communications/reporting?id=${c.id}`)
          return r.json()
        })
      )

      const stats = reports
        .filter(r => r.ok && r.data && r.data.stats)
        .map(r => r.data.stats)

      const total = stats.reduce((s: number, x: any) => s + (x.total || 0), 0)
      const sent = stats.reduce((s: number, x: any) => s + (x.sent || 0), 0)
      const opened = stats.reduce((s: number, x: any) => s + (x.opened || 0), 0)
      const responded = stats.reduce((s: number, x: any) => s + (x.responded || 0), 0)

      setAggregate({ total, sent, opened, responded })
    } catch (e) {
      setError("Erreur lors de l'agrégation")
    } finally {
      setAggregating(false)
    }
  }

  if (loading) return <div className="p-10 text-white">Chargement...</div>
  if (error) return <div className="p-10 text-rose-400">{error}</div>

  return (
    <div className="min-h-screen bg-slate-950 text-white p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reporting des sondages</h1>
            <p className="text-sm text-slate-300">Liste des sondages envoyés et accès aux rapports détaillés.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={computeAggregate}
              disabled={aggregating || sondages.length === 0}
              className="bg-sky-600 px-4 py-2 rounded-md font-semibold hover:bg-sky-500 disabled:opacity-40"
            >
              {aggregating ? 'Agrégation...' : 'Calculer agrégé'}
            </button>
            <Link href="/bureau/communications" className="text-sm text-slate-300 hover:underline">Retour communications</Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <Card title="Sondages total" value={sondages.length} />
          <Card title="Réponses (agrégées)" value={aggregate ? aggregate.responded : '-'} />
          <Card title="Ouvertures (agrégées)" value={aggregate ? aggregate.opened : '-'} />
        </div>

        <div className="bg-slate-900 p-6 rounded-xl border border-white/10">
          <h2 className="text-xl font-semibold mb-4">Liste des sondages</h2>

          {sondages.length === 0 ? (
            <p className="text-white/50">Aucun sondage trouvé.</p>
          ) : (
            <div className="space-y-3">
              {sondages.map((c) => (
                <div key={c.id} className="flex items-center justify-between bg-slate-800 p-4 rounded-lg border border-white/5">
                  <div>
                    <div className="font-semibold">{c.title}</div>
                    <div className="text-xs text-slate-400">{c.created_at ? new Date(c.created_at).toLocaleString() : ''}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Link href={`/bureau/communications/${c.id}/reporting`} className="bg-emerald-600 px-3 py-1 rounded-md text-sm">Voir rapport</Link>
                    <Link href={`/bureau/communications/${c.id}`} className="text-sm text-slate-300 hover:underline">Détails</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Card({ title, value }: any) {
  return (
    <div className="bg-slate-900 p-6 rounded-xl border border-white/10">
      <p className="text-white/60 text-sm">{title}</p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  )
}
