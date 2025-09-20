

function safeJSON(str, fallback = null) { try { return JSON.parse(str); } catch { return fallback; } }
function toObjectFromQS(qs) { const out = {}; for (const [k, v] of new URLSearchParams(qs)) out[k] = v; return out; }
function escapeHtml(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function escapeAttr(s){return escapeHtml(s).replace(/"/g,'&quot;')}
function splitList(s){ return (s||'').split(',').map(x=>x.trim()).filter(Boolean); }
function isValidEmail(s){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s||'').trim()); }

const SITE_URL = 'https://www.baptistejeandel.fr/';
const SOCIALS_HTML = `
<p style="margin:12px 0 0">
  Nous suivre :
  <a href="https://www.youtube.com/@baptistejeandel" target="_blank" rel="noopener">YouTube</a>
  <a href="https://www.facebook.com/profile.php?id=100076213966457" target="_blank" rel="noopener">Facebook</a> ·
  <a href="https://www.instagram.com/baptiste_jeandel_pro?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener">Instagram</a> ·
</p>`;

function formatDateFR(isoYYYYMMDD){
  const [Y,M,D] = isoYYYYMMDD.split('-').map(Number);
  const d = new Date(Y, M-1, D);
  return new Intl.DateTimeFormat('fr-FR', { day:'numeric', month:'long', year:'numeric', timeZone:'Europe/Paris' }).format(d);
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function formatDateFRShort(isoYYYYMMDD){
  const [Y,M,D] = isoYYYYMMDD.split('-').map(Number);
  const d = new Date(Y, M-1, D);
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function ageFromDOB(isoYYYYMMDD){
  const [y,m,d] = isoYYYYMMDD.split('-').map(Number);
  const today = new Date();
  let age = today.getFullYear() - y;
  const mm = today.getMonth() + 1;
  const dd = today.getDate();
  if (mm < m || (mm === m && dd < d)) age--;
  return age;
}
function prettyValue(key, val){
  if (typeof val !== 'string') return val;
  const v = val.trim();

  if (ISO_DATE_RE.test(v)) {
    const wantsShort = [
      'Date', 'Date de l’événement', 'Date événement', 'Date session',
      'Date souhaitée', 'Date de naissance'
    ].some(lbl => lbl.toLowerCase() === key.toLowerCase());

    if (key === 'Date de naissance') {
      return `${formatDateFRShort(v)} - ${ageFromDOB(v)} ans`;
    }

    return wantsShort ? formatDateFRShort(v) : formatDateFR(v);
  }

  return v;
}


const DEFAULT_ORDER = [
  'Provenance','Domaine','Nom','Email','Téléphone',
  'Structure (adresse)','Code postal','Ville',
  'Message','Consentement RGPD'
];

const DOMAIN_ORDERS = {
  'Éveil Musical': [
    'Domaine', 'Nom', 'Email', 'Téléphone',
    'Structure (adresse)', 'Code postal', 'Ville',
    'Type de demande (éveil)',
    'Fréquence (éveil)', 'Fréquence (précision)',
    'Âge des enfants', 'Nombre de participants',
    'Lieu', 'Date souhaitée',
    'Message', 'Consentement RGPD'
  ],
  'Musicothérapie': [
    'Domaine', 'Nom', 'Email', 'Téléphone',
    'Structure (adresse)', 'Code postal', 'Ville',
    'Type de musicothérapie', 'Niveau de dépendance (active/les deux)',
    'Matériel sur place (précisions)',
    'Fréquence (musicothérapie)', 'Fréquence (précision)',
    'Public ciblé', 'Séances individuelles (précisions)',
    'Message', 'Consentement RGPD'
  ],
  'Relaxations Sonores': [
    'Domaine', 'Nom', 'Email', 'Téléphone',
    'Structure (adresse)', 'Code postal', 'Ville',
    'Nombre de participants', 'Date', 'Horaire',
    'Message', 'Consentement RGPD'
  ],
  'Spectacles': [
    'Domaine', 'Nom', 'Email', 'Téléphone',
    'Nombre de personnes',
    'Accompagnement enfants', 'Accompagnement (précision)',
    'Âges des enfants',
    'Adresse (lieu du spectacle)',
    'Date souhaitée', 'Heure de début',
    'Message', 'Consentement RGPD'
  ],
  'Concert Handpan': [
    'Domaine', 'Nom', 'Email', 'Téléphone',
    'Nombre de personnes',
    'Type d’événement', 'Événement (précision)',
    'Adresse (lieu du concert)',
    'Date de l’événement', 'Horaire',
    'Message', 'Consentement RGPD'
  ],
  'Archives Sonores': [
    'Domaine', 'Nom', 'Email', 'Téléphone',
    'Bénéficiaire (Prénom Nom)', 'Lien avec la personne',
    'Déjà parlé à la personne ?', 'Supports disponibles',
    'Durée imaginée (minutes)',
    'Adresse (lieu de l’enregistrement)',
    'Préférence jour', 'Préférence horaire',
    'Message', 'Consentement RGPD'
  ],
  'Formation EHPAD': [
    'Domaine', 'Nom', 'Email', 'Téléphone',
    'Structure (adresse)', 'Code postal', 'Ville',
    'Nombre de personnes intéressées', 'Profil des apprenant(e)s',
    'Matériel sur place (précisions)',
    'Public ciblé (résident(e)s)',
    'Niveau de dépendance (GIR)', 'Modalité de travail souhaitée',
    'Message', 'Consentement RGPD'
  ],
  'Formation Petite Enfance': [
    'Domaine', 'Nom', 'Email', 'Téléphone',
    'Structure', 'Code postal', 'Ville',
    'Nombre de personnes intéressées', 'Profil des apprenant(e)s',
    'Matériel sur place (précisions)', 'Thématiques à renforcer',
    'Message', 'Consentement RGPD'
  ],
  'Formation Handpan': [
    'Domaine', 'Nom', 'Email', 'Téléphone',
    'Structure (adresse)', 'Code postal', 'Ville',
    'Nombre de personnes intéressées', 'Profil des apprenant(e)s',
    'Matériel sur place (précisions)',
    'Public ciblé (résident(e)s)',
    'Niveau de dépendance (GIR)', 'Modalité de travail souhaitée',
    'Message', 'Consentement RGPD'
  ],
  'Cours de Batterie': [
    'Domaine', 'Nom', 'Email', 'Téléphone',
    'Date de naissance', 'Niveau (cours)', 'Instrument à la maison',
    'Genres / musiques écoutées', 'Écoute la plus fréquente',
    'Applis musique', 'Playlists à partager',
    'Latéralité', 'Morceaux rêvés', 'Batteurs préférés',
    'Références réseaux sociaux (Batterie)',
    'Temps hebdomadaire disponible',
    'Préférence jour', 'Préférence horaire',
    'Message', 'Consentement RGPD'
  ],
  'Cours de Handpan': [
    'Domaine', 'Nom', 'Email', 'Téléphone',
    'Genres / musiques écoutées', 'Écoute la plus fréquente',
    'Applis musique', 'Playlists à partager',
    'Latéralité', 'Handpanistes préférés',
    'Références réseaux sociaux (Handpan)',
    'Temps hebdomadaire disponible',
    'Préférence jour', 'Préférence horaire',
    'Message', 'Consentement RGPD'
  ],
};

function orderEntries(entries, domaineVal){
  const orderList = DOMAIN_ORDERS[domaineVal] || DEFAULT_ORDER;
  const weight = (label) => {
    const idx = orderList.indexOf(label);
    return idx === -1 ? 10_000 : idx;
  };
  return entries
    .map((pair, i) => ({ pair, i }))
    .sort((a,b) => {
      const wa = weight(a.pair[0]); const wb = weight(b.pair[0]);
      if (wa !== wb) return wa - wb;
      return a.i - b.i;
    })
    .map(x => x.pair);
}

// ----------------------------------------------------------------------------

export async function handler(event) {
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
          EMAIL_CC:        !!process.env.EMAIL_CC,
          EMAIL_BCC:       !!process.env.EMAIL_BCC,
          EMAIL_LOGO_URL:  !!process.env.EMAIL_LOGO_URL,
          WEBHOOK_TOKEN:   !!process.env.WEBHOOK_TOKEN,
        },
      }),
    };
  }

  const qsToken  = event.queryStringParameters?.token || '';
  const hdrToken = event.headers?.['x-webhook-token'] || event.headers?.['X-Webhook-Token'];
  const token = qsToken || hdrToken || '';
  if (!process.env.WEBHOOK_TOKEN || token !== process.env.WEBHOOK_TOKEN) {
    return { statusCode: 401, body: 'Unauthorized (bad token)' };
  }

  try {
    const ct = (event.headers?.['content-type'] || event.headers?.['Content-Type'] || '').toLowerCase();
    const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '');

    let bodyObj = {};
    if (ct.includes('application/json')) {
      bodyObj = safeJSON(raw, {});
    } else if (ct.includes('application/x-www-form-urlencoded')) {
      bodyObj = toObjectFromQS(raw);
      if (typeof bodyObj.payload === 'string') bodyObj = { ...bodyObj, ...safeJSON(bodyObj.payload, {}) };
    } else {
      bodyObj = safeJSON(raw, toObjectFromQS(raw));
    }

    const payload   = bodyObj.payload && typeof bodyObj.payload === 'object' ? bodyObj.payload : bodyObj;
    const form_name = payload.form_name || 'inconnu';
    const site_url  = payload.site_url || SITE_URL || '-';
    const data      = payload.data      || payload;

    if (data['bot-field']) return { statusCode: 200, body: 'Ignored spam (honeypot).' };

    const IGNORE = new Set(['form-name', 'bot-field', 'payload', 'token']);
    const DROP   = new Set(['ip', 'user_agent', 'referrer']);
    let entries = Object.entries(data).filter(([k,v]) =>
      !IGNORE.has(k) && !DROP.has(k) && !k.startsWith('_') && v != null && String(v).trim() !== ''
    );
    if (!entries.length) return { statusCode: 200, body: 'Empty after pruning; stored only.' };

    const domaineVal = (entries.find(([k]) => k.toLowerCase() === 'domaine') || [,''])[1] || '';
    entries = orderEntries(entries, domaineVal);
    entries = entries.map(([k,v]) => [k, prettyValue(k, v)]);

    const when = new Intl.DateTimeFormat('fr-FR', { dateStyle:'medium', timeStyle:'short', timeZone:'Europe/Paris' }).format(new Date());
    const adminSubject = `Nouveau contact pour Baptiste${domaineVal ? ` — ${domaineVal}` : ''} — ${when}`;

    const text = `Formulaire: ${form_name}
Site: ${site_url}
Date: ${when}

${entries.map(([k,v]) => `${k}\t${v}`).join('\n')}

— Fin —`;

    const logo = process.env.EMAIL_LOGO_URL || 'https://www.baptistejeandel.fr/logos/mini-logo.webp';
    const tableRowsHtml = entries.map(([k,v]) => `
      <tr>
        <td style="border:1px solid #eee;background:#fafafa;width:34%"><strong>${escapeHtml(k)}</strong></td>
        <td style="border:1px solid #eee">${escapeHtml(String(v))}</td>
      </tr>`).join('');

    const html = `<!doctype html><meta charset="utf-8">
<div style="font:14px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;max-width:720px;margin:0">
  ${logo ? `<div style="margin:0 0 10px"><img src="${escapeAttr(logo)}" alt="Logo" style="height:36px;vertical-align:middle"></div>` : ''}
  <h2 style="margin:0 0 8px">Nouveau contact : ${escapeHtml(domaineVal)}</h2>
  <p style="margin:0 0 14px;color:#555">
    <strong>Site:</strong> <a href="${escapeAttr(site_url)}">${escapeHtml(site_url)}</a><br>
    <strong>Date:</strong> ${escapeHtml(when)}
  </p>
  <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;border:1px solid #eee;width:100%">
    ${tableRowsHtml}
  </table>
  <p style="color:#777;margin-top:12px">— Fin —</p>
</div>`;

    const submitterEmail = (entries.find(([k]) => k.toLowerCase() === 'email') || [,''])[1] || '';

    const DOMAIN = process.env.MAILGUN_DOMAIN;
    const API_KEY = process.env.MAILGUN_API_KEY;
    const REGION  = (process.env.MAILGUN_REGION || 'EU').toUpperCase();
    const EMAIL_FROM = process.env.EMAIL_FROM || `Formulaire <postmaster@${DOMAIN}>`;

    const TO  = splitList(process.env.EMAIL_TO);
    const CC  = splitList(process.env.EMAIL_CC);
    const BCC = splitList(process.env.EMAIL_BCC);

    if (!DOMAIN || !API_KEY || TO.length === 0) {
      console.error('[forms-webhook] Missing config', { DOMAIN: !!DOMAIN, API_KEY: !!API_KEY, TO_count: TO.length });
      return { statusCode: 500, body: 'Mailgun not configured' };
    }

    const API_BASE = REGION === 'US' ? 'https://api.mailgun.net' : 'https://api.eu.mailgun.net';
    const url  = `${API_BASE}/v3/${DOMAIN}/messages`;
    const auth = Buffer.from(`api:${API_KEY}`).toString('base64');

    const formAdmin = new URLSearchParams({
      from: EMAIL_FROM,
      subject: adminSubject,
      text,
      html,
      'o:tracking': 'no',
    });
    for (const addr of TO)  formAdmin.append('to',  addr);
    for (const addr of CC)  formAdmin.append('cc',  addr);
    for (const addr of BCC) formAdmin.append('bcc', addr);
    if (isValidEmail(submitterEmail)) formAdmin.append('h:Reply-To', submitterEmail);

    const respAdmin = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formAdmin.toString(),
    });

    if (!respAdmin.ok) {
      const t = await respAdmin.text();
      console.error('[forms-webhook] Mailgun error (admin)', respAdmin.status, t);
      return { statusCode: 500, body: 'Email send failed' };
    }

    if (isValidEmail(submitterEmail)) {
      const name = (entries.find(([k]) => k.toLowerCase() === 'nom') || [,''])[1] || '';
      const politeName = String(name || '').trim() || 'Bonjour';

      const userSubject = `Merci — nous avons bien reçu votre demande${domaineVal ? ` (${domaineVal})` : ''}`;
      const userText = 
`${politeName},

Merci pour votre message — nous revenons vers vous très vite.
Récapitulatif de votre demande :
${entries.map(([k,v]) => `- ${k}: ${String(v).replace(/\s+/g,' ').slice(0,500)}`).join('\n')}

En attendant, vous pouvez visiter : ${SITE_URL}
Bien cordialement,
L'équipe Baptiste Jeandel
`;

      const userHtml = `<!doctype html><meta charset="utf-8">
<div style="font:14px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;max-width:720px;margin:0">
  ${logo ? `<div style="margin:0 0 10px"><img src="${escapeAttr(logo)}" alt="Logo" style="height:36px;vertical-align:middle"></div>` : ''}
  <h2 style="margin:0 0 8px">${escapeHtml(politeName)}, merci !</h2>
  <p style="margin:0 0 10px">Nous avons bien reçu votre demande${domaineVal ? ` <strong>(${escapeHtml(domaineVal)})</strong>` : ''}.<br>
  Nous revenons vers vous très vite. Voici un récapitulatif :</p>
  <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;border:1px solid #eee;width:100%">
    ${tableRowsHtml}
  </table>
  <p style="margin-top:14px">👉 <a href="${escapeAttr(SITE_URL)}">Visiter le site</a></p>
  ${SOCIALS_HTML}
  <p style="color:#777;margin-top:12px">Si vous répondez à ce message, votre réponse sera envoyée à notre adresse professionnelle (et pas au postmaster).</p>
</div>`;

      const replyToPro = [...TO, ...CC].filter(Boolean).join(', ');

      const formUser = new URLSearchParams({
        from: EMAIL_FROM,
        to: submitterEmail,
        subject: userSubject,
        text: userText,
        html: userHtml,
        'o:tracking': 'no',
        'h:Reply-To': replyToPro,
      });

      const respUser = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formUser.toString(),
      });

      if (!respUser.ok) {
        const tu = await respUser.text();
        console.error('[forms-webhook] Mailgun error (user ack)', respUser.status, tu);
      }
    }

    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('[forms-webhook] ERROR', err);
    return { statusCode: 500, body: 'Function error' };
  }
}
