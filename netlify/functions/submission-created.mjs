// netlify/functions/submission-created.mjs
export async function handler(event) {
  // 0) Ping GET clair
  if (event.httpMethod !== 'POST' || !event.body) {
    return {
      statusCode: 200,
      body: 'submission-created alive v2 (awaiting Netlify Forms POST)',
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const { data = {}, form_name, site_url } = payload;

    // Anti-spam
    if (data['bot-field']) {
      return { statusCode: 200, body: 'Ignored spam (honeypot).' };
    }

    // Prune: garder uniquement non vides et non techniques
    const IGNORE = new Set(['form-name', 'bot-field']);
    const pruned = Object.fromEntries(
      Object.entries(data).filter(([k, v]) => !IGNORE.has(k) && v != null && String(v).trim() !== '')
    );

    const envState = {
      MAILGUN_API_KEY: !!process.env.MAILGUN_API_KEY,
      MAILGUN_DOMAIN:  !!process.env.MAILGUN_DOMAIN,
      MAILGUN_REGION:  process.env.MAILGUN_REGION || null,
      EMAIL_TO:        !!process.env.EMAIL_TO,
      EMAIL_FROM:      !!process.env.EMAIL_FROM,
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        form_name,
        site_url,
        pruned_keys: Object.keys(pruned),
        env: envState,
      }),
    };
  } catch (err) {
    console.error('submission-created DIAG ERROR:', err);
    return { statusCode: 500, body: 'Diag error' };
  }
}
