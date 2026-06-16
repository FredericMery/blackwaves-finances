import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY);

function checkBureauAuth(req: Request) {
  const token = process.env.BUREAU_ADMIN_TOKEN;
  if (!token) return true;
  const got = req.headers.get("x-bw-admin-token");
  return got === token;
}

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

export async function POST(req: Request) {
  if (!checkBureauAuth(req)) return json(401, { ok: false, error: "Unauthorized" });

  try {
    const body = await req.json();
    const submission_id = String(body.submission_id || "").trim();
    const comment = body.comment ? String(body.comment).trim() : null;

    if (!submission_id) return json(400, { ok: false, error: "submission_id manquant" });

    // 1) charger la soumission
    const sub = await supabaseAdmin
      .from("photo_submissions")
      .select("*")
      .eq("id", submission_id)
      .single();

    if (sub.error || !sub.data) {
      return json(404, { ok: false, error: "Soumission introuvable" });
    }

    if (sub.data.status === "approved" && sub.data.gallery_photo_id) {
      // idempotent
      return json(200, { ok: true, gallery_photo_id: sub.data.gallery_photo_id });
    }

    // 2) insérer dans photos (galerie)
    // ✅ on utilise les colonnes ajoutées : season / team / type
    const ins = await supabaseAdmin
      .from("photos")
      .insert([
        {
          url: sub.data.url,
          title: sub.data.title || null,
          section: sub.data.photo_type || "Concours",
          description: sub.data.description || null,
          season: sub.data.season || null,
          team: sub.data.team || null,
          type: sub.data.photo_type || null,
        },
      ])
      .select("id")
      .single();

    if (ins.error || !ins.data) {
      return json(500, { ok: false, error: `Insert photos KO: ${ins.error?.message}` });
    }

    const gallery_photo_id = ins.data.id;

    // 3) update soumission -> approved + lien galerie
    const up = await supabaseAdmin
      .from("photo_submissions")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        review_comment: comment,
        gallery_photo_id,
      })
      .eq("id", submission_id);

    if (up.error) {
      return json(500, { ok: false, error: `Update soumission KO: ${up.error.message}` });
    }

    // 4) mail au parent
    const to = sub.data.parent_email;
    const from = process.env.RESEND_FROM || "no-reply@blackwaves-cheer.com";
    const site = process.env.NEXT_PUBLIC_SITE_URL || "https://blackwaves-cheer.com";
    const galerieUrl = `${site}/galerie`;

    if (process.env.RESEND_API_KEY && to) {
      const subject = "BlackWaves — Photo validée et publiée";
      const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.45;color:#111">
          <h2 style="margin:0 0 10px 0;">Photo validée ✅</h2>
          <p style="margin:0 0 12px 0;">
            Merci ! Ta photo a été validée par le bureau et publiée dans la galerie BlackWaves.
          </p>
          <p style="margin:0 0 12px 0;">
            <b>${sub.data.title || "Sans titre"}</b><br/>
            ${sub.data.season || ""} ${sub.data.team ? "· " + sub.data.team : ""} ${sub.data.photo_type ? "· " + sub.data.photo_type : ""}
          </p>
          ${comment ? `<p style="margin:0 0 12px 0;"><i>Commentaire :</i> ${comment}</p>` : ""}
          <p style="margin:0 0 14px 0;">
            <a href="${galerieUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 14px;border-radius:10px;text-decoration:none;font-weight:700">
              Voir la galerie
            </a>
          </p>
          <p style="margin:0;color:#555;font-size:13px;">
            BlackWaves Cheer — Merci pour ta participation au concours photo.
          </p>
        </div>
      `;

      await resend.emails.send({
        from,
        to: [to],
        subject,
        replyTo: from,
        html,
      });
    }

    return json(200, { ok: true, gallery_photo_id });
  } catch (e: any) {
    return json(500, { ok: false, error: "Erreur serveur approve" });
  }
}
