import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type SendEmailParams = {
  to: string[];
  subject: string;
  html: string;
};

export async function sendNotificationEmail({ to, subject, html }: SendEmailParams) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    console.error("RESEND_API_KEY ou EMAIL_FROM manquant, email non envoyé.");
    return;
  }

  if (!to || to.length === 0) {
    console.log("Aucun destinataire → pas d'email envoyé.");
    return;
  }

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to,
      subject,
      html,
    });

    console.log("Email de notification envoyé à :", to.join(", "));
  } catch (err) {
    console.error("Erreur lors de l'envoi d'email :", err);
  }
}
