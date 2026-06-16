"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

import { buildEmailFragment } from "../../../../lib/emailTemplate"

export default function CommunicationDetailPage() {
  const { id } = useParams()
  const router = useRouter()

  const [communication, setCommunication] = useState<any>(null)
  const [athletes, setAthletes] = useState<any[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [season, setSeason] = useState("")
  const [equipe, setEquipe] = useState("")
  const [loading, setLoading] = useState(true)
  const [seasons, setSeasons] = useState<string[]>([])
  const [equipes, setEquipes] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("")
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    fetch(`/api/bureau/communications/get?id=${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.ok) setCommunication(data.data)
        setLoading(false)
      })
  }, [id])

  useEffect(() => {
  fetch(`/api/bureau/athletes?season=${season}&equipe=${equipe}`)
    .then(res => res.json())
    .then(data => {
      if (data.ok) {
        setAthletes(data.data || [])
        setSeasons(data.meta?.seasons || [])
        setEquipes(data.meta?.equipes || [])
      }
    })
}, [season, equipe])


  const toggle = (aid: string) => {
    if (selected.includes(aid)) {
      setSelected(selected.filter(x => x !== aid))
    } else {
      setSelected([...selected, aid])
    }
  }

  const filteredAthletes = athletes.filter(a => {
  const matchesSearch =
    `${a.prenom} ${a.nom}`.toLowerCase().includes(search.toLowerCase())

  const matchesCategory =
    category ? a.categorie === category : true

  return matchesSearch && matchesCategory
})

  const selectAll = () => {
    setSelected(athletes.map(a => a.id))
  }

  const send = async () => {
    await fetch("/api/bureau/communications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        communication_id: id,
        recipients: selected
      })
    })
    alert("Envoi terminé")
    router.refresh()
  }

  if (loading) return <div className="p-8 text-white">Chargement...</div>
  if (!communication) return <div className="p-8 text-white">Introuvable</div>

 
return (
  <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-10">
    <div className="max-w-7xl mx-auto space-y-12">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {communication.title}
          </h1>
          <p className="text-white/60 mt-1">
            {communication.type.toUpperCase()}
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setShowPreview(true)}
            className="bg-slate-800 px-4 py-2 rounded-lg border border-white/10 hover:border-sky-400 transition"
          >
            👁 Preview
          </button>

          <Link
            href={`/bureau/communications/${id}/reporting`}
            className="bg-sky-600 px-4 py-2 rounded-lg hover:bg-sky-500 transition"
          >
            📊 Reporting
          </Link>
        </div>
      </div>

      {/* SEGMENTATION */}
      <div className="bg-slate-900 rounded-xl border border-white/10 p-6 space-y-6">

        <h2 className="text-xl font-semibold">Segmentation avancée</h2>

        <div className="grid grid-cols-4 gap-4">

          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className="p-3 bg-slate-800 rounded-lg focus:ring-2 focus:ring-sky-500"
          >
            <option value="">Toutes saisons</option>
            {seasons.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={equipe}
            onChange={(e) => setEquipe(e.target.value)}
            className="p-3 bg-slate-800 rounded-lg focus:ring-2 focus:ring-sky-500"
          >
            <option value="">Toutes équipes</option>
            {equipes.map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="p-3 bg-slate-800 rounded-lg focus:ring-2 focus:ring-sky-500"
          >
            <option value="">Toutes catégories</option>
            <option value="mini">Mini</option>
            <option value="junior">Junior</option>
            <option value="senior">Senior</option>
          </select>

          <input
            placeholder="Recherche nom..."
            onChange={(e) => setSearch(e.target.value)}
            className="p-3 bg-slate-800 rounded-lg focus:ring-2 focus:ring-sky-500"
          />

        </div>

      </div>

      {/* LISTE DESTINATAIRES */}
      <div className="bg-slate-900 rounded-xl border border-white/10 p-6 space-y-4">

        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            Destinataires ({selected.length})
          </h2>

          <div className="flex gap-4 text-sm">
            <button
              onClick={selectAll}
              className="text-sky-400 hover:text-sky-300 transition"
            >
              Tout sélectionner
            </button>
            <button
              onClick={() => setSelected([])}
              className="text-rose-400 hover:text-rose-300 transition"
            >
              Tout désélectionner
            </button>
          </div>
        </div>

        <div className="max-h-[500px] overflow-y-auto space-y-3">

          {filteredAthletes.map(a => {

            const recipients = Array.isArray(communication?.com_recipients)
  ? communication.com_recipients
  : []

const alreadySent = recipients.some(
  (r: any) => r.athlete_id === a.id
)

            const missingEmail = !a.email_parent

            return (
              <div
                key={a.id}
                className="group flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-white/5 hover:border-sky-400/50 hover:scale-[1.01] transition-all duration-200"
              >
                <div className="flex items-center gap-4">

                  <input
                    type="checkbox"
                    checked={selected.includes(a.id)}
                    onChange={() => toggle(a.id)}
                    className="h-4 w-4 accent-emerald-500"
                  />

                  <div>
                    <p className="font-semibold">
                      {a.prenom} {a.nom}
                    </p>
                    <p className="text-sm text-white/60">
                      {a.equipe}
                    </p>
                  </div>

                </div>

                <div className="flex items-center gap-3">

                  {missingEmail && (
                    <span className="bg-rose-500/20 text-rose-300 text-xs px-2 py-1 rounded-full">
                      Email manquant
                    </span>
                  )}

                  {alreadySent && (
                    <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-1 rounded-full">
                      Déjà envoyé
                    </span>
                  )}

                  <span className="text-sky-400 text-sm">
                    {a.email_parent}
                  </span>

                </div>
              </div>
            )
          })}

        </div>

        <div className="pt-6 border-t border-white/10 flex justify-end">
          <button
            onClick={send}
            disabled={selected.length === 0}
            className="bg-emerald-600 px-8 py-3 rounded-lg font-semibold hover:bg-emerald-500 disabled:opacity-40 transition"
          >
            🚀 Envoyer ({selected.length})
          </button>
        </div>

      </div>

      {/* PREVIEW MODAL */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-900 w-[700px] rounded-xl p-8 border border-white/10 space-y-4">

            <h2 className="text-xl font-semibold">
              Aperçu email
            </h2>

                  <div className="bg-white text-black p-6 rounded-lg">
                    <h3 className="text-lg font-bold mb-4">{communication.title}</h3>
                    <div dangerouslySetInnerHTML={{ __html: buildEmailFragment({
                      subject: communication.subject,
                      title: communication.title,
                      contentHtml: communication.content_html || communication.content || communication.message || communication.message_md,
                      ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL || '#'}?preview=true`,
                      ctaText: 'Accéder',
                      date: communication.sent_at || new Date().toLocaleString()
                    }) }} />
                  </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowPreview(false)}
                className="bg-slate-700 px-4 py-2 rounded-lg"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  </div>
)


}