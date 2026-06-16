import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    const accessToken = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";

    if (!accessToken) {
      return NextResponse.json({ success: false, message: "Session manquante." }, { status: 401 });
    }

    const supabase = supabaseAdmin();

    const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !userData?.user) {
      return NextResponse.json({ success: false, message: "Session Supabase invalide." }, { status: 401 });
    }

    const user = userData.user;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ success: false, message: "Profil introuvable." }, { status: 403 });
    }

    const role = String(profile?.role || "").toLowerCase();

    if (role !== "bureau") {
      return NextResponse.json({ success: false, message: "Accès réservé au bureau." }, { status: 403 });
    }

    const response = NextResponse.json({ success: true, role });

    response.cookies.set("bw_adherent_auth", "1", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });

    response.cookies.set("bw_role", role, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
    });

    return response;
  } catch (err) {
    console.error("Erreur login :", err);
    return NextResponse.json(
      { success: false, message: "Erreur serveur." },
      { status: 500 }
    );
  }
}
