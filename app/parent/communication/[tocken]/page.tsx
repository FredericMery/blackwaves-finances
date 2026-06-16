"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

export default function ParentCommunication() {
  const { token } = useParams()
  const [data, setData] = useState<any>(null)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetch(`/api/parent/communication?token=${token}`)
      .then(res => res.json())
      .then(setData)
  }, [token])

  const submit = async (answers: any) => {
    await fetch("/api/parent/communication/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, answers })
    })
    setSubmitted(true)
  }

  if (!data) return <div className="p-8">Chargement...</div>
  if (submitted) return <div className="p-8">Merci pour votre réponse.</div>

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-3xl mx-auto space-y-6">

        <h1 className="text-2xl font-bold">{data.communication.title}</h1>

        {data.questions?.map((q: any) => (
          <div key={q.id}>
            <p className="font-semibold">{q.question_text}</p>
          </div>
        ))}

        <button
          onClick={() => submit([])}
          className="bg-black text-white px-6 py-3 rounded-lg"
        >
          Envoyer
        </button>

      </div>
    </div>
  )
}