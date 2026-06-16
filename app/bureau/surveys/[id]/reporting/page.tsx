"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function SurveyReportingPage() {
  const params = useParams()
  const id = params?.id as string
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'questions' | 'respondents'>('overview')

  useEffect(() => {
    if (!id) return
    
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const res = await fetch(`/api/bureau/surveys/reporting?id=${id}`)
        const json = await res.json()
        
        if (!res.ok || !json.ok) {
          setError(json.error || 'Erreur lors du chargement')
          return
        }
        
        setData(json)
      } catch (e: any) {
        setError(e.message || 'Erreur réseau')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <div className="text-xl text-slate-600">Chargement...</div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <Link href="/bureau/surveys/reporting" className="text-sm text-sky-600 hover:underline mb-4 inline-block">
          ← Retour au reporting
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 text-lg font-semibold mb-2">Erreur</div>
          <div className="text-red-800">{error || 'Sondage introuvable'}</div>
        </div>
      </div>
    )
  }

  const { survey, stats, questions, respondents } = data

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Link href="/bureau/surveys/reporting" className="text-sm text-sky-600 hover:underline mb-4 inline-block">
        ← Retour au reporting
      </Link>
      
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-slate-200">
        <h1 className="text-3xl font-bold mb-2">{survey.title}</h1>
        <p className="text-slate-600">
          Créé le {new Date(survey.created_at).toLocaleDateString('fr-FR')}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <div className="bg-gradient-to-br from-sky-50 to-sky-100 p-6 rounded-lg border border-sky-200">
          <div className="text-sm text-sky-700 font-semibold mb-1">Envoyés</div>
          <div className="text-4xl font-bold text-sky-600">{stats.sent_count}</div>
          <div className="text-xs text-sky-600 mt-2">invitations</div>
        </div>
        
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-lg border border-emerald-200">
          <div className="text-sm text-emerald-700 font-semibold mb-1">Réponses</div>
          <div className="text-4xl font-bold text-emerald-600">{stats.response_count}</div>
          <div className="text-xs text-emerald-600 mt-2">complétées</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
          <div className="text-sm text-purple-700 font-semibold mb-1">Taux</div>
          <div className="text-4xl font-bold text-purple-600">{stats.response_rate}%</div>
          <div className="text-xs text-purple-600 mt-2">de réponse</div>
        </div>
        
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-lg border border-amber-200">
          <div className="text-sm text-amber-700 font-semibold mb-1">En attente</div>
          <div className="text-4xl font-bold text-amber-600">{stats.pending_count}</div>
          <div className="text-xs text-amber-600 mt-2">non répondu</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-t-lg border border-b-0 border-slate-200 flex">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-6 py-3 font-semibold border-b-2 transition ${
            activeTab === 'overview'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Vue d'ensemble
        </button>
        <button
          onClick={() => setActiveTab('questions')}
          className={`px-6 py-3 font-semibold border-b-2 transition ${
            activeTab === 'questions'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Questions ({questions?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('respondents')}
          className={`px-6 py-3 font-semibold border-b-2 transition ${
            activeTab === 'respondents'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Répondants ({stats.response_count})
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-b-lg border border-slate-200 p-6">
        
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-bold mb-4 text-slate-900">Timeline des réponses</h2>
              <div className="bg-slate-50 p-6 rounded-lg">
                <div className="space-y-2">
                  {respondents?.slice(0, 5).map((r: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{r.name}</span>
                      <span className="text-slate-400 text-xs">
                        {new Date(r.created_at).toLocaleDateString('fr-FR')} à {new Date(r.created_at).toLocaleTimeString('fr-FR')}
                      </span>
                    </div>
                  ))}
                  {respondents?.length === 0 && (
                    <p className="text-slate-400 italic">Aucune réponse pour le moment</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Engagement</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Taux de réponse</span>
                      <span className="font-semibold text-sky-600">{stats.response_rate}%</span>
                    </div>
                    <div className="bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-sky-600 h-2 rounded-full transition-all" 
                        style={{ width: `${stats.response_rate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Statut d'envoi</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-emerald-600">Répondus</span>
                    <span className="font-semibold">{stats.response_count}/{stats.sent_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-600">En attente</span>
                    <span className="font-semibold">{stats.pending_count}/{stats.sent_count}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Questions Tab */}
        {activeTab === 'questions' && (
          <div className="space-y-8">
            {questions?.length === 0 ? (
              <p className="text-slate-600 italic">Aucune question trouvée</p>
            ) : (
              questions.map((question: any, idx: number) => (
                <div key={question.id} className="border-t border-slate-200 pt-6">
                  <h3 className="font-semibold text-lg mb-2 text-slate-900">
                    {idx + 1}. {question.question_text}
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">
                    Type: <span className="font-medium">{question.type}</span> • 
                    <span className="ml-2">{question.response_count} réponse(s)</span>
                  </p>

                  {/* Short/Long Text */}
                  {(question.type === 'short_text' || question.type === 'long_text') && (
                    <div className="space-y-3">
                      {question.responses?.map((resp: string, i: number) => (
                        <div key={i} className="bg-slate-50 p-3 rounded text-sm">
                          {resp}
                        </div>
                      ))}
                      {!question.responses?.length && (
                        <p className="text-slate-400 italic">Aucune réponse texte</p>
                      )}
                    </div>
                  )}

                  {/* Single/Multiple Choice, Dropdown */}
                  {(question.type === 'single_choice' || question.type === 'multiple_choice' || question.type === 'dropdown') && (
                    <div className="space-y-3">
                      {Object.entries(question.options || {}).map(([optId, opt]: [string, any]) => (
                        <div key={optId}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-slate-700">{opt.text}</span>
                            <span className="text-sm font-semibold text-slate-600">
                              {opt.count} ({opt.percentage}%)
                            </span>
                          </div>
                          <div className="bg-slate-200 rounded-full h-2">
                            <div 
                              className="bg-sky-500 h-2 rounded-full transition-all" 
                              style={{ width: `${opt.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Rating/Scale */}
                  {(question.type === 'rating' || question.type === 'scale') && (
                    <div className="bg-slate-50 p-4 rounded space-y-3">
                      <div>
                        <p className="text-sm text-slate-600">Moyenne: <span className="font-bold text-lg text-sky-600">{question.average}</span></p>
                      </div>
                      <div className="text-sm text-slate-600">
                        <p>Plage: {question.min} - {question.max}</p>
                      </div>
                    </div>
                  )}

                  {/* Yes/No */}
                  {question.type === 'yes_no' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-emerald-50 p-4 rounded border border-emerald-200">
                        <p className="text-sm text-emerald-600 mb-1">Oui</p>
                        <p className="text-2xl font-bold text-emerald-600">{question.yes_percentage}%</p>
                        <p className="text-xs text-emerald-600 mt-1">({question.yes_count} votes)</p>
                      </div>
                      <div className="bg-red-50 p-4 rounded border border-red-200">
                        <p className="text-sm text-red-600 mb-1">Non</p>
                        <p className="text-2xl font-bold text-red-600">{question.no_percentage}%</p>
                        <p className="text-xs text-red-600 mt-1">({question.no_count} votes)</p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Respondents Tab */}
        {activeTab === 'respondents' && (
          <div>
            {respondents?.length === 0 ? (
              <p className="text-slate-600 italic text-center py-8">Aucun répondant pour le moment</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">#</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Athlète (Email)</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-700">Date de réponse</th>
                    </tr>
                  </thead>
                  <tbody>
                    {respondents.map((r: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-600">{idx + 1}</td>
                        <td className="py-3 px-4 text-slate-900 font-medium">{r.name}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {new Date(r.created_at).toLocaleDateString('fr-FR')} à {new Date(r.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
