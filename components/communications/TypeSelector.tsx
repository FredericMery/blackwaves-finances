export default function TypeSelector({ type, setType }: any) {
  const types = [
    { id: "email", label: "Email", desc: "Envoyer un email professionnel" },
    { id: "survey", label: "Sondage", desc: "Créer un sondage interactif" },
    { id: "information", label: "Information", desc: "Diffusion multi-canal" }
  ]

  return (
    <div className="grid grid-cols-3 gap-4">
      {types.map((t) => (
        <div
          key={t.id}
          onClick={() => setType(t.id)}
          className={`p-6 rounded-2xl cursor-pointer transition border 
            ${type === t.id
              ? "bg-violet-600 border-violet-400"
              : "bg-slate-900 border-white/10 hover:border-violet-500"
            }`}
        >
          <h3 className="text-lg font-semibold">{t.label}</h3>
          <p className="text-sm text-slate-300 mt-1">{t.desc}</p>
        </div>
      ))}
    </div>
  )
}