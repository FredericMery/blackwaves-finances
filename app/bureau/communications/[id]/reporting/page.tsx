"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

export default function ReportingPage() {
  const { id } = useParams()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    fetch(`/api/bureau/communications/reporting?id=${id}`)
      .then(res => res.json())
      .then(res => {
        if (res.ok && res.data) {
          setData(res.data)
        } else {
          setError("Erreur de récupération des données")
        }
      })
      .catch(() => setError("Erreur serveur"))
      .finally(() => setLoading(false))
  }, [id])

  if (loading)
    return <div className="p-10 text-white">Chargement...</div>

  if (error)
    return <div className="p-10 text-red-400">{error}</div>

  if (!data)
    return <div className="p-10 text-white">Aucune donnée disponible</div>

  const stats = data.stats || {}
  const byTeam = data.byTeam || {}
  const recipients = data.recipients || []

  return (
    <div className="min-h-screen bg-slate-950 text-white p-12">
      <div className="max-w-7xl mx-auto space-y-12">

        <h1 className="text-4xl font-bold">Reporting détaillé</h1>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-6">
          <Card title="Ciblés" value={stats.total || 0} />
          <Card title="Envoyés" value={stats.sent || 0} />
          <Card title="Ouverts (%)" value={stats.openRate || 0} />
          <Card title="Réponses (%)" value={stats.responseRate || 0} />
        </div>

        {/* Analyse par équipe */}
        <div className="bg-slate-900 p-6 rounded-xl">
          <h2 className="text-xl font-semibold mb-4">Ouvertures par équipe</h2>

          {Object.keys(byTeam).length === 0 ? (
            <p className="text-white/50">Aucune donnée</p>
          ) : (
            Object.entries(byTeam).map(([team, count]: any) => (
              <div key={team} className="flex justify-between py-2 border-b border-white/10">
                <span>{team}</span>
                <span>{count}</span>
              </div>
            ))
          )}
        </div>

        {/* Détail individuel */}
        <div className="bg-slate-900 p-6 rounded-xl">
          <h2 className="text-xl font-semibold mb-4">Détail par athlète</h2>

          {recipients.length === 0 ? (
            <p className="text-white/50">Aucun destinataire</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-white/60">
                  <th className="text-left">Nom</th>
                  <th className="text-left">Equipe</th>
                  <th>Status</th>
                  <th>Ouvert</th>
                  <th>Répondu</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((r: any) => (
                  <tr key={r.id} className="border-t border-white/10">
                    <td>{r.athletes?.prenom} {r.athletes?.nom}</td>
                    <td>{r.athletes?.equipe}</td>
                    <td>{r.status}</td>
                    <td>{r.opened_at ? "✔" : "-"}</td>
                    <td>{r.responded_at ? "✔" : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  )
}