import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body.email;
    const password = body.password;

    // Récupérer crédentials depuis .env
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    const parentEmail = process.env.PARENT_EMAIL;
    const parentPassword = process.env.PARENT_PASSWORD;

    const coachEmail = process.env.COACH_EMAIL;
    const coachPassword = process.env.COACH_PASSWORD;

    let role: string | null = null;

    if (email === adminEmail && password === adminPassword) role = "bureau";
    if (email === coachEmail && password === coachPassword) role = "coach";
    if (email === parentEmail && password === parentPassword) role = "parent";

    if (!role) {
      return NextResponse.json(
        { success: false, message: "Identifiants incorrects." },
        { status: 401 }
      );
    }

    // → Écriture du cookie
    const response = NextResponse.json({ success: true, role });

    response.cookies.set("bw_role", role, {
      path: "/",
      httpOnly: false,  // autorise le layout à lire
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
