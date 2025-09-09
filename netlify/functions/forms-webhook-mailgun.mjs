// netlify/functions/forms-webhook-mailgun.mjs

function safeJSON(str, fallback = null) { try { return JSON.parse(str); } catch { return fallback; } }
function toObjectFromQS(qs) { const out = {}; for (const [k, v] of new URLSearchParams(qs)) out[k] = v; return out; }
function escapeHtml(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function escapeAttr(s){return escapeHtml(s).replace(/"/g,'&quot;')}

export async function handler(event) {
  // Ping GET
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200, headers: { 'Content-Type': 'application/json' },
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

  // Auth par token (query ou header)
  const qsToken  = event.queryStringParameters?.token || '';
  const hdrToken = event.headers?.['x-webhook-token'] || event.headers?.['X-Webhook-Token'];
  const token = qsToken || hdrToken || '';
  if (!process.env.WEBHOOK_TOKEN || token !== process.env.WEBHOOK_TOKEN) {
    return { statusCode: 401, body: 'Unauthorized (bad token)' };
  }

  try {
    // Parse body (JSON + urlencoded, base64 ok)
    const ct = (event.headers?.['content-type'] || event.headers?.['Content-Type'] || '').toLowerCase();
    const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '');

    let bodyObj = {};
    if (ct.includes('application/json')) {
      bodyObj = safeJSON(raw, {});
    } else if (ct.includes('application/x-www-form-urlencoded')) {
      bodyObj = toObjectFromQS(raw);
      if (typeof bodyObj.payload === 'string') bodyObj = { ...bodyObj, ...safeJSON(bodyObj.payload, {}) };
    } else {
      bodyObj = safeJSON(raw, toObjectFromQS(raw)); // best effort
    }

    const payload   = bodyObj.payload && typeof bodyObj.payload === 'object' ? bodyObj.payload : bodyObj;
    const form_name = payload.form_name || 'inconnu';
    const site_url  = payload.site_url  || '-';
    const data      = payload.data      || payload;

    // Filtrage
    if (data['bot-field']) return { statusCode: 200, body: 'Ignored spam (honeypot).' };
    const IGNORE = new Set(['form-name', 'bot-field', 'payload', 'token']);
    const DROP   = new Set(['ip', 'user_agent', 'referrer']); // 👈 champs à masquer
    let entries = Object.entries(data).filter(([k,v]) =>
      !IGNORE.has(k) && !DROP.has(k) && v != null && String(v).trim() !== ''
    );
    if (!entries.length) return { statusCode: 200, body: 'Empty after pruning; stored only.' };

    // Ordre sympa
    const FIELD_ORDER = ['Provenance','Domaine','Nom','Email','Téléphone','Message'];
    const ord = k => { const i = FIELD_ORDER.indexOf(k); return i === -1 ? 9999 : i; };
    entries.sort((a,b) => { const ai=ord(a[0]), bi=ord(b[0]); return ai!==bi ? ai-bi : a[0].localeCompare(b[0]); });

    // Contenu email
    const when = new Intl.DateTimeFormat('fr-FR', { dateStyle:'medium', timeStyle:'short', timeZone:'Europe/Paris' }).format(new Date());
    const text = `Formulaire: ${form_name}
Site: ${site_url}
Date: ${when}

Champs remplis:
${entries.map(([k,v]) => `• ${k}: ${v}`).join('\n')}

— Fin —`;

    const logo = ''; // ex: 'https://baptistejeandel.fr/logo-email.png'
    const html = `<!doctype html><meta charset="utf-8">
<div style="font:14px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;max-width:720px;margin:0">
  ${logo ? `<div style="margin:0 0 10px"><img src="${escapeAttr(logo)}" alt="Baptiste Jeandel" style="height:36px;vertical-align:middle"></div>` : ''}
  <h2 style="margin:0 0 8px">Nouveau formulaire: ${escapeHtml(form_name)}</h2>
  <p style="margin:0 0 14px;color:#555">
    <strong>Site:</strong> <a href="${escapeAttr(site_url)}">${escapeHtml(site_url)}</a><br>
    <strong>Date:</strong> ${escapeHtml(when)}
  </p>
  <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;border:1px solid #eee;width:100%">
    ${entries.map(([k,v]) => `
      <tr>
        <td style="border:1px solid #eee;background:#fafafa;width:34%"><strong>${escapeHtml(k)}</strong></td>
        <td style="border:1px solid #eee">${escapeHtml(String(v))}</td>
      </tr>`).join('')}
  </table>
  <p style="color:#777;margin-top:12px">— Fin —</p>
</div>`;

    // Reply-To = email saisi (si présent)
    const replyTo = (entries.find(([k]) => k.toLowerCase() === 'email') || [,''])[1] || '';

    // Envoi Mailgun (EU)
    const DOMAIN = process.env.MAILGUN_DOMAIN;
    const API_KEY = process.env.MAILGUN_API_KEY;
    const REGION  = (process.env.MAILGUN_REGION || 'EU').toUpperCase();
    const EMAIL_TO = process.env.EMAIL_TO;
    const EMAIL_FROM = process.env.EMAIL_FROM || `Formulaire <postmaster@${DOMAIN}>`;
    if (!DOMAIN || !API_KEY || !EMAIL_TO) return { statusCode: 500, body: 'Mailgun not configured' };

    const API_BASE = REGION === 'US' ? 'https://api.mailgun.net' : 'https://api.eu.mailgun.net';
    const url  = `${API_BASE}/v3/${DOMAIN}/messages`;
    const auth = Buffer.from(`api:${API_KEY}`).toString('base64');

    const form = new URLSearchParams({
      from: EMAIL_FROM,
      to:   EMAIL_TO,
      subject: `Nouveau formulaire: ${form_name} — ${when}`,
      text,
      html,
      'o:tracking': 'no', // optionnel: coupe le tracking pour une délivrabilité max
    });
    if (replyTo) form.append('h:Reply-To', replyTo);

    const resp = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
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
