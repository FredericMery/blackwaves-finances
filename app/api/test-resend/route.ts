import { NextResponse } from "next/server";
import { Resend } from "resend";

// Helper JSON
function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export const runtime = "nodejs";

// Typage minimal et safe pour Resend
type ResendSendSuccess = {
  data?: { id?: string } | null;
  error?: null;
};

type ResendSendError = {
  data?: null;
  error?: { message?: string } | null;
};

type ResendSendResult = ResendSendSuccess | ResendSendError;

// GET = test simple navigateur
export async function GET() {
  console.log("[test-resend] GET OK");
  return json({
    ok: true,
    message: "test-resend GET OK v3",
  });
}

// POST = vrai test d'envoi email
export async function POST(req: Request) {
  console.log("[test-resend] POST reçu");

  try {
    // 1️⃣ Vérifier Content-Type (on tolère charset)
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return json(
        { ok: false, error: "Content-Type doit être application/json" },
        400
      );
    }

    // 2️⃣ Lire le body
    const body = (await req.json().catch(() => null)) as
      | { to?: unknown; email?: unknown }
      | null;

    console.log("[test-resend] body =", body);

    const to =
      (body?.to != null ? String(body.to).trim() : "") ||
      (body?.email != null ? String(body.email).trim() : "") ||
      "";

    if (!to) {
      return json(
        { ok: false, error: 'Body JSON attendu: { "to": "parent@email.com" }' },
        400
      );
    }

    // 3️⃣ Vérifier variables d’environnement
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;

    console.log(
      "[test-resend] env:",
      "RESEND_API_KEY =",
      apiKey ? "OK" : "MISSING",
      "| EMAIL_FROM =",
      from
    );

    if (!apiKey) {
      return json(
        { ok: false, error: "RESEND_API_KEY manquante dans .env.local" },
        500
      );
    }

    if (!from) {
      return json(
        { ok: false, error: "EMAIL_FROM manquante dans .env.local" },
        500
      );
    }

    // 4️⃣ Envoi avec timeout (évite blocage curl)
    const resend = new Resend(apiKey);

    console.log("[test-resend] tentative envoi vers", to);

    const result = (await Promise.race([
      resend.emails.send({
        from,
        to,
        subject: "Test email – BlackWaves (local)",
        html: `
          <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial">
            <h2>✅ Test Resend OK</h2>
            <p>Si tu reçois ce mail, l'envoi fonctionne depuis le dev local.</p>
          </div>
        `,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout Resend (8s)")), 8000)
      ),
    ])) as unknown as ResendSendResult;

    console.log("[test-resend] résultat resend =", result);

    // 5️⃣ Gestion erreur Resend explicite (sans ts-ignore)
    if (result && "error" in result && result.error) {
      return json(
        {
          ok: false,
          error: result.error.message || "Erreur Resend",
          result,
        },
        403
      );
    }

    return json({
      ok: true,
      message: "Email envoyé avec succès",
      result,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erreur inattendue";
    console.error("[test-resend] exception :", e);

    return json(
      {
        ok: false,
        error: msg,
        details: e instanceof Error ? e.stack ?? String(e) : String(e),
      },
      500
    );
  }
}
