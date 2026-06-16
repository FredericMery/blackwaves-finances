import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

type AppRole = "parent" | "coach" | "bureau"

const ALLOWED_ROLES: AppRole[] = ["parent", "coach", "bureau"]

function isValidRole(role: string): role is AppRole {
  return ALLOWED_ROLES.includes(role as AppRole)
}

export async function GET() {
  try {
    const supabase = supabaseAdmin()

    const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 500,
    })

    if (authError) throw authError

    const authUsers = authData?.users || []
    const ids = authUsers.map((u) => u.id)

    let profiles: any[] = []
    if (ids.length > 0) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, role, full_name")
        .in("id", ids)

      if (error) throw error
      profiles = data || []
    }

    const profileById = new Map(profiles.map((p) => [p.id, p]))

    const users = authUsers.map((u) => {
      const p = profileById.get(u.id)
      const role = (p?.role || (u.user_metadata?.role as string) || "parent").toLowerCase()

      return {
        id: u.id,
        email: u.email || "",
        full_name: p?.full_name || u.user_metadata?.full_name || "",
        role: isValidRole(role) ? role : "parent",
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        disabled: !!u.banned_until,
      }
    })

    return NextResponse.json({ ok: true, users })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = String(body?.email || "").trim().toLowerCase()
    const password = String(body?.password || "")
    const full_name = String(body?.full_name || "").trim()
    const role = String(body?.role || "parent").toLowerCase()

    if (!email || !password || !full_name) {
      return NextResponse.json({ ok: false, error: "email, mot de passe et nom sont requis" }, { status: 400 })
    }

    if (!isValidRole(role)) {
      return NextResponse.json({ ok: false, error: "Rôle invalide" }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role,
        full_name,
      },
    })

    if (createError || !userData?.user) {
      return NextResponse.json(
        { ok: false, error: createError?.message || "Impossible de créer l'utilisateur" },
        { status: 400 }
      )
    }

    const userId = userData.user.id

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      full_name,
      role,
    })

    if (profileError) {
      return NextResponse.json(
        { ok: false, error: `Utilisateur créé mais profil non enregistré: ${profileError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: userId,
        email,
        full_name,
        role,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "Erreur serveur" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const userId = String(body?.user_id || "")
    const role = String(body?.role || "").toLowerCase()
    const full_name = String(body?.full_name || "").trim()

    if (!userId || !isValidRole(role)) {
      return NextResponse.json({ ok: false, error: "user_id ou rôle invalide" }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    const profilePayload: any = { id: userId, role }
    if (full_name) profilePayload.full_name = full_name

    const { error: profileError } = await supabase.from("profiles").upsert(profilePayload)
    if (profileError) throw profileError

    const updatePayload: any = {
      user_metadata: {
        role,
      },
    }

    if (full_name) {
      updatePayload.user_metadata.full_name = full_name
    }

    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(userId, updatePayload)
    if (authUpdateError) throw authUpdateError

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json()
    const userId = String(body?.user_id || "")

    if (!userId) {
      return NextResponse.json({ ok: false, error: "user_id manquant" }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    await supabase.from("profiles").delete().eq("id", userId)

    const { error } = await supabase.auth.admin.deleteUser(userId)
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "Erreur serveur" }, { status: 500 })
  }
}
