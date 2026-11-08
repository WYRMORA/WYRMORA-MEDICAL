import { randomBytes, createHash } from 'node:crypto';

export function createOpaqueToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: hashToken(token) };
}

export function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

export function isEmailDeliveryConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendAccountEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    const error = new Error('Email delivery is not configured.');
    error.status = 503;
    throw error;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from, to: [to], subject, html, text })
  });
  if (!response.ok) {
    // Do not expose provider response bodies or credentials to API clients/logs.
    const error = new Error('Email delivery failed.');
    error.status = 502;
    throw error;
  }
  return true;
}

export function buildAccountLink(path, token) {
  const base = String(process.env.PUBLIC_APP_URL || '').replace(/\/$/, '');
  if (!base || !/^https:\/\//i.test(base)) {
    const error = new Error('PUBLIC_APP_URL must be configured with an HTTPS URL.');
    error.status = 503;
    throw error;
  }
  return `${base}${path}?token=${encodeURIComponent(token)}`;
}
