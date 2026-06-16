// app/api/trial-request/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function clean(v: any) {
  return (v ?? "").toString().trim();
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(req: Request) {
  try {
    const usingTypoResendKey =
      !process.env.RESEND_API_KEY && !!process.env.RESSEND_API_KEY;
    const resendKey = (
      process.env.RESEND_API_KEY || process.env.RESSEND_API_KEY || ""
    ).trim();

    if (usingTypoResendKey) {
      console.warn(
        "[trial-request] Using RESSEND_API_KEY fallback. Rename env var to RESEND_API_KEY."
      );
    }

    let supabase;
    try {
      supabase = supabaseAdmin();
    } catch (e) {
      console.error("[trial-request] Supabase config error:", e);
      return NextResponse.json(
        { ok: false, error: "SUPABASE_CONFIG_MISSING" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
    }

    const childFirstName = clean(body.childFirstName);
    const childLastName = clean(body.childLastName);
    const childBirthdate = clean(body.childBirthdate) || null;

    const wantedTeam = clean(body.wantedTeam) || null;

    const parentFirstName = clean(body.parentFirstName);
    const parentLastName = clean(body.parentLastName);
    const parentEmail = clean(body.parentEmail).toLowerCase();
    const parentPhone = clean(body.parentPhone);

    const notes = clean(body.notes) || null;

    // validations minimales
    if (!childFirstName || !childLastName || !childBirthdate) {
      return NextResponse.json(
        { ok: false, error: "CHILD_FIELDS_MISSING" },
        { status: 400 }
      );
    }
    if (!parentFirstName || !parentLastName || !parentEmail || !parentPhone) {
      return NextResponse.json(
        { ok: false, error: "PARENT_FIELDS_MISSING" },
        { status: 400 }
      );
    }
    if (!isEmail(parentEmail)) {
      return NextResponse.json({ ok: false, error: "INVALID_EMAIL" }, { status: 400 });
    }

    // 1) insert trial_requests côté serveur
    const { data: inserted, error: insertError } = await supabase
      .from("trial_requests")
      .insert({
        child_first_name: childFirstName,
        child_last_name: childLastName,
        child_birthdate: childBirthdate,
        wanted_team: wantedTeam,
        parent_first_name: parentFirstName,
        parent_last_name: parentLastName,
        parent_email: parentEmail,
        parent_phone: parentPhone,
        notes,
        status: "draft",
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("[trial-request] DB insert error:", insertError);
      return NextResponse.json({ ok: false, error: "DB_INSERT_FAILED" }, { status: 500 });
    }

    const trialRequestId = inserted.id as string;

    // 2) emails (best effort)
    const emailFrom =
      process.env.RESEND_FROM || "Black Waves Cheer <onboarding@resend.dev>";
    const bureauTo =
      (process.env.CONTACT_TO_EMAIL || "contact@blackwaves-cheer.com").trim();

    const childFullName = `${childFirstName} ${childLastName}`.trim();
    const parentFullName = `${parentFirstName} ${parentLastName}`.trim();
    const birthText = childBirthdate || "Non renseignée";
    const teamText = wantedTeam || "Non précisé";
    const notesText = notes || "—";

    let parentEmailOk = false;
    let parentEmailError: string | null = null;
    let bureauEmailOk = false;
    let bureauEmailError: string | null = null;

    if (!resendKey) {
      parentEmailError = "RESEND_API_KEY_MISSING";
      bureauEmailError = "RESEND_API_KEY_MISSING";
    } else {
      const resend = new Resend(resendKey);

      try {
        const parentEmailRes = await resend.emails.send({
          from: emailFrom,
          to: parentEmail,
          subject: "Black Waves Cheer – Demande de cours d’essai reçue",
          html: `
            <p>Bonjour ${parentFirstName || "cher parent"},</p>
            <p>Nous avons bien reçu votre demande de cours d’essai pour <strong>${childFullName}</strong>.</p>
            <p><strong>Récapitulatif :</strong></p>
            <ul>
              <li>Enfant : <strong>${childFullName}</strong></li>
              <li>Date de naissance : ${birthText}</li>
              <li>Équipe / catégorie souhaitée : ${teamText}</li>
              <li>Téléphone parent : ${parentPhone}</li>
            </ul>
            <p>Commentaires :<br/>${notesText}</p>
            <p>Le bureau Black Waves vous recontactera rapidement pour vous proposer un créneau d’essai adapté.</p>
            <p>Sportivement,<br/>Le bureau Black Waves Cheer</p>
          `,
        });

        // @ts-ignore
        if (parentEmailRes?.error) {
          // @ts-ignore
          throw parentEmailRes.error;
        }

        parentEmailOk = true;
      } catch (e: any) {
        console.error("[trial-request] Parent email send error:", e);
        parentEmailError = e?.message || "PARENT_EMAIL_SEND_ERROR";
      }

      try {
        const bureauEmailRes = await resend.emails.send({
          from: emailFrom,
          to: bureauTo,
          subject: `Nouvelle demande de cours d’essai – ${childFullName}`,
          html: `
            <p>Nouvelle demande de cours d’essai enregistrée :</p>
            <ul>
              <li>Enfant : <strong>${childFullName}</strong></li>
              <li>Date de naissance : ${birthText}</li>
              <li>Équipe souhaitée : ${teamText}</li>
              <li>Parent : ${parentFullName}</li>
              <li>Email parent : ${parentEmail}</li>
              <li>Téléphone : ${parentPhone}</li>
            </ul>
            <p>Commentaires :<br/>${notesText}</p>
            <p>ID demande : <code>${trialRequestId}</code></p>
            <p>Table : <code>trial_requests</code></p>
          `,
        });

        // @ts-ignore
        if (bureauEmailRes?.error) {
          // @ts-ignore
          throw bureauEmailRes.error;
        }

        bureauEmailOk = true;
      } catch (e: any) {
        console.error("[trial-request] Bureau email send error:", e);
        bureauEmailError = e?.message || "BUREAU_EMAIL_SEND_ERROR";
      }
    }

    return NextResponse.json(
      {
        ok: true,
        trialRequestId,
        parentEmailOk,
        parentEmailError,
        bureauEmailOk,
        bureauEmailError,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("[trial-request] Exception:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
