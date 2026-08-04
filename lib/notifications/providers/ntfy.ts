/**
 * lib/notifications/providers/ntfy.ts
 *
 * Sends a notification to a self-hosted or cloud ntfy server.
 *
 * Required env vars:
 *   NTFY_URL    — base URL of your ntfy instance, e.g. https://ntfy.yourdomain.com
 *   NTFY_TOPIC  — topic to publish to, e.g. "reminders"
 *   NTFY_TOKEN  — access token if your server requires auth (optional)
 *
 * ntfy docs: https://docs.ntfy.sh/publish/
 */

export interface NotificationPayload {
  title:   string;
  message: string;
  /** Optional deep-link back to the task in the app */
  url?:    string;
  /** Optional ntfy priority: 1=min, 2=low, 3=default, 4=high, 5=max */
  priority?: 1 | 2 | 3 | 4 | 5;
  /** Optional comma-separated ntfy tags / emoji shortcodes */
  tags?: string;
}

export async function sendNtfy(payload: NotificationPayload): Promise<void> {
  const baseUrl = process.env.NTFY_URL?.replace(/\/$/, '');
  const topic   = process.env.NTFY_TOPIC;
  const token   = process.env.NTFY_TOKEN;

  if (!baseUrl || !topic) {
    // Not configured — skip silently (provider is optional)
    return;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'text/plain',
    'Title':        payload.title,
    'Priority':     String(payload.priority ?? 3),
  };

  if (token)        headers['Authorization'] = `Bearer ${token}`;
  if (payload.url)  headers['Click']         = payload.url;
  if (payload.tags) headers['Tags']          = payload.tags;

  const res = await fetch(`${baseUrl}/${topic}`, {
    method:  'POST',
    headers,
    body:    payload.message,
  });

  if (!res.ok) {
    throw new Error(`ntfy publish failed: ${res.status} ${await res.text()}`);
  }
}
