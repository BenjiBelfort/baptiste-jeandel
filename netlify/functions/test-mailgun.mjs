// GET / POST -> diagnostics + envoi facultatif
import FormData from "form-data";
import Mailgun from "mailgun.js";

export async function handler(event) {
  // Réponse simple en GET pour voir l’état des variables d’env
  if (event.httpMethod === "GET" && (!event.queryStringParameters?.send)) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        hint: "Ajoute ?send=1 à l'URL pour tenter un envoi Mailgun",
        env: {
          MAILGUN_API_KEY: !!process.env.MAILGUN_API_KEY,
          MAILGUN_DOMAIN: !!process.env.MAILGUN_DOMAIN,
          MAILGUN_REGION: process.env.MAILGUN_REGION || null,
          EMAIL_TO: !!process.env.EMAIL_TO,
          EMAIL_FROM: !!process.env.EMAIL_FROM,
        },
      }),
    };
  }

  // Si ?send=1 -> tentative d'envoi
  try {
    const DOMAIN = process.env.MAILGUN_DOMAIN;
    const API_KEY = process.env.MAILGUN_API_KEY;
    const REGION  = (process.env.MAILGUN_REGION || "US").toUpperCase();
    const EMAIL_TO = process.env.EMAIL_TO;
    const EMAIL_FROM = process.env.EMAIL_FROM || `Mailgun Sandbox <postmaster@${DOMAIN}>`;

    if (!DOMAIN || !API_KEY || !EMAIL_TO) {
      return { statusCode: 500, body: "ENV MISSING (DOMAIN/API_KEY/EMAIL_TO)" };
    }

    const mailgun = new Mailgun(FormData);
    const mg = mailgun.client({
      username: "api",
      key: API_KEY,
      url: REGION === "US" ? "https://api.mailgun.net" : "https://api.eu.mailgun.net",
    });

    const when = new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" });

    const resp = await mg.messages.create(DOMAIN, {
      from: EMAIL_FROM,          // sandbox: postmaster@...sandbox...
      to: [EMAIL_TO],            // sandbox: destinataire autorisé
      subject: `Test Netlify→Mailgun (${when})`,
      text: `Si tu lis ceci, l'envoi depuis Netlify fonctionne. (${when})`,
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true, resp }),
    };
  } catch (err) {
    console.error("test-mailgun ERROR:", err);
    return { statusCode: 500, body: "Mailgun send failed (voir logs Functions)" };
  }
}
