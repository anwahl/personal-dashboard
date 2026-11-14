import { HTTPException } from 'hono/http-exception'
import { db } from '../lib/supabase.ts'

/** Active people, in their set order (for pickers such as a task's assignee). */
export async function listPeople() {
  const { data, error } = await db()
    .from('people')
    .select('id, person_name')
    .eq('is_active', true)
    .order('sort_order', { nullsFirst: false })
    .order('person_name')
  if (error) throw new HTTPException(500, { message: error.message })
  return data
}
