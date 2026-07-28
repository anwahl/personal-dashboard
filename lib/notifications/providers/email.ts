/**
 * lib/notifications/providers/email.ts
 *
 * Sends a reminder email via Resend.
 *
 * Required env vars (set to activate; omit to keep provider disabled):
 *   RESEND_API_KEY     — Resend API key
 *   REMINDER_EMAIL_TO  — recipient address
 *   REMINDER_EMAIL_FROM — sender address (must be verified in Resend)
 *
 * Resend docs: https://resend.com/docs
 */

import type { NotificationPayload } from './ntfy';

export async function sendEmail(payload: NotificationPayload): Promise<void> {
  const apiKey  = process.env.RESEND_API_KEY;
  const to      = process.env.REMINDER_EMAIL_TO;
  const from    = process.env.REMINDER_EMAIL_FROM ?? 'reminders@yourdomain.com';

  if (!apiKey || !to) {
    // Not configured — skip silently
    return;
  }

  const html = `
    <p><strong>${payload.title}</strong></p>
    <p>${payload.message}</p>
    ${payload.url ? `<p><a href="${payload.url}">View task →</a></p>` : ''}
  `.trim();

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to,
      subject: payload.title,
      html,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend email failed: ${res.status} ${await res.text()}`);
  }
}
