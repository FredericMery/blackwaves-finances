"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"

export default function BureauNavButton() {
  const pathname = usePathname()
  const [isBureau, setIsBureau] = useState(false)

  useEffect(() => {
    let mounted = true
    async function check() {
      try {
        const { data } = await supabase.auth.getUser()
        const user = data?.user
        if (!user) {
          if (mounted) setIsBureau(false)
          return
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()

        if (mounted) setIsBureau(profile?.role === "bureau")
      } catch (e) {
        if (mounted) setIsBureau(false)
      }
    }

    check()
    return () => { mounted = false }
  }, [])

  if (!pathname?.startsWith("/bureau")) return null
  if (!isBureau) return null

  return (
    <div className="ml-2">
      <Link
        href="/bureau"
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-sky-600/10 px-2 py-0.5 text-xs font-semibold text-white hover:bg-sky-600/20"
      >
        ← Accueil bureau
      </Link>
    </div>
  )
}
