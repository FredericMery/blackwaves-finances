"use client"

import React, { useEffect, useState } from "react"

type OptionObj = { option_text: string; client_id: string }
type Q = {
  id: string
  question_text: string
  type: string
  required?: boolean
  options?: Array<string | OptionObj>
}

export default function SurveyBuilder({ questions, setQuestions }: any) {
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (initialized) return
    const needsNormalize = (questions || []).some((q: any) => {
      return (
        !q.id ||
        (Array.isArray(q.options) && q.options.some((o: any) => typeof o === "string" || !o?.client_id))
      )
    })

    if (!needsNormalize) {
      setInitialized(true)
      return
    }

    const normalized = (questions || []).map((q: any) => ({
      id: q.id || crypto.randomUUID(),
      question_text: q.question_text || "",
      type: q.type || "single_choice",
      required: !!q.required,
      options: (q.options || []).map((o: any) =>
        typeof o === "string"
          ? { option_text: o, client_id: crypto.randomUUID() }
          : { option_text: o.option_text || o.text || "", client_id: o.client_id || crypto.randomUUID() }
      ),
    }))

    setQuestions(normalized)
    setInitialized(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: crypto.randomUUID(),
        question_text: "",
        type: "single_choice",
        required: false,
        options: [],
      },
    ])
  }

  const updateQuestion = (index: number, key: string, value: any) => {
    const copy = [...questions]
    copy[index][key] = value
    setQuestions(copy)
  }

  const addOption = (qIndex: number) => {
    const copy = [...questions]
    if (!copy[qIndex].options) copy[qIndex].options = []
    copy[qIndex].options.push({ option_text: "", client_id: crypto.randomUUID() })
    setQuestions(copy)
  }

  const updateOption = (qIndex: number, optIndex: number, text: string) => {
    const copy = [...questions]
    const opt = copy[qIndex].options[optIndex]
    copy[qIndex].options[optIndex] = typeof opt === "string" ? text : { ...(opt as OptionObj), option_text: text }
    setQuestions(copy)
  }

  const removeOption = (qIndex: number, optIndex: number) => {
    const copy = [...questions]
    copy[qIndex].options.splice(optIndex, 1)
    setQuestions(copy)
  }

  const moveOption = (qIndex: number, optIndex: number, dir: number) => {
    const copy = [...questions]
    const arr = copy[qIndex].options || []
    const to = optIndex + dir
    if (to < 0 || to >= arr.length) return
    const [item] = arr.splice(optIndex, 1)
    arr.splice(to, 0, item)
    copy[qIndex].options = arr
    setQuestions(copy)
  }

  return (
    <div className="space-y-6">

      <h2 className="text-xl font-semibold">Questions</h2>

      {questions.map((q: Q, i: number) => (
        <div key={q.id} className="bg-slate-800 p-4 rounded-xl space-y-4 shadow-sm border border-white/6">

          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-200">Question {i + 1}</div>
            <div className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-200">{q.type}</div>
          </div>

          <input
            placeholder="Texte de la question"
            className="w-full p-2 bg-slate-700 rounded text-sm"
            value={q.question_text}
            onChange={(e) => updateQuestion(i, "question_text", e.target.value)}
          />

          <select
            className="p-2 bg-slate-700 rounded w-full"
            value={q.type}
            onChange={(e) => {
              const newType = e.target.value
              const copy = [...questions]
              copy[i].type = newType

              const optionTypes = ["single_choice", "multi_choice", "yes_no", "ranking", "matrix"]
              if (optionTypes.includes(newType)) {
                if (!copy[i].options || copy[i].options.length === 0) {
                  copy[i].options = [
                    { option_text: "Option 1", client_id: crypto.randomUUID() },
                    { option_text: "Option 2", client_id: crypto.randomUUID() },
                  ]
                }
              } else {
                copy[i].options = []
              }

              setQuestions(copy)
            }}
          >
            <option value="single_choice">Choix unique</option>
            <option value="multi_choice">Choix multiple</option>
            <option value="yes_no">Oui / Non</option>
            <option value="rating_1_5">Note 1-5</option>
            <option value="rating_1_10">Note 1-10</option>
            <option value="short_text">Texte court</option>
            <option value="long_text">Texte long</option>
            <option value="number">Nombre</option>
            <option value="date">Date</option>
            <option value="ranking">Classement</option>
            <option value="matrix">Matrice</option>
          </select>

          {["single_choice", "multi_choice", "yes_no", "ranking", "matrix"].includes(q.type) && (
            <div className="space-y-3">

              <div className="text-sm text-slate-300">Options configurables</div>

              {q.options?.map((option: any, optIndex: number) => {
                const optObj = typeof option === "string" ? { option_text: option, client_id: crypto.randomUUID() } : option
                return (
                  <div key={optObj.client_id || optIndex} className="flex gap-2 items-center">

                    <input
                      className="flex-1 p-2 bg-slate-700 rounded text-sm"
                      value={optObj.option_text}
                      placeholder={`Option ${optIndex + 1}`}
                      onChange={(e) => updateOption(i, optIndex, e.target.value)}
                    />

                    <div className="flex gap-1">
                      <button type="button" onClick={() => moveOption(i, optIndex, -1)} className="px-2 py-1 bg-slate-700 rounded text-xs">↑</button>
                      <button type="button" onClick={() => moveOption(i, optIndex, 1)} className="px-2 py-1 bg-slate-700 rounded text-xs">↓</button>
                      <button
                        type="button"
                        onClick={() => removeOption(i, optIndex)}
                        className="text-red-400 text-sm"
                        aria-label={`Supprimer option ${optIndex + 1}`}
                      >
                        ✕
                      </button>
                    </div>

                  </div>
                )
              })}

              <button type="button" onClick={() => addOption(i)} className="bg-sky-600 px-3 py-1 rounded text-sm">+ Ajouter une option</button>

            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!q.required} onChange={(e) => updateQuestion(i, "required", e.target.checked)} />
            Question obligatoire
          </label>

        </div>
      ))}

      <button onClick={addQuestion} className="bg-sky-600 px-4 py-2 rounded-xl">+ Ajouter question</button>

    </div>
  )
}
