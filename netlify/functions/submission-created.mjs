// netlify/functions/submission-created.mjs
export async function handler(event) {
  // Ping GET pour test au navigateur
  if (event.httpMethod !== 'POST' || !event.body) {
    return { statusCode: 200, body: 'submission-created alive (waiting for Netlify Forms POST)' };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { data = {}, form_name, site_url } = payload;

    // honeypot anti-spam
    if (data['bot-field']) {
      return { statusCode: 200, body: 'Ignored spam (honeypot).' };
    }

    // Ne garder que les champs non vides et non techniques
    const IGNORE = new Set(['form-name', 'bot-field']);
    const entries = Object.entries(data).filter(
      ([k, v]) => !IGNORE.has(k) && v != null && String(v).trim() !== ''
    );
    if (!entries.length) {
      return { statusCode: 200, body: 'Empty after pruning; stored only.' };
    }

    // Email texte
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

    // ENV Mailgun
    const DOMAIN = process.env.MAILGUN_DOMAIN;              // ex: sandbox…mailgun.org
    const API_KEY = process.env.MAILGUN_API_KEY;            // Private API Key
    const REGION  = (process.env.MAILGUN_REGION || 'US').toUpperCase(); // sandbox = US
    const EMAIL_TO = process.env.EMAIL_TO;                  // (sandbox: destinataire autorisé)
    const EMAIL_FROM = process.env.EMAIL_FROM || `Mailgun Sandbox <postmaster@${DOMAIN}>`;

    if (!DOMAIN || !API_KEY || !EMAIL_TO) {
      console.error('[submission-created] Missing env vars', { DOMAIN, API_KEY: !!API_KEY, EMAIL_TO });
      return { statusCode: 500, body: 'Mailgun not configured' };
    }

    // Appel HTTP direct (pas de dépendances)
    const API_BASE = REGION === 'US' ? 'https://api.mailgun.net' : 'https://api.eu.mailgun.net';
    const url = `${API_BASE}/v3/${DOMAIN}/messages`;

    const body = new URLSearchParams({
      from: EMAIL_FROM,
      to: EMAIL_TO,
      subject,
      text
    }).toString();

    const auth = Buffer.from(`api:${API_KEY}`).toString('base64');

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('[submission-created] Mailgun error', resp.status, errText);
      return { statusCode: 500, body: 'Email send failed' };
    }

    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('submission-created ERROR:', err);
    return { statusCode: 500, body: 'Function error' };
  }
}
