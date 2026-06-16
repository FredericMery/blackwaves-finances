"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

function SurveyForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [survey, setSurvey] = useState<any>(null)
  const [answers, setAnswers] = useState<any>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError("Lien invalide.")
      setLoading(false)
      return
    }

    fetch(`/api/parent/survey?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data?.survey) {
          setSurvey(data.survey)
        } else {
          setError("Sondage introuvable ou expiré.")
        }
      })
      .catch(() => setError("Erreur serveur."))
      .finally(() => setLoading(false))
  }, [token])

  const handleSubmit = async () => {
    const formatted = Object.entries(answers).map(([question_id, value]: any) => ({
      question_id,
      ...value
    }))

    await fetch("/api/parent/survey/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, answers: formatted })
    })

    setSubmitted(true)
  }

  if (loading) return <div className="p-8">Chargement...</div>

  if (error) return <div className="p-8 text-red-500">{error}</div>

  if (submitted)
    return <div className="p-8 text-center">Merci pour votre réponse 🙏</div>

  if (!survey)
    return <div className="p-8">Sondage indisponible.</div>

  return (
    <div className="max-w-3xl mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-bold mb-6">{survey.title}</h1>

      {survey.com_survey_questions?.map((q: any) => (
        <div key={q.id} className="bg-white p-6 rounded-xl shadow">
          <p className="font-semibold mb-4">{q.question_text}</p>

          {q.type === "short_text" && (
            <input
              className="border p-2 w-full"
              onChange={e =>
                setAnswers({ ...answers, [q.id]: { value_text: e.target.value } })
              }
            />
          )}

          {q.type === "yes_no" && (
            <div className="space-x-4">
              <button
                onClick={() =>
                  setAnswers({ ...answers, [q.id]: { value_bool: true } })
                }
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                Oui
              </button>
              <button
                onClick={() =>
                  setAnswers({ ...answers, [q.id]: { value_bool: false } })
                }
                className="px-4 py-2 bg-red-600 text-white rounded"
              >
                Non
              </button>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={handleSubmit}
        className="bg-black text-white px-6 py-3 rounded-lg"
      >
        Envoyer
      </button>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <SurveyForm />
    </Suspense>
  )
}