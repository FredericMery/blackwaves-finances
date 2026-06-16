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
    const comment = String(body.comment || "").trim();

    if (!submission_id) return json(400, { ok: false, error: "submission_id manquant" });
    if (!comment) return json(400, { ok: false, error: "comment obligatoire (refus)" });

    // 1) charger la soumission
    const sub = await supabaseAdmin
      .from("photo_submissions")
      .select("*")
      .eq("id", submission_id)
      .single();

    if (sub.error || !sub.data) {
      return json(404, { ok: false, error: "Soumission introuvable" });
    }

    if (sub.data.status === "rejected") {
      // idempotent
      return json(200, { ok: true });
    }

    // 2) update soumission -> rejected
    const up = await supabaseAdmin
      .from("photo_submissions")
      .update({
        status: "rejected",
        reviewed_at: new Date().toISOString(),
        review_comment: comment,
      })
      .eq("id", submission_id);

    if (up.error) {
      return json(500, { ok: false, error: `Update soumission KO: ${up.error.message}` });
    }

    // 3) mail parent
    const to = sub.data.parent_email;
    const from = process.env.RESEND_FROM || "no-reply@blackwaves-cheer.com";

    if (process.env.RESEND_API_KEY && to) {
      const subject = "BlackWaves — Photo non retenue (concours)";
      const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.45;color:#111">
          <h2 style="margin:0 0 10px 0;">Photo non retenue</h2>
          <p style="margin:0 0 12px 0;">
            Merci pour ta proposition ! Le bureau n’a pas validé cette photo pour la galerie.
          </p>
          <p style="margin:0 0 12px 0;">
            <b>${sub.data.title || "Sans titre"}</b><br/>
            ${sub.data.season || ""} ${sub.data.team ? "· " + sub.data.team : ""} ${sub.data.photo_type ? "· " + sub.data.photo_type : ""}
          </p>
          <p style="margin:0 0 12px 0;">
            <i>Motif / commentaire :</i><br/>
            ${comment}
          </p>
          <p style="margin:0;color:#555;font-size:13px;">
            Tu peux proposer une autre photo à tout moment. Merci pour ta participation 💙
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

    return json(200, { ok: true });
  } catch (e: any) {
    return json(500, { ok: false, error: "Erreur serveur reject" });
  }
}
