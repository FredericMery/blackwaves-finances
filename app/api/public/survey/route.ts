import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  try {
    const sb = supabaseAdmin();
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    if (!token) return NextResponse.json({ ok: false, error: "token manquant" }, { status: 400 });

    // Find recipient by token
    const { data: recipient, error: rErr } = await sb
      .from("com_recipients")
      .select("*")
      .eq("token", token)
      .single();

    if (rErr) throw rErr;
    if (!recipient) return NextResponse.json({ ok: false, error: "Token invalide" }, { status: 404 });
    if (!recipient.survey_uuid && !recipient.survey_id) {
      return NextResponse.json(
        { ok: false, error: "Lien invalide: ce destinataire n'est rattaché à aucun sondage. Renvoyer le sondage." },
        { status: 400 }
      );
    }

    // Use survey_uuid if available, fallback to survey_id
    const surveyId = recipient.survey_uuid || recipient.survey_id

    // Mark as opened
    if (!recipient.opened_at) {
      await sb.from("com_recipients").update({ opened_at: new Date().toISOString() }).eq("id", recipient.id);
    }

    // Get survey
    const { data: survey, error: sErr } = await sb
      .from("com_surveys")
      .select("id, title")
      .eq("id", surveyId)
      .single();

    if (sErr) throw sErr;

    // Get questions with options
    const { data: questions, error: qErr } = await sb
      .from("com_survey_questions")
      .select(`*, com_survey_options(*)`)
      .eq("survey_id", survey.id)
      .order("ordre", { ascending: true });

    if (qErr) throw qErr;

    return NextResponse.json({
      ok: true,
      survey: { id: survey.id, title: survey.title },
      email: recipient.email,
      questions: questions || []
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Erreur" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sb = supabaseAdmin();
    const body = await req.json();
    const { token, answers } = body as {
      token: string;
      answers: Array<{ question_id: string; value_text?: string; value_number?: number; value_bool?: boolean; value_json?: any }>;
    };

    if (!token) return NextResponse.json({ ok: false, error: "token manquant" }, { status: 400 });
    if (!Array.isArray(answers)) return NextResponse.json({ ok: false, error: "answers invalides" }, { status: 400 });

    const { data: recip, error: rErr } = await sb
      .from("parent_communication_recipients")
      .select("*")
      .eq("token", token)
      .single();
    if (rErr) throw rErr;

    const { data: survey, error: sErr } = await sb
      .from("parent_surveys")
      .select("*")
      .eq("communication_id", recip.communication_id)
      .single();
    if (sErr) throw sErr;

    // créer la soumission
    const { data: resp, error: respErr } = await sb
      .from("parent_survey_responses")
      .insert([
        {
          survey_id: survey.id,
          recipient_id: recip.id,
          user_agent: req.headers.get("user-agent") || null,
        },
      ])
      .select("*")
      .single();

    if (respErr) throw respErr;

    // détails
    const rows = answers.map((a) => ({
      response_id: resp.id,
      question_id: a.question_id,
      value_text: a.value_text ?? null,
      value_number: a.value_number ?? null,
      value_bool: a.value_bool ?? null,
      value_json: a.value_json ?? null,
    }));

    const { error: aErr } = await sb.from("parent_survey_answers").insert(rows);
    if (aErr) throw aErr;

    await sb
      .from("parent_communication_recipients")
      .update({ status: "responded", responded_at: new Date().toISOString() })
      .eq("id", recip.id);

    return NextResponse.json({ ok: true, thankyou: survey.thankyou_md || "Merci 🙏" });
  } catch (e: any) {
    // si déjà répondu (unique constraint), on renvoie un message propre
    const msg = e?.message || "";
    if (msg.includes("duplicate key value") || msg.includes("unique")) {
      return NextResponse.json({ ok: false, error: "Réponse déjà enregistrée pour ce lien." }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: msg || "Erreur" }, { status: 500 });
  }
}
