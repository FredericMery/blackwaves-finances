import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

// 🔧 Détection de l'environnement
const isDev = process.env.NODE_ENV === "development";

type TrialRequest = {
  id: string;
  child_first_name: string;
  child_last_name: string;
  child_birthdate: string | null;
  wanted_team: string | null;
  parent_first_name: string;
  parent_last_name: string;
  parent_email: string;
  parent_phone: string;
  notes: string | null;
  created_at: string;
};

function computeAge(dateString: string | null): string {
  if (!dateString) return "Âge non renseigné";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "Âge non renseigné";

  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
    age--;
  }
  return `${age} ans`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      request?: TrialRequest;
    } | null;

    if (!body?.request) {
      return NextResponse.json(
        { error: "Missing request payload" },
        { status: 400 }
      );
    }

    const r = body.request;

    const age = computeAge(r.child_birthdate);

    const subject = `Nouvelle demande d'essai - ${r.child_first_name} ${r.child_last_name}`;
    const html = `
      <p>Bonjour coach,</p>
      <p>Une nouvelle demande d'essai vient d'être enregistrée.</p>
      <h3>Enfant</h3>
      <ul>
        <li><strong>Prénom :</strong> ${r.child_first_name}</li>
        <li><strong>Nom :</strong> ${r.child_last_name}</li>
        <li><strong>Âge :</strong> ${age}</li>
        <li><strong>Équipe souhaitée :</strong> ${
          r.wanted_team || "Non précisé"
        }</li>
      </ul>
      <h3>Parent</h3>
      <ul>
        <li><strong>Nom / prénom :</strong> ${r.parent_first_name} ${
      r.parent_last_name
    }</li>
        <li><strong>Email :</strong> ${r.parent_email}</li>
        <li><strong>Téléphone :</strong> ${r.parent_phone}</li>
      </ul>
      ${
        r.notes
          ? `<h3>Notes du formulaire</h3><p>${r.notes}</p>`
          : ""
      }
      <p>Date de la demande : ${new Date(r.created_at).toLocaleString(
        "fr-FR"
      )}</p>
      <p>—<br/>Notification automatique Black Waves Cheer</p>
    `;

    // 🎯 Sécurité DEV : en dev, tout arrive chez toi
    const to = isDev
      ? "frederic.mery@alhenaservices.com"
      : "f-mery@hotmail.fr"; // adresse actuelle pour le coach

    console.log("📧 Envoi mail coach →", to);

    const { error } = await resend.emails.send({
      from: "Black Waves <no-reply@blackwaves-cheer.com>",
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Erreur Resend", error);
      return NextResponse.json(
        { error: "Erreur lors de l’envoi du mail avec Resend." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erreur notify-coach-trial", err);
    return NextResponse.json(
      { error: "Erreur interne lors de la notification coach." },
      { status: 500 }
    );
  }
}