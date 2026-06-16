import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

type AppRole = "parent" | "coach" | "bureau"

const ALLOWED_ROLES: AppRole[] = ["parent", "coach", "bureau"]

function isValidRole(role: string): role is AppRole {
  return ALLOWED_ROLES.includes(role as AppRole)
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = params.id

    if (!userId) {
      return NextResponse.json({ ok: false, error: "user_id manquant" }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    // Récupérer l'utilisateur auth
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId)

    if (authError || !authData?.user) {
      return NextResponse.json({ ok: false, error: "Utilisateur non trouvé" }, { status: 404 })
    }

    const user = authData.user

    // Récupérer le profil
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", userId)
      .single()

    if (profileError && profileError.code !== "PGRST116") {
      throw profileError
    }

    const role = (profile?.role || (user.user_metadata?.role as string) || "parent").toLowerCase()

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email || "",
        full_name: profile?.full_name || user.user_metadata?.full_name || "",
        role: isValidRole(role) ? role : "parent",
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        email_confirmed_at: user.email_confirmed_at,
        disabled: !!user.banned_until,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "Erreur serveur" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const userId = params.id
    const body = await req.json()
    const { full_name, role, password } = body

    if (!userId) {
      return NextResponse.json({ ok: false, error: "user_id manquant" }, { status: 400 })
    }

    if (role && !isValidRole(role)) {
      return NextResponse.json({ ok: false, error: "Rôle invalide" }, { status: 400 })
    }

    const supabase = supabaseAdmin()

    // Mettre à jour le profil
    if (full_name) {
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userId,
        full_name,
      })

      if (profileError) throw profileError
    }

    // Mettre à jour le rôle
    if (role) {
      const { error: roleProfileError } = await supabase.from("profiles").upsert({
        id: userId,
        role,
      })

      if (roleProfileError) throw roleProfileError

      const { error: authUpdateError } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: {
          role,
        },
      })

      if (authUpdateError) throw authUpdateError
    }

    // Mettre à jour le mot de passe si fourni
    if (password) {
      const { error: passwordError } = await supabase.auth.admin.updateUserById(userId, {
        password,
      })

      if (passwordError) throw passwordError
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "Erreur serveur" }, { status: 500 })
  }
}
