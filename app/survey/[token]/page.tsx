"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

export default function PublicSurveyPage() {
  const { token } = useParams()
  const [loading, setLoading] = useState(true)
  const [survey, setSurvey] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<number, any>>({})
  const [email, setEmail] = useState("")
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        const res = await fetch(`/api/public/survey?token=${token}`)
        const data = await res.json()

        if (data.ok) {
          setSurvey(data.survey)
          setQuestions(data.questions || [])
          setEmail(data.email || "")
        } else {
          setError(data.error || "Sondage introuvable")
        }
      } catch (e) {
        setError("Erreur de chargement")
      } finally {
        setLoading(false)
      }
    }

    fetchSurvey()
  }, [token])

  const updateAnswer = (questionId: number, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const handleSubmit = async () => {
    const required = questions.filter(q => q.required)
    for (const q of required) {
      if (!answers[q.id] || (Array.isArray(answers[q.id]) && answers[q.id].length === 0)) {
        return alert(`La question "${q.question_text}" est requise`)
      }
    }

    try {
      const res = await fetch('/api/public/survey/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, answers })
      })
      const data = await res.json()

      if (data.ok) {
        setCompleted(true)
      } else {
        alert('Erreur: ' + (data.error || ''))
      }
    } catch (e) {
      alert('Erreur serveur')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="text-center"><div className="text-4xl mb-3">📝</div><div>Chargement du sondage...</div></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="max-w-md p-8 bg-slate-900 rounded-lg border border-red-500/30">
          <div className="text-4xl mb-3 text-center">❌</div>
          <h2 className="text-xl font-bold text-center mb-2">Erreur</h2>
          <p className="text-center text-slate-300">{error}</p>
        </div>
      </div>
    )
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center">
        <div className="max-w-md p-8 bg-slate-900 rounded-lg border border-emerald-500/30">
          <div className="text-4xl mb-3 text-center">✅</div>
          <h2 className="text-xl font-bold text-center mb-2">Merci pour votre réponse !</h2>
          <p className="text-center text-slate-300">Vos réponses ont été enregistrées avec succès.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{survey?.title || 'Sondage'}</h1>
          {survey?.description && <p className="text-slate-300">{survey.description}</p>}
          {email && <div className="mt-3 text-sm text-slate-400">Envoyé à : {email}</div>}
        </div>

        <div className="space-y-6">
          {questions.map((q, idx) => (
            <div key={q.id} className="p-6 bg-slate-900 rounded-lg border border-slate-800">
              <div className="font-semibold mb-3">
                {idx + 1}. {q.question_text}
                {q.required && <span className="text-rose-400 ml-1">*</span>}
              </div>

              {q.type === 'short_text' && (
                <input type="text" value={answers[q.id] || ''} onChange={e => updateAnswer(q.id, e.target.value)} className="w-full p-3 bg-slate-800 border border-slate-700 rounded text-white" placeholder="Votre réponse..." />
              )}

              {q.type === 'long_text' && (
                <textarea value={answers[q.id] || ''} onChange={e => updateAnswer(q.id, e.target.value)} rows={4} className="w-full p-3 bg-slate-800 border border-slate-700 rounded text-white" placeholder="Votre réponse..." />
              )}

              {q.type === 'single_choice' && (
                <div className="space-y-2">
                  {(q.com_survey_options || []).map((opt: any) => (
                    <label key={opt.id} className="flex items-center gap-3 p-3 bg-slate-800 rounded cursor-pointer hover:bg-slate-750">
                      <input type="radio" name={`q_${q.id}`} value={String(opt.id)} checked={answers[q.id] === String(opt.id)} onChange={e => updateAnswer(q.id, e.target.value)} className="w-4 h-4" />
                      <span>{opt.option_text}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'multiple_choice' && (
                <div className="space-y-2">
                  {(q.com_survey_options || []).map((opt: any) => (
                    <label key={opt.id} className="flex items-center gap-3 p-3 bg-slate-800 rounded cursor-pointer hover:bg-slate-750">
                      <input type="checkbox" checked={(answers[q.id] || []).includes(opt.id)} onChange={e => { const current = answers[q.id] || []; updateAnswer(q.id, e.target.checked ? [...current, opt.id] : current.filter((v: number) => v !== opt.id)) }} className="w-4 h-4" />
                      <span>{opt.option_text}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type === 'dropdown' && (
                <select value={answers[q.id] || ''} onChange={e => updateAnswer(q.id, e.target.value)} className="w-full p-3 bg-slate-800 border border-slate-700 rounded text-white">
                  <option value="">-- Sélectionnez --</option>
                  {(q.com_survey_options || []).map((opt: any) => (<option key={opt.id} value={String(opt.id)}>{opt.option_text}</option>))}
                </select>
              )}

              {q.type === 'rating' && (
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (<button key={star} type="button" onClick={() => updateAnswer(q.id, star)} className={`text-3xl ${answers[q.id] >= star ? 'text-yellow-400' : 'text-slate-600'}`}>★</button>))}
                </div>
              )}

              {q.type === 'scale' && (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-400">{q.meta?.min ?? 1}</span>
                  <input type="range" min={q.meta?.min ?? 1} max={q.meta?.max ?? 5} value={answers[q.id] ?? q.meta?.min ?? 1} onChange={e => updateAnswer(q.id, Number(e.target.value))} className="flex-1" />
                  <span className="text-sm text-slate-400">{q.meta?.max ?? 5}</span>
                  <span className="font-bold text-lg">{answers[q.id] ?? q.meta?.min ?? 1}</span>
                </div>
              )}

              {q.type === 'date' && (<input type="date" value={answers[q.id] || ''} onChange={e => updateAnswer(q.id, e.target.value)} className="p-3 bg-slate-800 border border-slate-700 rounded text-white" />)}

              {q.type === 'time' && (<input type="time" value={answers[q.id] || ''} onChange={e => updateAnswer(q.id, e.target.value)} className="p-3 bg-slate-800 border border-slate-700 rounded text-white" />)}

              {q.type === 'yes_no' && (
                <div className="flex gap-3">
                  <button type="button" onClick={() => updateAnswer(q.id, true)} className={`px-6 py-3 rounded font-semibold ${answers[q.id] === true ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'}`}>Oui</button>
                  <button type="button" onClick={() => updateAnswer(q.id, false)} className={`px-6 py-3 rounded font-semibold ${answers[q.id] === false ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-300'}`}>Non</button>
                </div>
              )}

              {q.type === 'file' && (<div className="text-sm text-slate-400">Upload de fichier (fonctionnalité à implémenter)</div>)}
            </div>
          ))}
        </div>

        <div className="mt-8 flex gap-3">
          <button onClick={handleSubmit} className="px-8 py-4 bg-emerald-600 text-white rounded-lg font-bold text-lg hover:bg-emerald-700 transition">Envoyer mes réponses</button>
        </div>
      </div>
    </div>
  )
}