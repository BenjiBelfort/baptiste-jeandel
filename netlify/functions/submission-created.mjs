import FormData from "form-data";
import Mailgun from "mailgun.js";

export async function handler(event) {
  try {
    // 0) Mode "ping" pour GET/vides → utile quand on ouvre l’URL dans un navigateur
    if (event.httpMethod !== 'POST' || !event.body) {
      return {
        statusCode: 200,
        body: 'submission-created alive (awaiting Netlify Forms payload)',
      };
    }

    const payload = JSON.parse(event.body || '{}');
    const { data = {}, form_name, site_url } = payload;

    // Anti-spam
    if (data['bot-field']) {
      return { statusCode: 200, body: 'Ignored spam (honeypot).' };
    }

    // Garder uniquement les champs non vides et non techniques
    const IGNORE = new Set(['form-name', 'bot-field']);
    const entries = Object.entries(data)
      .filter(([k, v]) => !IGNORE.has(k) && v != null && String(v).trim() !== '');

    if (entries.length === 0) {
      return { statusCode: 200, body: 'Empty after pruning; stored only.' };
    }

    // Optionnel : ordre sympa
    const FIELD_ORDER = ['Provenance', 'Domaine', 'Nom', 'Email', 'Téléphone', 'Message'];
    const orderIndex = (k) => {
      const i = FIELD_ORDER.indexOf(k);
      return i === -1 ? 9999 : i;
    };
    entries.sort((a, b) => {
      const ai = orderIndex(a[0]); const bi = orderIndex(b[0]);
      return ai !== bi ? ai - bi : a[0].localeCompare(b[0]);
    });

    const when = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Paris'
    }).format(new Date());

    const lines = entries.map(([k, v]) => `• ${k}: ${v}`);
    const subject = `Nouveau formulaire: ${form_name || 'inconnu'} — ${when}`;
    const text =
`Formulaire: ${form_name || 'inconnu'}
Site: ${site_url || '-'}
Date: ${when}

Champs remplis:
${lines.join('\n')}

— Fin —`;

    // Mailgun (sandbox = US)
    const DOMAIN = process.env.MAILGUN_DOMAIN;
    const API_KEY = process.env.MAILGUN_API_KEY;
    const REGION  = (process.env.MAILGUN_REGION || 'US').toUpperCase();
    const EMAIL_TO = process.env.EMAIL_TO;
    const EMAIL_FROM = process.env.EMAIL_FROM || `Mailgun Sandbox <postmaster@${DOMAIN}>`;

    if (!DOMAIN || !API_KEY || !EMAIL_TO) {
      console.error('Missing Mailgun env vars');
      return { statusCode: 500, body: 'Mailgun not configured' };
    }

    const mailgun = new Mailgun(FormData);
    const mg = mailgun.client({
      username: "api",
      key: API_KEY,
      url: REGION === 'US' ? "https://api.mailgun.net" : "https://api.eu.mailgun.net",
    });

    await mg.messages.create(DOMAIN, {
      from: EMAIL_FROM,      // sandbox: postmaster@…sandbox…
      to: [EMAIL_TO],        // doit être Authorized Recipient en sandbox
      subject,
      text,
    });

    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('submission-created ERROR:', err);
    return { statusCode: 500, body: 'Function error' };
  }
}
