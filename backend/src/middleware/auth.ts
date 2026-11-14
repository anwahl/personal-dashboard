import { getAuth } from '@hono/oidc-auth'
import { setCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import { getEnv } from '../lib/env.ts'
import type { AppEnv, User } from '../lib/types.ts'

const DEV_USER: User = { sub: 'dev', email: 'dev@localhost' }

/**
 * Guards /api/*. Unlike oidcAuthMiddleware() this never redirects: a fetch() that
 * follows a redirect to Authelia fails on CORS, so the SPA gets a 401 instead and
 * navigates to /auth/login itself.
 */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const env = getEnv()
  if (env.AUTH_DISABLED) {
    c.set('user', DEV_USER)
    return next()
  }

  const auth = await getAuth(c)
  if (!auth?.sub) return c.json({ error: 'unauthorized' }, 401)
  c.set('user', { sub: auth.sub, email: auth.email ?? '' })

  await next()

  // getAuth() refreshes the session JWT every OIDC_AUTH_REFRESH_INTERVAL; persist
  // the new one the same way oidcAuthMiddleware() does.
  const jwt = c.get('oidcAuthJwt')
  if (jwt !== undefined) {
    setCookie(c, env.OIDC_COOKIE_NAME, jwt, { path: env.OIDC_COOKIE_PATH, httpOnly: true, secure: true })
  }
})
