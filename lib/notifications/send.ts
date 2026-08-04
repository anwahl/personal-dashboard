/**
 * lib/notifications/send.ts
 *
 * Unified notification dispatcher.
 *
 * Calls every configured provider in parallel. Individual provider
 * failures are logged but do not block other providers.
 *
 * Adding a new provider:
 *  1. Create lib/notifications/providers/myprovider.ts with a sendMyProvider()
 *  2. Import and add it to PROVIDERS below
 *  3. Wire up env vars — the provider should return early if unconfigured
 */

import { sendNtfy }   from './providers/ntfy';
import { sendEmail }  from './providers/email';
import type { NotificationPayload } from './providers/ntfy';

export type { NotificationPayload };

type Provider = (payload: NotificationPayload) => Promise<void>;

const PROVIDERS: Provider[] = [
  sendNtfy,
  sendEmail,
];

/**
 * Sends a notification through all configured providers.
 * Returns a list of any errors that occurred (empty = all succeeded).
 */
export async function sendNotification(
  payload: NotificationPayload,
): Promise<Error[]> {
  const results = await Promise.allSettled(
    PROVIDERS.map(p => p(payload))
  );

  const errors: Error[] = [];
  for (const result of results) {
    if (result.status === 'rejected') {
      errors.push(result.reason instanceof Error ? result.reason : new Error(String(result.reason)));
    }
  }
  return errors;
}
