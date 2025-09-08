import 'dotenv/config';
import FormData from 'form-data';
import Mailgun from 'mailgun.js';

const API_KEY = process.env.MAILGUN_API_KEY;
const DOMAIN  = process.env.MAILGUN_DOMAIN; // sandbox...
const REGION  = (process.env.MAILGUN_REGION || 'US').toUpperCase();

const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
  username: 'api',
  key: API_KEY,
  url: REGION === 'US' ? 'https://api.mailgun.net' : 'https://api.eu.mailgun.net',
});

try {
  const res = await mg.messages.create(DOMAIN, {
    from: process.env.EMAIL_FROM, // postmaster@sandbox...
    to: [process.env.EMAIL_TO],
    subject: 'Test Mailgun OK',
    text: 'Si tu reçois ce message, Mailgun fonctionne 🎉',
  });
  console.log('Mail envoyé:', res);
} catch (err) {
  console.error('Erreur Mailgun:', err);
  process.exit(1);
}
