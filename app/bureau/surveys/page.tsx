"use client"

import Link from "next/link"

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white/90 backdrop-blur p-8 shadow-sm">
          <div className="inline-flex items-center rounded-full bg-sky-50 text-sky-700 border border-sky-200 px-3 py-1 text-xs font-semibold mb-4">
            Espace Bureau
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">Gérer les sondages</h1>
          <p className="mt-3 text-slate-600 max-w-3xl">
            Créez, suivez et analysez vos sondages depuis une interface centralisée. Tous les modules sont accessibles ci-dessous.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col">
            <div className="text-2xl mb-3">📝</div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Créer un sondage</h2>
            <p className="text-sm text-slate-600 mb-6 flex-1">Créez un nouveau sondage indépendant des communications.</p>
            <Link
              href="/bureau/surveys/create"
              className="inline-flex w-full justify-center items-center px-4 py-2.5 rounded-lg bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 transition"
            >
              Créer
            </Link>
          </div>

          <div className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col">
            <div className="text-2xl mb-3">📋</div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Modifier / lister</h2>
            <p className="text-sm text-slate-600 mb-6 flex-1">Consultez la liste des sondages existants et modifiez-les facilement.</p>
            <Link
              href="/bureau/surveys/reporting"
              className="inline-flex w-full justify-center items-center px-4 py-2.5 rounded-lg bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 transition"
            >
              Ouvrir la liste
            </Link>
          </div>

          <div className="group rounded-2xl border border-rose-100 bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col">
            <div className="text-2xl mb-3">📊</div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Reporting</h2>
            <p className="text-sm text-slate-600 mb-6 flex-1">Visualisez les résultats, statistiques par question et répondants.</p>
            <Link
              href="/bureau/surveys/reporting"
              className="inline-flex w-full justify-center items-center px-4 py-2.5 rounded-lg bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 transition"
            >
              Voir le reporting
            </Link>
          </div>

          <div className="group rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col">
            <div className="text-2xl mb-3">🚀</div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Suivi des envois</h2>
            <p className="text-sm text-slate-600 mb-6 flex-1">Suivez les envois, ouvertures, réponses et relancez les non-répondants.</p>
            <Link
              href="/bureau/surveys/suivi"
              className="inline-flex w-full justify-center items-center px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition"
            >
              Ouvrir le suivi
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
