"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import TypeSelector from "@/components/communications/TypeSelector"
import EmailBuilder from "@/components/communications/EmailBuilder"
import SurveyBuilder from "@/components/communications/SurveyBuilder"
import InformationBuilder from "@/components/communications/InformationBuilder"
import RecipientSelector from "@/components/communications/RecipientSelector"
import RightSidebarSummary from "@/components/communications/RightSidebarSummary"

export default function CreateCommunicationV2() {
  const router = useRouter()

  const [type, setType] = useState<"email" | "survey" | "information">("information")
  const [title, setTitle] = useState("")
  const [subject, setSubject] = useState("")
  const [content, setContent] = useState("")
  const [questions, setQuestions] = useState<any[]>([])
  const [recipients, setRecipients] = useState<any[]>([])
  const [attachments, setAttachments] = useState<File[]>([])
  const [isSending, setIsSending] = useState(false)
  const [saison, setSaison] = useState("2025-2026") // valeur par défaut temporaire

  const save = async () => {
  try {
    setIsSending(true)

    console.log("Envoi payload :", {
      type,
      title,
      subject,
      content,
      questions,
      recipients
    })

    const res = await fetch("/api/bureau/communications/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        saison,
        title,
        subject,
        content,
        questions,
        recipients
      })
    })

    console.log("Status API :", res.status)

    const data = await res.json()

    console.log("Réponse API :", data)

    if (!res.ok || !data.ok) {
  console.error("Erreur backend :", data)
  alert("Erreur backend : " + (data.error || "Erreur inconnue"))
  return
}

    // If backend returned created survey/questions, map DB ids back to local questions/options
    if (data.survey && Array.isArray(data.survey.questions)) {
      const serverQs = data.survey.questions
      const updated = questions.map((q) => ({ ...q }))

      for (const sq of serverQs) {
        const clientId = sq.client_id || sq.client_id
        if (!clientId) continue
        const idx = updated.findIndex((q) => q.id === clientId)
        if (idx === -1) continue

        updated[idx] = { ...updated[idx], db_id: sq.id }

        // map options by client_id if present
        if (Array.isArray(sq.options) && updated[idx].options) {
          const localOpts = updated[idx].options.map((opt: any) => (typeof opt === "string" ? { option_text: opt } : { ...opt }))
          const mapped = localOpts.map((opt: any) => {
            const clientOptId = opt.client_id
            const match = (sq.options || []).find((so: any) => so.client_id && clientOptId && so.client_id === clientOptId)
            return match ? { ...opt, db_id: match.id } : opt
          })
          updated[idx].options = mapped
        }
      }

      setQuestions(updated)
    }

    router.push(`/bureau/communications/${data.data.id}`)

  } catch (err) {
    console.error("Erreur save:", err)
    alert("Erreur inattendue")
  } finally {
    setIsSending(false)
  }
}

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-3 gap-8">

        <div className="col-span-2 space-y-8">

          <div>
            <h1 className="text-4xl font-bold mb-2">
              Nouvelle communication
            </h1>
            <p className="text-slate-400">
              Créez un message professionnel, un sondage ou une information multi-canal.
            </p>
          </div>

          <div>
              <label className="block text-sm text-slate-400 mb-2">
                Saison
              </label>

              <select
                value={saison}
                onChange={(e) => setSaison(e.target.value)}
                className="w-full p-3 bg-slate-800 rounded-xl"
              >
                <option value="2024-2025">2024-2025</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2026-2027">2026-2027</option>
              </select>
            </div>

          <TypeSelector type={type} setType={setType} />

          <div className="bg-slate-900 p-6 rounded-2xl border border-white/10 space-y-6">

            <input
              placeholder="Titre interne"
              className="w-full p-3 bg-slate-800 rounded-xl"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            {type === "email" && (
              <EmailBuilder
                subject={subject}
                setSubject={setSubject}
                content={content}
                setContent={setContent}
                attachments={attachments}
                setAttachments={setAttachments}
              />
            )}

            {type === "survey" && (
              <SurveyBuilder
                questions={questions}
                setQuestions={setQuestions}
              />
            )}

            {type === "information" && (
              <InformationBuilder
                content={content}
                setContent={setContent}
              />
            )}

            <RecipientSelector
              recipients={recipients}
              setRecipients={setRecipients}
            />

          </div>
        </div>

        <RightSidebarSummary
          type={type}
          title={title}
          questions={questions}
          recipients={recipients}
          onSave={save}
          isSending={isSending}
        />

      </div>
    </div>
  )
}