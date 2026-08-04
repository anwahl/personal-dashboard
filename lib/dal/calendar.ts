/**
 * lib/dal/calendar.ts
 *
 * Calendar token management for the iCal feed URL.
 * The app keeps exactly one token row; regenerating it invalidates
 * any existing calendar subscriptions.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CalendarTokenRow } from '@/types/schema';

type Client = SupabaseClient;

/** Returns the current calendar token, or null if none exists yet. */
export async function getCalendarToken(client: Client): Promise<CalendarTokenRow | null> {
  const { data, error } = await client
    .from('calendar_tokens')
    .select('*')
    .order('id')
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getCalendarToken: ${error.message}`);
  return data ?? null;
}

/**
 * Deletes the existing token and inserts a fresh one.
 * All existing iCal subscriptions using the old URL will stop working.
 */
export async function regenerateCalendarToken(client: Client): Promise<CalendarTokenRow> {
  // Delete all (there should only ever be one)
  const { error: delErr } = await client.from('calendar_tokens').delete().neq('id', 0);
  if (delErr) throw new Error(`regenerateCalendarToken (delete): ${delErr.message}`);

  const { data, error } = await client
    .from('calendar_tokens')
    .insert({})
    .select()
    .single();
  if (error) throw new Error(`regenerateCalendarToken (insert): ${error.message}`);
  return data;
}
