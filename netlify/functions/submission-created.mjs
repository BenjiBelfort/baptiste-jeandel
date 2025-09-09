// netlify/functions/submission-created.mjs
export async function handler(event) {
  // --- PING GET: utile quand tu ouvres l’URL dans le navigateur
  if (event.httpMethod !== 'POST' || !event.body) {
    return {
      statusCode: 200,
      body: 'submission-created alive (waiting for Netlify Forms POST)',
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { data = {}, form_name, site_url } = payload;

    // Anti-spam (honeypot)
    if (data['bot-field']) {
      return { statusCode: 200, body: 'Ignored spam (honeypot).' };
    }

    // Garder uniquement les champs non vides (et non techniques)
    const IGNORE = new Set(['form-name', 'bot-field']);
    const entries = Object.entries(data)
      .filter(([k, v]) => !IGNORE.has(k) && v != null && String(v).trim() !== '');

    if (!entries.length) {
      return { statusCode: 200, body: 'Empty after pruning; stored only.' };
    }

    // Contenu de l’email
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

    // 🔑 Imports dynamiques -> évitent les erreurs ESM lors d'un GET
    const { default: FormData } = await import('form-data');
    const { default: Mailgun }  = await import('mailgun.js');

    // ENV
    const DOMAIN = process.env.MAILGUN_DOMAIN;  // sandbox...mailgun.org (ou mg.tondomaine.com)
    const API_KEY = process.env.MAILGUN_API_KEY; // Private API Key
    const REGION  = (process.env.MAILGUN_REGION || 'US').toUpperCase(); // sandbox = US
    const EMAIL_TO = process.env.EMAIL_TO;       // (sandbox: destinataire autorisé)
    const EMAIL_FROM = process.env.EMAIL_FROM || `Mailgun Sandbox <postmaster@${DOMAIN}>`;

    if (!DOMAIN || !API_KEY || !EMAIL_TO) {
      console.error('Mailgun not configured', { hasDOMAIN: !!DOMAIN, hasAPIKEY: !!API_KEY, hasTO: !!EMAIL_TO });
      return { statusCode: 500, body: 'Mailgun not configured' };
    }

    // Client Mailgun
    const mailgun = new Mailgun(FormData);
    const mg = mailgun.client({
      username: 'api',
      key: API_KEY,
      url: REGION === 'US' ? 'https://api.mailgun.net' : 'https://api.eu.mailgun.net',
    });

    // Envoi
    await mg.messages.create(DOMAIN, {
      from: EMAIL_FROM,    // sandbox: postmaster@...sandbox...
      to: [EMAIL_TO],      // sandbox: destinataire autorisé
      subject,
      text,
    });

    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('submission-created ERROR:', err);
    return { statusCode: 500, body: 'Function error' };
  }
}
