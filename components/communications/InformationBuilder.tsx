"use client"

export default function InformationBuilder({
  content,
  setContent
}: any) {

  return (
    <div className="space-y-6">

      <div>
        <label className="block text-sm mb-2">
          Contenu de l'information
        </label>

        <textarea
          rows={8}
          className="w-full p-3 bg-slate-800 rounded-xl"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Rédigez votre information..."
        />
      </div>

      <div className="bg-slate-800 p-4 rounded-xl space-y-3">
        <h3 className="font-semibold">Canaux de diffusion</h3>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" defaultChecked />
          Email
        </label>

        <label className="flex items-center gap-2 text-sm opacity-50">
          <input type="checkbox" disabled />
          WhatsApp (à venir)
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" defaultChecked />
          Popup sur le site
        </label>
      </div>

    </div>
  )
}