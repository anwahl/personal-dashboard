import { existsSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { addDays, filterGroups } from '../src/services/tasks.ts'

// env.ts caches its parse, so each app gets a fresh module graph.
async function loadApp(vars: Record<string, string> = {}) {
  vi.resetModules()
  vi.unstubAllEnvs()
  vi.stubEnv('AUTH_DISABLED', 'true')
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v)
  return (await import('../src/app.ts')).app
}

const fakeDb = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test' }

describe('validation (no database)', () => {
  it('rejects a list request without context_date or with a bad sort', async () => {
    const app = await loadApp(fakeDb)
    expect((await app.request('/api/tasks')).status).toBe(400)
    expect((await app.request('/api/tasks?context_date=2026-11-11&sort=nope')).status).toBe(400)
  })

  it('rejects a blank title (after trimming)', async () => {
    const app = await loadApp(fakeDb)
    const res = await app.request('/api/tasks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: '   ' }),
    })
    expect(res.status).toBe(400)
    expect((await res.json()).issues[0].path).toBe('title')
  })
})

describe('filterGroups', () => {
  it('builds date and status groups relative to the context date', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(
      filterGroups({ date: ['today', 'next_week'], status: ['open', 'overdue'], context_date: '2026-11-11', now: '09:30' }),
    ).toEqual([
      'due_date.lte.2026-11-11,and(due_date.gte.2026-11-12,due_date.lte.2026-11-18)',
      'status.not.in.(done,cancelled),and(status.not.in.(done,cancelled),or(due_date.lt.2026-11-11,and(due_date.eq.2026-11-11,due_time.lt.09:30)))',
    ])
  })

  it('adds a custom date or range to the date group, in order', () => {
    expect(filterGroups({ date: ['undated'], custom_from: '2026-11-20', custom_to: '2026-11-20', context_date: '2026-11-11' })).toEqual([
      'due_date.is.null,due_date.eq.2026-11-20',
    ])
    expect(filterGroups({ custom_from: '2026-11-16', custom_to: '2026-11-10', context_date: '2026-11-11' })).toEqual([
      'and(due_date.gte.2026-11-10,due_date.lte.2026-11-16)',
    ])
  })

  it('leaves out groups that have no choices', () => {
    expect(filterGroups({ date: [], context_date: '2026-11-11' })).toEqual([])
  })
})

// Against dashboard-dev; runs only when backend/.env has the service_role key.
if (existsSync('.env')) process.loadEnvFile('.env')
const hasDb = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

describe.skipIf(!hasDb)('tasks against dashboard-dev', () => {
  it('create → finish → reopen → find → delete', async () => {
    const app = await loadApp()
    const send = (path: string, method: string, body?: unknown) =>
      app.request(path, {
        method,
        headers: { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      })

    const title = `  vitest ${Date.now()}  `
    const created = await send('/api/tasks', 'POST', { title, due_date: '2026-11-11', priority: 'high' })
    expect(created.status).toBe(201)
    const task = await created.json()
    expect(task.title).toBe(title.trim())
    expect(task.completed_at).toBeNull()

    try {
      const done = await (await send(`/api/tasks/${task.id}`, 'PATCH', { status: 'done' })).json()
      expect(done.completed_at).not.toBeNull()

      const reopened = await (await send(`/api/tasks/${task.id}`, 'PATCH', { status: 'to-do' })).json()
      expect(reopened.completed_at).toBeNull()

      const q = new URLSearchParams({ context_date: '2026-11-11', q: title.trim() })
      q.append('date', 'today')
      q.append('status', 'open')
      const list = await (await app.request(`/api/tasks?${q}`)).json()
      expect(list.items.map((t: { id: number }) => t.id)).toContain(task.id)

      const tomorrow = new URLSearchParams({ context_date: '2026-11-10', q: title.trim(), date: 'today' })
      expect((await (await app.request(`/api/tasks?${tomorrow}`)).json()).total).toBe(0)
    } finally {
      expect((await send(`/api/tasks/${task.id}`, 'DELETE')).status).toBe(204)
    }
    expect((await app.request(`/api/tasks/${task.id}`)).status).toBe(404)
  })
})
