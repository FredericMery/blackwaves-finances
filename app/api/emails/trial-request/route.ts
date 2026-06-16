import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      trialRequestId,
      childFirstName,
      childLastName,
      childBirthdate,
      wantedTeam,
      parentFirstName,
      parentLastName,
      parentEmail,
      parentPhone,
      notes,
    } = body;

    // Email pour le parent
    await resend.emails.send({
      from: "Black Waves Cheer <contact@blackwaves-cheer.com>",
      to: parentEmail,
      subject: "Votre demande de cours d’essai – Black Waves",
      html: `
        <p>Bonjour ${parentFirstName},</p>
        <p>Merci pour votre demande de cours d’essai pour ${childFirstName} ${childLastName}.</p>
        <p>Nous vous recontacterons rapidement avec un créneau adapté.</p>
        <br/>
        <p>Sportivement,</p>
        <p><b>Black Waves Cheerleading</b></p>
      `,
    });

    // Email bureau avec lien direct
    const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  "http://localhost:3000";
  const prepareUrl = `${baseUrl}/bureau/inscriptions/preparer/${trialRequestId}`;

    await resend.emails.send({
      from: "Black Waves Cheer <contact@blackwaves-cheer.com>",
      to: "frederic.mery.perso@gmail.com",
      subject: "🔔 Nouvelle demande de cours d’essai",
      html: `
        <h2>Nouvelle demande de cours d’essai</h2>
        <p><b>Enfant :</b> ${childFirstName} ${childLastName}</p>
        <p><b>Né(e) le :</b> ${childBirthdate}</p>
        <p><b>Équipe souhaitée :</b> ${wantedTeam || "Non précisé"}</p>

        <br/>

        <p><b>Parent :</b> ${parentFirstName} ${parentLastName}</p>
        <p><b>Email :</b> ${parentEmail}</p>
        <p><b>Téléphone :</b> ${parentPhone}</p>

        <br/>

        <p><b>Commentaires :</b> ${notes || "Aucun"}</p>

        <br/><br/>

        <a href="${prepareUrl}"
           style="
             background: #ec4899;
             color: white;
             padding: 14px 22px;
             border-radius: 8px;
             text-decoration: none;
             font-weight: bold;
           ">
          Préparer l’inscription →
        </a>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur API trial-request:", error);
    return NextResponse.json(
      { error: "Erreur lors de l’envoi des e-mails." },
      { status: 500 }
    );
  }
}
