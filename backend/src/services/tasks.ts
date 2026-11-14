import type { PostgrestError } from '@supabase/supabase-js'
import { HTTPException } from 'hono/http-exception'
import { db } from '../lib/supabase.ts'
import {
  FINISHED,
  type TaskCreate,
  type TaskListQuery,
  type TaskStatus,
  type TaskUpdate,
} from '../schemas/tasks.ts'

const TASK_SELECT =
  'id, title, status, priority, due_date, due_time, body_md, completed_at, created_at, updated_at, recurrence_frequency, person:people(id, person_name)'

const FINISHED_LIST = `(${FINISHED.join(',')})`
const OPEN = `status.not.in.${FINISHED_LIST}`

export function isFinished(status: TaskStatus) {
  return (FINISHED as readonly TaskStatus[]).includes(status)
}

function fail(error: PostgrestError): never {
  if (error.code === '23503') throw new HTTPException(400, { message: 'unknown person' })
  throw new HTTPException(500, { message: error.message })
}

function notFound(): never {
  throw new HTTPException(404, { message: 'task not found' })
}

/** YYYY-MM-DD plus n days (calendar math only, no time zones involved). */
export function addDays(isoDate: string, n: number) {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/**
 * PostgREST `or=(…)` expressions, one per filter group. Each group ORs its
 * choices; separate `or` params are AND'd by PostgREST. Only validated dates,
 * times and enum values go into these strings, never free text.
 */
export function filterGroups(
  q: Pick<TaskListQuery, 'date' | 'status' | 'context_date' | 'now' | 'custom_from' | 'custom_to'>,
) {
  const ctx = q.context_date
  const groups: string[] = []

  const custom = customRange(q.custom_from, q.custom_to)
  if (q.date?.length || custom) {
    const parts = (q.date ?? []).map((f) => {
      switch (f) {
        case 'today':
          return `due_date.lte.${ctx}`
        case 'tomorrow':
          return `due_date.eq.${addDays(ctx, 1)}`
        case 'next_week':
          return `and(due_date.gte.${addDays(ctx, 1)},due_date.lte.${addDays(ctx, 7)})`
        case 'undated':
          return 'due_date.is.null'
      }
    })
    if (custom) parts.push(custom)
    groups.push(parts.join(','))
  }

  if (q.status?.length) {
    const late = q.now
      ? `or(due_date.lt.${ctx},and(due_date.eq.${ctx},due_time.lt.${q.now}))`
      : `due_date.lt.${ctx}`
    const parts = q.status.map((f) => {
      switch (f) {
        case 'open':
          return OPEN
        case 'overdue':
          return `and(${OPEN},${late})`
        case 'done':
        case 'cancelled':
          return `status.eq.${f}`
      }
    })
    groups.push(parts.join(','))
  }

  return groups
}

/** A due-date range as one PostgREST condition; either end may be open. Swapped ends are put in order. */
function customRange(from?: string, to?: string) {
  if (from && to && from > to) [from, to] = [to, from]
  if (from && to) return from === to ? `due_date.eq.${from}` : `and(due_date.gte.${from},due_date.lte.${to})`
  if (from) return `due_date.gte.${from}`
  if (to) return `due_date.lte.${to}`
  return null
}

/** Natural direction of each sort, used when the request doesn't give one. */
const DEFAULT_DIR = { due: 'asc', priority: 'desc', created: 'desc', title: 'asc' } as const

/** `%`, `_` and `\` are LIKE wildcards/escape; match them literally. */
function likeEscape(s: string) {
  return s.replace(/[\\%_]/g, (m) => `\\${m}`)
}

export async function listTasks(q: TaskListQuery) {
  let query = db().from('tasks').select(TASK_SELECT, { count: 'exact' })

  for (const group of filterGroups(q)) query = query.or(group)
  if (q.priority?.length) query = query.in('priority', q.priority)
  if (q.q) query = query.ilike('title', `%${likeEscape(q.q)}%`)
  if (q.search_from || q.search_to) {
    let [from, to] = [q.search_from, q.search_to]
    if (from && to && from > to) [from, to] = [to, from]
    if (from) query = query.gte('due_date', from)
    if (to) query = query.lte('due_date', to)
  }

  const ascending = (q.dir ?? DEFAULT_DIR[q.sort]) === 'asc'
  // Undated (null) always last, whichever way the list runs.
  const dir = { ascending, nullsFirst: false }
  // Secondary ordering stays "soonest due first" so ties read naturally.
  const soonest = { ascending: true, nullsFirst: false }
  switch (q.sort) {
    case 'due':
      query = query.order('due_date', dir).order('due_time', dir)
      break
    case 'priority': // enum order is low < medium < high
      query = query.order('priority', dir).order('due_date', soonest).order('due_time', soonest)
      break
    case 'created':
      query = query.order('created_at', dir)
      break
    case 'title':
      query = query.order('title', { ascending })
      break
  }
  // Tiebreak so offset paging never repeats or skips a row.
  query = query.order('id', { ascending })

  const { data, count, error } = await query.range(q.offset, q.offset + q.limit - 1)
  if (error) fail(error)
  return { items: data, total: count ?? 0 }
}

export async function getTask(id: number) {
  const { data, error } = await db().from('tasks').select(TASK_SELECT).eq('id', id).maybeSingle()
  if (error) fail(error)
  return data ?? notFound()
}

export async function createTask(input: TaskCreate) {
  if (input.due_time && !input.due_date) {
    throw new HTTPException(400, { message: 'due_time needs a due_date' })
  }
  const completed_at = input.status && isFinished(input.status) ? new Date().toISOString() : null
  const { data, error } = await db()
    .from('tasks')
    .insert({ ...input, completed_at })
    .select(TASK_SELECT)
    .single()
  if (error) fail(error)
  return data
}

export async function updateTask(id: number, patch: TaskUpdate) {
  const { data: current, error: readError } = await db()
    .from('tasks')
    .select('status, completed_at, due_date, due_time')
    .eq('id', id)
    .maybeSingle()
  if (readError) fail(readError)
  if (!current) notFound()

  const row: TaskUpdate & { completed_at?: string | null } = { ...patch }
  // Clearing the date clears its time too.
  if (patch.due_date === null && patch.due_time === undefined) row.due_time = null

  const dueDate = row.due_date !== undefined ? row.due_date : current.due_date
  const dueTime = row.due_time !== undefined ? row.due_time : current.due_time
  if (dueTime && !dueDate) throw new HTTPException(400, { message: 'due_time needs a due_date' })

  // completed_at follows status into and out of the finished set.
  if (patch.status) {
    if (!isFinished(patch.status)) row.completed_at = null
    else if (!isFinished(current.status) || !current.completed_at) row.completed_at = new Date().toISOString()
  }

  if (Object.keys(row).length === 0) return getTask(id)

  const { data, error } = await db().from('tasks').update(row).eq('id', id).select(TASK_SELECT).maybeSingle()
  if (error) fail(error)
  return data ?? notFound()
}

export async function deleteTask(id: number) {
  const { data, error } = await db().from('tasks').delete().eq('id', id).select('id')
  if (error) fail(error)
  if (data.length === 0) notFound()
}
