import { beforeEach, describe, expect, it, vi } from 'vitest'

// env.ts caches its parse, so each mode gets a fresh module graph.
async function loadApp(vars: Record<string, string>) {
  vi.resetModules()
  vi.unstubAllEnvs()
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test')
  for (const [k, v] of Object.entries(vars)) vi.stubEnv(k, v)
  return (await import('../src/app.ts')).app
}

describe('auth disabled', () => {
  let app: Awaited<ReturnType<typeof loadApp>>
  beforeEach(async () => {
    app = await loadApp({ AUTH_DISABLED: 'true' })
  })

  it('serves /api/me as the dev user', async () => {
    const res = await app.request('/api/me')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ sub: 'dev', email: 'dev@localhost' })
  })

  it('login skips Authelia and only follows same-origin next', async () => {
    expect((await app.request('/auth/login?next=/tasks')).headers.get('location')).toBe('/tasks')
    expect((await app.request('/auth/login?next=//evil.example')).headers.get('location')).toBe('/')
  })

  it('publishes the OpenAPI document', async () => {
    const doc = await (await app.request('/openapi.json')).json()
    expect(doc.openapi).toBe('3.1.0')
    expect(doc.paths).toHaveProperty('/api/me')
  })

  it('returns JSON 404s', async () => {
    const res = await app.request('/api/nope')
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'not found' })
  })
})

describe('auth enabled', () => {
  it('answers /api/* with 401, not a redirect', async () => {
    const app = await loadApp({
      AUTH_DISABLED: 'false',
      OIDC_ISSUER: 'https://auth.example.com',
      OIDC_CLIENT_ID: 'homeport',
      OIDC_CLIENT_SECRET: 'secret',
      OIDC_AUTH_SECRET: 'x'.repeat(32),
      OIDC_REDIRECT_URI: 'http://localhost:5173/auth/callback',
    })
    const res = await app.request('/api/me')
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'unauthorized' })
  })

  it('refuses AUTH_DISABLED in production', async () => {
    const app = await loadApp({ AUTH_DISABLED: 'true', NODE_ENV: 'production' })
    const res = await app.request('/api/me')
    expect(res.status).toBe(500)
  })
})
