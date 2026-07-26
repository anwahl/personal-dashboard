"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Use this client in Client Components and client-side hooks.
 *
 * Note: We skip the Database generic here because Supabase's GenericSchema
 * constraint is strict and requires generated types to satisfy it fully.
 * Type safety is handled in lib/db/* query helpers instead.
 * Once you run `supabase gen types typescript`, you can re-add the generic.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
