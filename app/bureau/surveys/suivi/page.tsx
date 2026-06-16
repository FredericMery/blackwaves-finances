"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

type DeliveryRow = {
  id: string
  title: string
  created_at: string
  sent_to_count: number
  mail_received_count: number
  responded_count: number
  non_respondents_count: number
  last_send_at: string | null
}

export default function SurveyDeliveryPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<DeliveryRow[]>([])
  const [relaunchingId, setRelaunchingId] = useState<string | null>(null)
  const [error, setError] = useState("")

  const load = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/bureau/surveys/delivery")
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || "Erreur de chargement")
      setRows(data.surveys || [])
    } catch (e: any) {
      setError(e.message || "Erreur")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.sent += r.sent_to_count || 0
        acc.received += r.mail_received_count || 0
        acc.responded += r.responded_count || 0
        acc.pending += r.non_respondents_count || 0
        return acc
      },
      { sent: 0, received: 0, responded: 0, pending: 0 }
    )
  }, [rows])

  const relaunchNonRespondents = async (surveyId: string) => {
    setRelaunchingId(surveyId)
    setError("")
    try {
      const res = await fetch("/api/bureau/surveys/relaunch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ survey_id: surveyId }),
      })

      const data = await res.json()
      if (!data.ok) throw new Error(data.error || "Relance impossible")

      const msg = `Relance terminée: ${data.sent_count} envoyée(s), ${data.failed_count} échec(s).`
      alert(msg)
      await load()
    } catch (e: any) {
      setError(e.message || "Erreur de relance")
    } finally {
      setRelaunchingId(null)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Chargement du suivi...</div>
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link href="/bureau/surveys" className="text-sm text-sky-600 hover:underline mb-2 inline-block">
          ← Retour gestion des sondages
        </Link>
        <h1 className="text-3xl font-bold mb-2">Suivi des envois de sondages</h1>
        <p className="text-slate-600">Vue globale des campagnes + relance des non-répondants.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Destinataires" value={totals.sent} color="sky" />
        <StatCard label="Mails reçus/ouverts" value={totals.received} color="indigo" />
        <StatCard label="Réponses" value={totals.responded} color="emerald" />
        <StatCard label="Non-répondants" value={totals.pending} color="amber" />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Sondage</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-700">Envoyé à</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-700">Mail reçu/ouvert</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-700">A répondu</th>
              <th className="text-center px-4 py-3 font-semibold text-slate-700">Non-répondants</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  Aucun sondage trouvé.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{r.title || "Sondage sans titre"}</div>
                    <div className="text-xs text-slate-500">
                      Créé le {new Date(r.created_at).toLocaleDateString("fr-FR")}
                      {r.last_send_at ? ` · dernier envoi ${new Date(r.last_send_at).toLocaleDateString("fr-FR")}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-slate-800">{r.sent_to_count}</td>
                  <td className="px-4 py-3 text-center font-semibold text-indigo-600">{r.mail_received_count}</td>
                  <td className="px-4 py-3 text-center font-semibold text-emerald-600">{r.responded_count}</td>
                  <td className="px-4 py-3 text-center font-semibold text-amber-600">{r.non_respondents_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/bureau/surveys/${r.id}/reporting`}
                        className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Voir reporting
                      </Link>
                      <button
                        type="button"
                        onClick={() => relaunchNonRespondents(r.id)}
                        disabled={r.non_respondents_count === 0 || relaunchingId === r.id}
                        className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {relaunchingId === r.id ? "Relance..." : "Relancer non-répondants"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: "sky" | "indigo" | "emerald" | "amber" }) {
  const styles = {
    sky: "border-sky-200 bg-sky-50 text-sky-700",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  }

  return (
    <div className={`rounded-xl border p-4 ${styles[color]}`}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
    </div>
  )
}
