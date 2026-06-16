"use client"

import { useState } from "react"

type Option = { id: string; option_text: string }
type Question = {
  id: string
  question_text: string
  type: string
  required?: boolean
  options?: Option[]
  meta?: any
}

const QUESTION_TYPES: { value: string; label: string }[] = [
  { value: "short_text", label: "Texte court" },
  { value: "long_text", label: "Paragraphe" },
  { value: "single_choice", label: "Choix unique (radio)" },
  { value: "multiple_choice", label: "Choix multiples (checkbox)" },
  { value: "dropdown", label: "Liste déroulante" },
  { value: "rating", label: "Évaluation (étoiles)" },
  { value: "scale", label: "Échelle numérique" },
  { value: "date", label: "Date" },
  { value: "time", label: "Heure" },
  { value: "yes_no", label: "Oui / Non" },
  { value: "file", label: "Fichier (upload)" },
]

function uid(prefix = "q") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`
}

function NewQuestion(type = "short_text"): Question {
  return {
    id: uid("q"),
    question_text: "",
    type,
    required: false,
    options: [],
    meta: {},
  }
}

export default function Page() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [questions, setQuestions] = useState<Question[]>([NewQuestion()])
  const [saving, setSaving] = useState(false)

  const addQuestion = (type = "short_text") => setQuestions([...questions, NewQuestion(type)])

  const updateQuestion = (id: string, patch: Partial<Question>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  }

  const removeQuestion = (id: string) => setQuestions((prev) => prev.filter((q) => q.id !== id))

  const moveQuestion = (id: string, dir: number) => {
    setQuestions((prev) => {
      const idx = prev.findIndex((p) => p.id === id)
      if (idx === -1) return prev
      const copy = [...prev]
      const to = idx + dir
      if (to < 0 || to >= copy.length) return copy
      const [item] = copy.splice(idx, 1)
      copy.splice(to, 0, item)
      return copy
    })
  }

  const addOption = (qid: string) => {
    updateQuestion(qid, { options: [...(questions.find((q) => q.id === qid)?.options || []), { id: uid("o"), option_text: "Nouvelle option" }] })
  }

  const updateOption = (qid: string, oid: string, text: string) => {
    setQuestions((prev) => prev.map((q) => {
      if (q.id !== qid) return q
      return { ...q, options: (q.options || []).map(o => o.id === oid ? { ...o, option_text: text } : o) }
    }))
  }

  const removeOption = (qid: string, oid: string) => {
    setQuestions((prev) => prev.map((q) => q.id === qid ? { ...q, options: (q.options || []).filter(o => o.id !== oid) } : q))
  }

  const validate = () => {
    if (!title.trim()) return "Titre requis"
    for (const q of questions) {
      if (!q.question_text.trim()) return "Toutes les questions doivent avoir un texte"
      if (["single_choice", "multiple_choice", "dropdown"].includes(q.type) && (!q.options || q.options.length < 1)) return "Les questions à choix doivent contenir au moins une option"
    }
    return null
  }

  const handleSave = async () => {
    const err = validate()
    if (err) return alert(err)
    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        questions: questions.map((q, idx) => ({ question_text: q.question_text, type: q.type, required: !!q.required, options: q.options?.map(o => ({ option_text: o.option_text })) || [], ordre: idx + 1, meta: q.meta }))
      }

      const res = await fetch('/api/bureau/surveys/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      if (data.ok) {
        window.location.href = `/bureau/surveys/${data.survey.id}/send`
      } else {
        alert('Erreur: ' + (data.error || ''))
      }
    } catch (e) {
      alert('Erreur serveur')
    } finally { setSaving(false) }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">Créer un sondage professionnel</h1>
          <p className="text-sm text-slate-400 mb-6">Choisis les types de questions, ajoute des options, réordonne et prévisualise.</p>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Titre du sondage</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 border rounded bg-slate-900 text-white" placeholder="Ex: Sondage parents - Saison 2026" />
            <label className="block text-sm font-medium mt-3 mb-1">Description (optionnel)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-3 border rounded bg-slate-900 text-white" rows={2} />
          </div>

          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={q.id} className="p-4 border rounded bg-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <input value={q.question_text} onChange={e => updateQuestion(q.id, { question_text: e.target.value })} placeholder={`Question ${i + 1}`} className="w-full p-2 border rounded bg-slate-800 text-white mb-2" />
                    <div className="flex gap-2 items-center">
                      <select value={q.type} onChange={e => updateQuestion(q.id, { type: e.target.value, options: e.target.value.includes('choice') || e.target.value === 'dropdown' ? (q.options && q.options.length ? q.options : [{ id: uid('o'), option_text: 'Option 1' }]) : [] })} className="p-2 bg-slate-800 border rounded text-white">
                        {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                      <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input type="checkbox" checked={!!q.required} onChange={e => updateQuestion(q.id, { required: e.target.checked })} /> Requis
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                      <button onClick={() => moveQuestion(q.id, -1)} className="px-2 py-1 bg-slate-800 rounded">▲</button>
                      <button onClick={() => moveQuestion(q.id, 1)} className="px-2 py-1 bg-slate-800 rounded">▼</button>
                    </div>
                    <button onClick={() => removeQuestion(q.id)} className="px-3 py-1 bg-rose-600 rounded text-white">Supprimer</button>
                  </div>
                </div>

                {/* Options editor for choice/dropdown */}
                {['single_choice', 'multiple_choice', 'dropdown'].includes(q.type) && (
                  <div className="mt-3">
                    <div className="text-sm text-slate-300 mb-2">Options</div>
                    <div className="space-y-2">
                      {(q.options || []).map(o => (
                        <div key={o.id} className="flex gap-2">
                          <input value={o.option_text} onChange={e => updateOption(q.id, o.id, e.target.value)} className="flex-1 p-2 border rounded bg-slate-800 text-white" />
                          <button onClick={() => removeOption(q.id, o.id)} className="px-3 py-1 bg-rose-600 rounded text-white">X</button>
                        </div>
                      ))}
                      <div>
                        <button onClick={() => addOption(q.id)} className="px-3 py-1 bg-sky-600 rounded text-white">+ Ajouter une option</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Type-specific meta (rating/scale) */}
                {q.type === 'rating' && (
                  <div className="mt-3 text-sm text-slate-300">Étoiles: 1 à 5 (par défaut)</div>
                )}
                {q.type === 'scale' && (
                  <div className="mt-3 flex gap-2 items-center text-sm text-slate-300">
                    <label>Min</label>
                    <input type="number" value={q.meta?.min ?? 1} onChange={e => updateQuestion(q.id, { meta: { ...(q.meta||{}), min: Number(e.target.value) } })} className="w-20 p-1 rounded bg-slate-800" />
                    <label>Max</label>
                    <input type="number" value={q.meta?.max ?? 5} onChange={e => updateQuestion(q.id, { meta: { ...(q.meta||{}), max: Number(e.target.value) } })} className="w-20 p-1 rounded bg-slate-800" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2 items-center">
            <label className="text-sm text-slate-300">Ajouter une question :</label>
            <div className="flex gap-2 flex-wrap">
              {QUESTION_TYPES.slice(0, 6).map(t => (
                <button key={t.value} onClick={() => addQuestion(t.value)} className="px-3 py-1 bg-slate-800 rounded text-white">{t.label}</button>
              ))}
              <button onClick={() => addQuestion('single_choice')} className="px-3 py-1 bg-sky-600 rounded text-white">+ Autres types</button>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={handleSave} disabled={saving} className="px-6 py-3 bg-emerald-600 text-white rounded font-semibold">
              {saving ? 'Enregistrement...' : 'Créer le sondage'}
            </button>
            <button onClick={() => { setTitle(''); setDescription(''); setQuestions([NewQuestion()]) }} className="px-6 py-3 bg-slate-700 text-white rounded">Réinitialiser</button>
          </div>
        </div>

        <aside className="w-96 sticky top-24">
          <div className="p-4 border rounded bg-slate-900">
            <h3 className="font-semibold text-lg mb-2">Aperçu</h3>
            <div className="mb-3 text-sm text-slate-400">Titre</div>
            <div className="mb-4 text-white font-bold text-lg">{title || 'Titre du sondage (aperçu)'}</div>
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div key={q.id} className="p-3 bg-slate-800 rounded">
                  <div className="text-sm font-semibold text-white">{idx + 1}. {q.question_text || 'Question...' } {q.required ? <span className="text-rose-400">*</span> : null}</div>
                  <div className="mt-2 text-sm text-slate-300">
                    {q.type === 'short_text' && <input className="w-full p-2 rounded bg-slate-700" placeholder="Réponse courte" />}
                    {q.type === 'long_text' && <textarea className="w-full p-2 rounded bg-slate-700" rows={3} placeholder="Réponse" />}
                    {q.type === 'single_choice' && (q.options || []).map(o => <div key={o.id} className="flex items-center gap-2"><input type="radio" name={q.id} /> <span className="text-sm">{o.option_text}</span></div>)}
                    {q.type === 'multiple_choice' && (q.options || []).map(o => <div key={o.id} className="flex items-center gap-2"><input type="checkbox" /> <span className="text-sm">{o.option_text}</span></div>)}
                    {q.type === 'dropdown' && <select className="w-full p-2 rounded bg-slate-700">{(q.options||[]).map(o => <option key={o.id}>{o.option_text}</option>)}</select>}
                    {q.type === 'rating' && <div className="text-yellow-300">★★★★★</div>}
                    {q.type === 'scale' && <div className="text-sm">{q.meta?.min ?? 1} — {q.meta?.max ?? 5}</div>}
                    {q.type === 'date' && <input type="date" className="p-2 rounded bg-slate-700" />}
                    {q.type === 'time' && <input type="time" className="p-2 rounded bg-slate-700" />}
                    {q.type === 'yes_no' && <div className="flex gap-2"><button className="px-2 py-1 rounded bg-slate-700">Oui</button><button className="px-2 py-1 rounded bg-slate-700">Non</button></div>}
                    {q.type === 'file' && <input type="file" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
