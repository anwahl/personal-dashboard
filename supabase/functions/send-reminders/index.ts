/**
 * supabase/functions/send-reminders/index.ts
 *
 * Supabase Edge Function — called by pg_cron every 15 minutes.
 *
 * Finds tasks whose reminder_at is within the next 15 minutes (or is overdue
 * by less than 1 hour), sends notifications via configured providers, and
 * stamps reminder_last_sent to prevent double-sends.
 *
 * Env vars (set in Supabase Dashboard → Settings → Edge Functions):
 *   NTFY_URL    — your ntfy server base URL
 *   NTFY_TOPIC  — ntfy topic
 *   NTFY_TOKEN  — ntfy access token (optional)
 *   APP_URL     — base URL of your dashboard (for deep-link in notification)
 *   RESEND_API_KEY, REMINDER_EMAIL_TO, REMINDER_EMAIL_FROM (optional)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TaskRow {
  id: number;
  title: string;
  body_md: string | null;
  reminder_at: string;
  snoozed_until: string | null;
  reminder_last_sent: string | null;
}

// ── ntfy sender (self-contained — no shared lib available in Edge Functions) ──

async function sendNtfy(title: string, message: string, taskId: number): Promise<void> {
  const baseUrl = Deno.env.get('NTFY_URL')?.replace(/\/$/, '');
  const topic   = Deno.env.get('NTFY_TOPIC');
  const token   = Deno.env.get('NTFY_TOKEN');
  const appUrl  = Deno.env.get('APP_URL');

  if (!baseUrl || !topic) return;

  const headers: Record<string, string> = {
    'Content-Type': 'text/plain',
    'Title':        title,
    'Priority':     '4',
    'Tags':         'bell',
  };
  if (token)  headers['Authorization'] = `Bearer ${token}`;
  if (appUrl) headers['Click']         = `${appUrl}/tasks`;

  const res = await fetch(`${baseUrl}/${topic}`, {
    method:  'POST',
    headers,
    body:    message || title,
  });
  if (!res.ok) {
    console.error(`ntfy error for task ${taskId}: ${res.status}`);
  }
}

// ── Email sender (Resend) ─────────────────────────────────────────────────────

async function sendEmail(title: string, message: string, taskId: number): Promise<void> {
  const apiKey  = Deno.env.get('RESEND_API_KEY');
  const to      = Deno.env.get('REMINDER_EMAIL_TO');
  const from    = Deno.env.get('REMINDER_EMAIL_FROM') ?? 'reminders@example.com';
  const appUrl  = Deno.env.get('APP_URL');

  if (!apiKey || !to) return;

  const html = `
    <p><strong>${title}</strong></p>
    ${message ? `<p>${message}</p>` : ''}
    ${appUrl ? `<p><a href="${appUrl}/tasks">View in dashboard →</a></p>` : ''}
  `.trim();

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to, subject: `Reminder: ${title}`, html }),
  });
  if (!res.ok) {
    console.error(`Resend error for task ${taskId}: ${res.status}`);
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (_req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    const now        = new Date();
    const windowEnd  = new Date(now.getTime() + 15 * 60_000).toISOString();  // +15 min
    const windowStart = new Date(now.getTime() - 60 * 60_000).toISOString(); // -1 hour (overdue grace)

    // Find tasks whose reminder is due, not already sent for this occurrence,
    // and not snoozed
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, body_md, reminder_at, snoozed_until, reminder_last_sent')
      .not('reminder_at', 'is', null)
      .lte('reminder_at', windowEnd)
      .gte('reminder_at', windowStart)
      // Not snoozed (or snooze has expired)
      .or(`snoozed_until.is.null,snoozed_until.lte.${now.toISOString()}`)
      .filter('reminder_last_sent', 'is', null)  // never sent for this occurrence
      ;

    if (error) throw error;

    const due = (tasks ?? []) as TaskRow[];
    console.log(`Found ${due.length} due reminder(s)`);

    for (const task of due) {
      const title   = `⏰ ${task.title}`;
      const message = task.body_md?.slice(0, 200) ?? '';

      // Send to all providers (errors logged inside each sender)
      await Promise.all([
        sendNtfy(title, message, task.id),
        sendEmail(title, message, task.id),
      ]);

      // Stamp sent time to prevent duplicate sends
      await supabase
        .from('tasks')
        .update({ reminder_last_sent: now.toISOString() })
        .eq('id', task.id);

      console.log(`Sent reminder for task ${task.id}: ${task.title}`);
    }

    return new Response(
      JSON.stringify({ sent: due.length }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('send-reminders error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
