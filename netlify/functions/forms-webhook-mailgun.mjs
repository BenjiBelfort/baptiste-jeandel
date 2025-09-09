// Fonction HTTP appelée par Netlify Forms (Outgoing webhook).
// Accepte JSON et x-www-form-urlencoded, gère base64 & "payload" stringifié.

function safeJSON(str, fallback = null) {
  try { return JSON.parse(str); } catch { return fallback; }
}
function toObjectFromQS(qs) {
  const out = {};
  for (const [k, v] of new URLSearchParams(qs)) out[k] = v;
  return out;
}

export async function handler(event) {
  // 0) Ping GET (debug simplissime)
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

  // 1) Auth simple (token en query OU header)
  const qsToken = event.queryStringParameters?.token || '';
  const hdrToken = event.headers?.['x-webhook-token'] || event.headers?.['X-Webhook-Token'];
  const token = qsToken || hdrToken || '';
  if (!process.env.WEBHOOK_TOKEN || token !== process.env.WEBHOOK_TOKEN) {
    return { statusCode: 401, body: 'Unauthorized (bad token)' };
  }

  try {
    // 2) Lecture/parse du body
    const ct = (event.headers?.['content-type'] || event.headers?.['Content-Type'] || '').toLowerCase();
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf8')
      : (event.body || '');

    let bodyObj = {};
    if (ct.includes('application/json')) {
      bodyObj = safeJSON(rawBody, {});
    } else if (ct.includes('application/x-www-form-urlencoded')) {
      bodyObj = toObjectFromQS(rawBody);
      // Mode ancien Netlify: tout est sous 'payload' (string JSON)
      if (typeof bodyObj.payload === 'string') {
        const parsed = safeJSON(bodyObj.payload, {});
        // merge "plat" (payload > bodyObj)
        bodyObj = { ...bodyObj, ...parsed };
      }
    } else {
      // inconnu : on tente JSON puis QS
      bodyObj = safeJSON(rawBody, toObjectFromQS(rawBody));
    }

    // 3) Harmonisation des champs (Netlify envoie souvent { form_name, site_url, data } ou sous "payload")
    const payload = bodyObj.payload && typeof bodyObj.payload === 'object' ? bodyObj.payload : bodyObj;
    const form_name = payload.form_name || 'inconnu';
    const site_url  = payload.site_url  || '-';
    const data      = payload.data      || payload;

    // 4) Honeypot + prune
    if (data['bot-field']) return { statusCode: 200, body: 'Ignored spam (honeypot).' };
    const IGNORE = new Set(['form-name', 'bot-field', 'payload', 'token']);
    const entries = Object.entries(data).filter(
      ([k, v]) => !IGNORE.has(k) && v != null && String(v).trim() !== ''
    );
    if (!entries.length) return { statusCode: 200, body: 'Empty after pruning; stored only.' };

    // 5) Mise en forme (ordre sympa en tête)
    const when = new Intl.DateTimeFormat('fr-FR', {
      dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Paris'
    }).format(new Date());

    const FIELD_ORDER = ['Provenance','Domaine','Nom','Email','Téléphone','Message'];
    const ord = k => { const i = FIELD_ORDER.indexOf(k); return i === -1 ? 9999 : i; };
    entries.sort((a, b) => {
      const ai = ord(a[0]), bi = ord(b[0]);
      return ai !== bi ? ai - bi : a[0].localeCompare(b[0]);
    });

    const lines = entries.map(([k, v]) => `• ${k}: ${v}`);
    const subject = `Nouveau formulaire: ${form_name} — ${when}`;
    const text =
`Formulaire: ${form_name}
Site: ${site_url}
Date: ${when}

Champs remplis:
${lines.join('\n')}

— Fin —`;

    // 6) Envoi Mailgun (HTTP direct)
    const DOMAIN = process.env.MAILGUN_DOMAIN;
    const API_KEY = process.env.MAILGUN_API_KEY;
    const REGION  = (process.env.MAILGUN_REGION || 'US').toUpperCase();
    const EMAIL_TO = process.env.EMAIL_TO;
    const EMAIL_FROM = process.env.EMAIL_FROM || `Mailgun Sandbox <postmaster@${DOMAIN}>`;

    if (!DOMAIN || !API_KEY || !EMAIL_TO) {
      console.error('[forms-webhook] Missing env vars', { DOMAIN, API_KEY: !!API_KEY, EMAIL_TO });
      return { statusCode: 500, body: 'Mailgun not configured' };
    }

    const API_BASE = REGION === 'US' ? 'https://api.mailgun.net' : 'https://api.eu.mailgun.net';
    const url = `${API_BASE}/v3/${DOMAIN}/messages`;
    const auth = Buffer.from(`api:${API_KEY}`).toString('base64');
    const bodyForm = new URLSearchParams({ from: EMAIL_FROM, to: EMAIL_TO, subject, text }).toString();

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
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
