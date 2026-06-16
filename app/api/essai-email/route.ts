import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      prenomEnfant,
      nomEnfant,
      dateNaissance,
      equipeSouhaitee,
      emailParent,
      telephoneParent,
    } = body as {
      prenomEnfant: string;
      nomEnfant: string;
      dateNaissance?: string | null;
      equipeSouhaitee?: string | null;
      emailParent: string;
      telephoneParent: string;
    };

    if (!emailParent || !prenomEnfant || !nomEnfant) {
      return NextResponse.json(
        { ok: false, message: 'Champs obligatoires manquants.' },
        { status: 400 }
      );
    }

    const from =
      process.env.RESEND_FROM_EMAIL ||
      'Black Waves Cheer <no-reply@blackwaves-cheer.com>';

    const bureauListRaw = process.env.RESEND_BUREAU_EMAILS || '';
    const bureauEmails = bureauListRaw
      .split(',')
      .map((e) => e.trim())
      .filter((e) => !!e);

    // 1) Email au parent
    await resend.emails.send({
      from,
      to: emailParent,
      subject: 'Black Waves Cheer – Demande de cours d’essai bien reçue',
      html: `
        <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size:14px; color:#0f172a;">
          <p>Bonjour,</p>
          <p>Nous avons bien reçu votre demande de cours d’essai pour :</p>
          <ul>
            <li><strong>Enfant :</strong> ${prenomEnfant} ${nomEnfant}</li>
            ${
              dateNaissance
                ? `<li><strong>Date de naissance :</strong> ${dateNaissance}</li>`
                : ''
            }
            ${
              equipeSouhaitee
                ? `<li><strong>Équipe / catégorie souhaitée :</strong> ${equipeSouhaitee}</li>`
                : ''
            }
          </ul>
          <p>Le bureau Black Waves vous contactera prochainement pour vous proposer un créneau de cours d’essai adapté.</p>
          <p style="margin-top:16px;">Sportivement,<br><strong>Le club Black Waves Cheer</strong></p>
        </div>
      `,
    });

    // 2) Email au bureau (si configuré)
    if (bureauEmails.length > 0) {
      await resend.emails.send({
        from,
        to: bureauEmails,
        subject: 'Nouvelle demande de cours d’essai – Black Waves',
        html: `
          <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size:14px; color:#0f172a;">
            <p>Une nouvelle demande de cours d’essai a été enregistrée :</p>
            <ul>
              <li><strong>Enfant :</strong> ${prenomEnfant} ${nomEnfant}</li>
              ${
                dateNaissance
                  ? `<li><strong>Date de naissance :</strong> ${dateNaissance}</li>`
                  : ''
              }
              ${
                equipeSouhaitee
                  ? `<li><strong>Équipe / catégorie souhaitée :</strong> ${equipeSouhaitee}</li>`
                  : ''
              }
              <li><strong>E-mail parent :</strong> ${emailParent}</li>
              <li><strong>Téléphone parent :</strong> ${telephoneParent}</li>
            </ul>
            <p>Vous pouvez traiter cette demande dans l’espace bureau (rubrique inscriptions).</p>
          </div>
        `,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Erreur API /api/essai-email :', error);
    return NextResponse.json(
      {
        ok: false,
        message:
          "Une erreur est survenue lors de l'envoi des e-mails de confirmation.",
      },
      { status: 500 }
    );
  }
}
