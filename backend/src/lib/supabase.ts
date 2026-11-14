import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types.ts'
import { getEnv } from './env.ts'

export type Db = SupabaseClient<Database>

let client: Db | undefined

/** Server-only client. The service_role key bypasses RLS, so it must never reach the browser. */
export function db(): Db {
  if (client) return client
  const env = getEnv()
  client = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return client
}
