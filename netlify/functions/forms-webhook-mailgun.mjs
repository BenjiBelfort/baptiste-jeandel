export async function handler(event) {
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        hint: 'POST-moi le payload Netlify Forms. Ajoute ?token=XXXX dans la config du webhook.',
        env: {
          MAILGUN_API_KEY: !!process.env.MAILGUN_API_KEY,
          MAILGUN_DOMAIN:  !!process.env.MAILGUN_DOMAIN,
          MAILGUN_REGION:  process.env.MAILGUN_REGION || null,
          EMAIL_TO:        !!process.env.EMAIL_TO,
          EMAIL_FROM:      !!process.env.EMAIL_FROM,
          WEBHOOK_TOKEN:   !!process.env.WEBHOOK_TOKEN,
        },
      }),
    };
  }

  const qsToken = event.queryStringParameters?.token || '';
  if (!process.env.WEBHOOK_TOKEN || qsToken !== process.env.WEBHOOK_TOKEN) {
    return { statusCode: 401, body: 'Unauthorized (bad token)' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const form_name = body.form_name || body?.payload?.form_name || 'inconnu';
    const site_url  = body.site_url  || body?.payload?.site_url  || '-';
    const data      = body.data      || body?.payload?.data      || {};

    if (data['bot-field']) return { statusCode: 200, body: 'Ignored spam (honeypot).' };

    const IGNORE = new Set(['form-name', 'bot-field']);
    const entries = Object.entries(data).filter(([k, v]) => !IGNORE.has(k) && v != null && String(v).trim() !== '');
    if (!entries.length) return { statusCode: 200, body: 'Empty after pruning; stored only.' };

    const when = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(new Date());
    const FIELD_ORDER = ['Provenance','Domaine','Nom','Email','Téléphone','Message'];
    const ord = k => { const i = FIELD_ORDER.indexOf(k); return i === -1 ? 9999 : i; };
    entries.sort((a,b) => { const ai=ord(a[0]), bi=ord(b[0]); return ai!==bi ? ai-bi : a[0].localeCompare(b[0]); });
    const lines = entries.map(([k, v]) => `• ${k}: ${v}`);
    const subject = `Nouveau formulaire: ${form_name} — ${when}`;
    const text = `Formulaire: ${form_name}
Site: ${site_url}
Date: ${when}

Champs remplis:
${lines.join('\n')}

— Fin —`;

    const DOMAIN = process.env.MAILGUN_DOMAIN;
    const API_KEY = process.env.MAILGUN_API_KEY;
    const REGION  = (process.env.MAILGUN_REGION || 'US').toUpperCase();
    const EMAIL_TO = process.env.EMAIL_TO;
    const EMAIL_FROM = process.env.EMAIL_FROM || `Mailgun Sandbox <postmaster@${DOMAIN}>`;
    if (!DOMAIN || !API_KEY || !EMAIL_TO) return { statusCode: 500, body: 'Mailgun not configured' };

    const API_BASE = REGION === 'US' ? 'https://api.mailgun.net' : 'https://api.eu.mailgun.net';
    const url = `${API_BASE}/v3/${DOMAIN}/messages`;
    const auth = Buffer.from(`api:${API_KEY}`).toString('base64');
    const bodyForm = new URLSearchParams({ from: EMAIL_FROM, to: EMAIL_TO, subject, text }).toString();

    const resp = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyForm,
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.error('[forms-webhook] Mailgun error', resp.status, t);
      return { statusCode: 500, body: 'Email send failed' };
    }

    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('[forms-webhook] ERROR', err);
    return { statusCode: 500, body: 'Function error' };
  }
}
