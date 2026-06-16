"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function RecipientSelector({ recipients, setRecipients }: any) {

  const [athletes, setAthletes] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [selectedTeam, setSelectedTeam] = useState("all")
  const [selectedSeason, setSelectedSeason] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")

  // 🔹 Chargement
  useEffect(() => {
    const fetchAthletes = async () => {
      const { data } = await supabase
        .from("athletes")
        .select("id, prenom, nom, equipe, email_parent, saison, trial_id")
        .order("nom", { ascending: true })

      if (data) setAthletes(data)
    }

    fetchAthletes()
  }, [])

  // 🔹 Données uniques
  const teams = [...new Set(athletes.map(a => a.equipe))].filter(Boolean)
  const seasons = [...new Set(athletes.map(a => a.saison))].filter(Boolean)

  // 🔹 Filtrage
  const filteredAthletes = useMemo(() => {
    return athletes.filter(a => {

      const matchSearch =
        `${a.prenom} ${a.nom}`.toLowerCase().includes(search.toLowerCase())

      const matchTeam =
        selectedTeam === "all" || a.equipe === selectedTeam

      const matchSeason =
        selectedSeason === "all" || a.saison === selectedSeason

      const status = a.trial_id ? "essai" : "inscrit"
      const matchStatus =
        selectedStatus === "all" || status === selectedStatus

      return matchSearch && matchTeam && matchSeason && matchStatus
    })
  }, [athletes, search, selectedTeam, selectedSeason, selectedStatus])

  // 🔹 Toggle individuel
  const toggleRecipient = (email: string) => {
    if (recipients.includes(email)) {
      setRecipients(recipients.filter((r: string) => r !== email))
    } else {
      setRecipients([...recipients, email])
    }
  }

  // 🔹 Sélection globale
  const selectAll = () => {
    const emails = filteredAthletes.map(a => a.email_parent)
    setRecipients(Array.from(new Set([...recipients, ...emails])))
  }

  const deselectAll = () => {
    const emails = filteredAthletes.map(a => a.email_parent)
    setRecipients(recipients.filter((r: string) => !emails.includes(r)))
  }

  return (
    <div className="space-y-6">

      <h2 className="text-xl font-semibold">Destinataires</h2>

      {/* 🔎 Recherche */}
      <input
        type="text"
        placeholder="Rechercher un nom..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-2 bg-slate-800 rounded"
      />

      {/* 🎯 Filtres */}
      <div className="flex flex-wrap gap-3">

        {/* Équipe */}
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          className="bg-slate-800 p-2 rounded"
        >
          <option value="all">Toutes équipes</option>
          {teams.map(team => (
            <option key={team} value={team}>{team}</option>
          ))}
        </select>

        {/* Saison */}
        <select
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(e.target.value)}
          className="bg-slate-800 p-2 rounded"
        >
          <option value="all">Toutes saisons</option>
          {seasons.map(season => (
            <option key={season} value={season}>{season}</option>
          ))}
        </select>

        {/* Statut */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-slate-800 p-2 rounded"
        >
          <option value="all">Tous statuts</option>
          <option value="inscrit">Inscrit</option>
          <option value="essai">Essai</option>
        </select>

      </div>

      {/* 🔥 Boutons globaux */}
      <div className="flex gap-3">
        <button
          onClick={selectAll}
          className="bg-emerald-600 px-3 py-1 rounded text-sm"
        >
          Tout sélectionner
        </button>

        <button
          onClick={deselectAll}
          className="bg-red-600 px-3 py-1 rounded text-sm"
        >
          Tout désélectionner
        </button>
      </div>

      {/* 📋 Liste */}
      <div className="max-h-96 overflow-y-auto bg-slate-800 p-4 rounded-xl space-y-2">

        {filteredAthletes.map(a => {

          const isSelected = recipients.includes(a.email_parent)
          const status = a.trial_id ? "Essai" : "Inscrit"

          return (
            <div
              key={a.id}
              className={`flex justify-between items-start p-2 rounded transition ${
                isSelected ? "bg-violet-700/40 border border-violet-500" : "hover:bg-slate-700"
              }`}
            >

              <div className="flex flex-col text-sm">
                <span className="font-medium">
                  {a.prenom} {a.nom}
                </span>

                <span className="text-slate-400 text-xs">
                  {a.equipe} • {a.saison}
                </span>

                <span className="text-slate-500 text-xs">
                  {a.email_parent}
                </span>

                <span className={`text-xs mt-1 ${
                  status === "Essai" ? "text-orange-400" : "text-emerald-400"
                }`}>
                  {status}
                </span>
              </div>

              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleRecipient(a.email_parent)}
              />
            </div>
          )
        })}

      </div>

      <div className="text-sm text-slate-400">
        {recipients.length} destinataires sélectionnés
      </div>

    </div>
  )
}