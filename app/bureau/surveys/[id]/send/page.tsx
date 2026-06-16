"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

export default function SurveySendPage() {
  const { id } = useParams()
  const router = useRouter()
  const [survey, setSurvey] = useState<any>(null)
  const [athletes, setAthletes] = useState<any[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [filterSeason, setFilterSeason] = useState<string>('')
  const [filterTeam, setFilterTeam] = useState<string>('')
  const [seasons, setSeasons] = useState<string[]>([])

  useEffect(() => {
    const load = async () => {
      const [surveyRes, athletesRes] = await Promise.all([
        fetch(`/api/bureau/surveys/get?id=${id}`),
        fetch('/api/bureau/athletes')
      ])
      const surveyData = await surveyRes.json()
      const athletesData = await athletesRes.json()
      
      if (surveyData.ok) setSurvey(surveyData.survey)
      if (athletesData.ok) {
        setAthletes(athletesData.data || [])
        // Get unique seasons and teams from meta
        const uniqueSeasons = (athletesData.meta?.seasons || []).filter(Boolean) as string[]
        setSeasons(uniqueSeasons.sort())
      }
    }
    load()
  }, [id])

  const toggleAll = () => {
    const filtered = getFilteredAthletes()
    if (selected.length === filtered.length) {
      setSelected([])
    } else {
      setSelected(filtered.map(a => a.id))
    }
  }

  const toggleOne = (athleteId: number) => {
    setSelected(prev => 
      prev.includes(athleteId) 
        ? prev.filter(id => id !== athleteId)
        : [...prev, athleteId]
    )
  }

  const getFilteredAthletes = () => {
    return athletes
      .filter(a => a.email_parent)
      .filter(a => !filterSeason || a.saison === filterSeason)
      .filter(a => !filterTeam || a.equipe === filterTeam)
  }

  const uniqueTeams = [...new Set(athletes.filter(a => a.equipe).map(a => a.equipe))].sort() as string[]

  const handleSend = async () => {
    if (selected.length === 0) return alert("Sélectionnez au moins un destinataire")
    
    setSending(true)
    try {
      const res = await fetch('/api/bureau/surveys/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          survey_id: String(id), 
          recipients: selected,
          sendEmails: true 
        })
      })
      const data = await res.json()
      
      if (data.ok) {
        setSent(true)
        setTimeout(() => router.push(`/bureau/surveys/${id}/reporting`), 2000)
      } else {
        alert('Erreur: ' + (data.error || ''))
      }
    } catch (e) {
      alert('Erreur serveur')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 text-center">
          <div className="text-4xl mb-3">✅</div>
          <h2 className="text-xl font-bold text-emerald-900 mb-2">Sondage envoyé</h2>
          <p className="text-emerald-700">Les emails ont été envoyés aux destinataires sélectionnés.</p>
          <p className="text-sm text-emerald-600 mt-2">Redirection vers le reporting...</p>
        </div>
      </div>
    )
  }

  if (!survey) {
    return <div className="p-8 text-center">Chargement...</div>
  }

  const filteredAthletes = getFilteredAthletes()

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href={`/bureau/surveys`} className="text-sm text-sky-600 hover:underline mb-2 inline-block">
          ← Retour aux sondages
        </Link>
        <h1 className="text-3xl font-bold mb-2">Envoyer le sondage</h1>
        <p className="text-lg text-slate-600">{survey.title}</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Sélectionner les destinataires</h2>
          <div className="text-sm text-slate-500">
            {selected.length} / {filteredAthletes.length} sélectionné(s)
          </div>
        </div>

        {/* Filtres */}
        <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-slate-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Saison</label>
            <select 
              value={filterSeason}
              onChange={(e) => setFilterSeason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="">Toutes les saisons</option>
              {seasons.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Équipe</label>
            <select 
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="">Toutes les équipes</option>
              {uniqueTeams.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input 
              type="checkbox" 
              checked={selected.length === filteredAthletes.length && filteredAthletes.length > 0}
              onChange={toggleAll}
              className="w-4 h-4"
            />
            Tout sélectionner ({filteredAthletes.length} parents avec email)
          </label>
        </div>

        <div className="border rounded-lg max-h-96 overflow-y-auto">
          {filteredAthletes.length === 0 ? (
            <div className="p-4 text-center text-slate-500">
              Aucun parent avec email disponible
            </div>
          ) : (
            <div className="divide-y">
              {filteredAthletes.map(athlete => (
                <label 
                  key={athlete.id} 
                  className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer"
                >
                  <input 
                    type="checkbox" 
                    checked={selected.includes(athlete.id)}
                    onChange={() => toggleOne(athlete.id)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <div>
                      <div className="font-medium text-slate-900">{athlete.prenom} {athlete.nom}</div>
                      <div className="text-xs text-slate-400">Athlète</div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-700">{athlete.email_parent}</div>
                      <div className="text-xs text-slate-400">Email parent</div>
                    </div>
                    <div className="text-right">
                      {athlete.equipe && (
                        <div className="inline-block text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded">{athlete.equipe}</div>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button 
          onClick={handleSend}
          disabled={sending || selected.length === 0}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? 'Envoi en cours...' : `Envoyer à ${selected.length} destinataire(s)`}
        </button>
        <Link 
          href={`/bureau/surveys`}
          className="px-6 py-3 bg-slate-200 text-slate-700 rounded-lg font-semibold"
        >
          Annuler
        </Link>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm text-blue-900">
          <strong>ℹ️ Fonctionnement :</strong>
          <ul className="mt-2 space-y-1 list-disc list-inside">
            <li>Chaque destinataire recevra un lien unique par email</li>
            <li>Les réponses seront collectées automatiquement</li>
            <li>Vous pourrez consulter le reporting en temps réel</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
