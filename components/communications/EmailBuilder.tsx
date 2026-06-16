"use client"

import { useRef } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function EmailBuilder({
  subject,
  setSubject,
  content,
  setContent,
  attachments,
  setAttachments
}: any) {

  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadFile = async (file: File) => {
    const filePath = `communications/${Date.now()}_${file.name}`

    const { error } = await supabase.storage
      .from("communications")
      .upload(filePath, file)

    if (error) {
      console.error(error)
      return null
    }

    return filePath
  }

  const handleFileChange = async (e: any) => {
    const file = e.target.files[0]
    if (!file) return

    const path = await uploadFile(file)
    if (path) {
      setAttachments([...attachments, path])
    }
  }

  return (
    <div className="space-y-6">

      <div>
        <label className="block text-sm mb-1">Sujet</label>
        <input
          className="w-full p-3 bg-slate-800 rounded-xl"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm mb-1">Contenu (HTML)</label>
        <textarea
          rows={8}
          className="w-full p-3 bg-slate-800 rounded-xl"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm mb-2">Pièces jointes</label>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="bg-sky-600 px-4 py-2 rounded-xl"
        >
          Ajouter un fichier
        </button>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="mt-3 space-y-2">
          {attachments.map((file: string, i: number) => (
            <div key={i} className="text-sm text-slate-300">
              📎 {file}
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}