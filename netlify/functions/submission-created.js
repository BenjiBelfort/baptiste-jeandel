// netlify/functions/submission-created.js
const FormData = require('form-data');
const Mailgun = require('mailgun.js');

exports.handler = async (event) => {
  try {
    console.log('[submission-created] event received');

    const payload = JSON.parse(event.body || '{}');
    const { data = {}, form_name, site_url } = payload;

    console.log('[submission-created] form_name:', form_name);
    console.log('[submission-created] keys:', Object.keys(data));

    // Anti-spam
    if (data['bot-field']) {
      console.log('[submission-created] honeypot filled -> ignore');
      return { statusCode: 200, body: 'Ignored spam (honeypot).' };
    }

    // 1) Filtrer les champs vides + techniques
    const IGNORE = new Set(['form-name', 'bot-field']);
    const entries = Object.entries(data)
      .filter(([k, v]) => !IGNORE.has(k) && v != null && String(v).trim() !== '');
    console.log('[submission-created] kept entries:', entries.map(([k]) => k));

    if (entries.length === 0) {
      console.log('[submission-created] nothing to send (all empty after pruning)');
      return { statusCode: 200, body: 'Empty after pruning; stored only.' };
    }

    // 2) Ordonner (facultatif)
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

    // 3) Mailgun config
    const DOMAIN = process.env.MAILGUN_DOMAIN; // sandbox...mailgun.org
    const API_KEY = process.env.MAILGUN_API_KEY; // private key
    const REGION  = (process.env.MAILGUN_REGION || 'US').toUpperCase(); // US pour sandbox
    const EMAIL_TO = process.env.EMAIL_TO; // Authorized recipient
    const EMAIL_FROM = process.env.EMAIL_FROM || `Mailgun Sandbox <postmaster@${DOMAIN}>`;

    console.log('[submission-created] envs presence:', {
      DOMAIN: !!DOMAIN, API_KEY: !!API_KEY, REGION, EMAIL_TO: !!EMAIL_TO, EMAIL_FROM: !!EMAIL_FROM
    });

    if (!DOMAIN || !API_KEY || !EMAIL_TO) {
      console.error('[submission-created] Missing env vars');
      return { statusCode: 500, body: 'Mailgun not configured' };
    }

    const mailgun = new Mailgun(FormData);
    const mg = mailgun.client({
      username: 'api',
      key: API_KEY,
      url: REGION === 'US' ? 'https://api.mailgun.net' : 'https://api.eu.mailgun.net',
    });

    console.log('[submission-created] sending via Mailgun…');
    const resp = await mg.messages.create(DOMAIN, {
      from: EMAIL_FROM,     // pour sandbox: postmaster@...sandbox...
      to: [EMAIL_TO],       // doit être Authorized recipient avec sandbox
      subject,
      text,
    });

    console.log('[submission-created] mailgun response:', resp);
    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('[submission-created] ERROR:', err);
    return { statusCode: 500, body: 'Function error' };
  }
};
