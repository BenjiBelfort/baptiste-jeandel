// netlify/functions/forms-webhook-mailgun.mjs

function safeJSON(str, fallback = null) { try { return JSON.parse(str); } catch { return fallback; } }
function toObjectFromQS(qs) { const out = {}; for (const [k, v] of new URLSearchParams(qs)) out[k] = v; return out; }
function escapeHtml(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function escapeAttr(s){return escapeHtml(s).replace(/"/g,'&quot;')}
function splitList(s){ return (s||'').split(',').map(x=>x.trim()).filter(Boolean); }

// ---- Formatage dates / âge -------------------------------------------------
function formatDateFR(isoYYYYMMDD){
  // isoYYYYMMDD = "1977-05-12"
  const [Y,M,D] = isoYYYYMMDD.split('-').map(Number);
  const d = new Date(Y, M-1, D);
  return new Intl.DateTimeFormat('fr-FR', { day:'numeric', month:'long', year:'numeric', timeZone:'Europe/Paris' }).format(d);
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
  // Date de naissance: "12 mai 1977 - 48 ans"
  if (key === 'Date de naissance' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return `${formatDateFR(v)} - ${ageFromDOB(v)} ans`;
  }
  // Bonus: Date souhaitée → format FR
  if (key === 'Date souhaitée' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return formatDateFR(v);
  }
  return v;
}

// ---- Ordonnancement des champs --------------------------------------------
// Ordre par défaut (si pas de liste spécifique au domaine)
const DEFAULT_ORDER = [
  'Provenance','Domaine','Nom','Email','Téléphone',
  'Structure (adresse)','Code postal','Ville',
  'Message','Consentement RGPD'
];

// Ordres spécifiques par domaine (tu peux en ajouter d’autres)
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
    'Public ciblé (résident·e·s)',
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
    'Public ciblé (résident·e·s)',
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
    'Message', 'Consentement RGPD'
  ],
  'Cours de Handpan': [
    'Domaine', 'Nom', 'Email', 'Téléphone',
    'Genres / musiques écoutées', 'Écoute la plus fréquente',
    'Applis musique', 'Playlists à partager',
    'Latéralité', 'Handpanistes préférés',
    'Références réseaux sociaux (Handpan)',
    'Temps hebdomadaire disponible',
    'Message', 'Consentement RGPD'
  ],
};

function orderEntries(entries, domaineVal){
  const orderList = DOMAIN_ORDERS[domaineVal] || DEFAULT_ORDER;
  const weight = (label) => {
    const idx = orderList.indexOf(label);
    return idx === -1 ? 10_000 : idx; // inconnus à la fin
  };
  // garde ordre DOM “naturel” pour les inconnus (via index initial)
  return entries
    .map((pair, i) => ({ pair, i }))
    .sort((a,b) => {
      const wa = weight(a.pair[0]); const wb = weight(b.pair[0]);
      if (wa !== wb) return wa - wb;
      // poids égal → conserve l'ordre d'origine
      return a.i - b.i;
    })
    .map(x => x.pair);
}

// ----------------------------------------------------------------------------

export async function handler(event) {
  // Ping GET (debug)
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

  // Auth simple via token (query ou header)
  const qsToken  = event.queryStringParameters?.token || '';
  const hdrToken = event.headers?.['x-webhook-token'] || event.headers?.['X-Webhook-Token'];
  const token = qsToken || hdrToken || '';
  if (!process.env.WEBHOOK_TOKEN || token !== process.env.WEBHOOK_TOKEN) {
    return { statusCode: 401, body: 'Unauthorized (bad token)' };
  }

  try {
    // Parse body (JSON / x-www-form-urlencoded, base64 ok)
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

    // Anti-spam honeypot
    if (data['bot-field']) return { statusCode: 200, body: 'Ignored spam (honeypot).' };

    // Filtrage des champs
    const IGNORE = new Set(['form-name', 'bot-field', 'payload', 'token']);
    const DROP   = new Set(['ip', 'user_agent', 'referrer']); // masque ces champs
    let entries = Object.entries(data).filter(([k,v]) =>
      !IGNORE.has(k) && !DROP.has(k) && v != null && String(v).trim() !== ''
    );
    if (!entries.length) return { statusCode: 200, body: 'Empty after pruning; stored only.' };

    // Récup domaine (pour tri spécifique) + formatage valeurs (dates, etc.)
    const domaineVal = (entries.find(([k]) => k.toLowerCase() === 'domaine') || [,''])[1] || '';

    // Tri suivant le domaine (ou défaut)
    entries = orderEntries(entries, domaineVal);

    // Applique prettyValue sur chaque valeur (date de naissance, etc.)
    entries = entries.map(([k,v]) => [k, prettyValue(k, v)]);

    // Contenu email
    const when = new Intl.DateTimeFormat('fr-FR', { dateStyle:'medium', timeStyle:'short', timeZone:'Europe/Paris' }).format(new Date());
    const subject = `Nouveau formulaire: ${form_name}${domaineVal ? ` — ${domaineVal}` : ''} — ${when}`;

    const text = `Formulaire: ${form_name}
Site: ${site_url}
Date: ${when}

${entries.map(([k,v]) => `${k}\t${v}`).join('\n')}

— Fin —`;

    const logo = process.env.EMAIL_LOGO_URL || 'https://baptiste-j-dev.netlify.app/logos/mini-logo.webp';
    const html = `<!doctype html><meta charset="utf-8">
<div style="font:14px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;max-width:720px;margin:0">
  ${logo ? `<div style="margin:0 0 10px"><img src="${escapeAttr(logo)}" alt="Logo" style="height:36px;vertical-align:middle"></div>` : ''}
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

    // Envoi Mailgun
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

    const form = new URLSearchParams({
      from: EMAIL_FROM,
      subject,
      text,
      html,
      'o:tracking': 'no',
    });
    for (const addr of TO)  form.append('to',  addr);
    for (const addr of CC)  form.append('cc',  addr);
    for (const addr of BCC) form.append('bcc', addr);
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
