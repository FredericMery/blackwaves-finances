"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function SurveysReportingPage() {
  const [surveys, setSurveys] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/bureau/surveys/list')
        const data = await res.json()
        if (data.ok) {
          setSurveys(data.surveys || [])
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return <div className="p-8 text-center">Chargement...</div>
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <Link href="/bureau/surveys" className="text-sm text-sky-600 hover:underline mb-2 inline-block">
          ← Retour aux sondages
        </Link>
        <h1 className="text-3xl font-bold mb-2">Reporting des sondages</h1>
        <p className="text-slate-600">Sélectionnez un sondage pour voir les réponses et statistiques.</p>
      </div>

      {surveys.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-slate-600">Aucun sondage trouvé</p>
          <Link href="/bureau/surveys/create" className="mt-4 inline-block px-4 py-2 bg-sky-600 text-white rounded">
            Créer un sondage
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {surveys.map(survey => (
            <Link
              key={survey.id}
              href={`/bureau/surveys/${survey.id}/reporting`}
              className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition border border-slate-200"
            >
              <h3 className="font-bold text-lg mb-2">{survey.title}</h3>
              <div className="text-sm text-slate-500 space-y-1">
                <div>Créé le {new Date(survey.created_at).toLocaleDateString()}</div>
                <div className="font-semibold text-sky-600">{survey.response_count || 0} réponse(s)</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
