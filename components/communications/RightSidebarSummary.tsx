"use client"

export default function RightSidebarSummary({
  type,
  title,
  questions,
  recipients,
  onSave,
  isSending
}: any) {

  return (
    <div className="bg-slate-900 p-6 rounded-2xl border border-white/10 space-y-6 h-fit">

      <h2 className="text-xl font-semibold">
        Résumé
      </h2>

      <div className="space-y-2 text-sm text-slate-300">
        <div>Type : {type}</div>
        <div>Titre : {title || "—"}</div>
        {type === "survey" && (
          <div>Questions : {questions.length}</div>
        )}
        <div>Destinataires : {recipients.length}</div>
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={isSending}
        className="w-full bg-violet-600 py-3 rounded-xl font-semibold hover:bg-violet-500 disabled:opacity-50"
      >
        {isSending ? "Envoi en cours..." : "Enregistrer / Envoyer"}
      </button>

    </div>
  )
}