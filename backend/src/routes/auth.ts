import { oidcAuthMiddleware, processOAuthCallback, revokeSession } from '@hono/oidc-auth'
import { Hono } from 'hono'
import { getEnv } from '../lib/env.ts'

/** Browser-navigation routes (redirects are fine here), kept out of the OpenAPI doc. */
export const authRoutes = new Hono()

/** Only same-origin paths, so ?next= can't bounce to another site. */
function safeNext(next: string | undefined): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

// Unauthenticated: oidcAuthMiddleware redirects to Authelia, then the callback
// returns here (via its "continue" cookie) and we land on ?next=.
authRoutes.get(
  '/login',
  async (c, next) => (getEnv().AUTH_DISABLED ? next() : oidcAuthMiddleware()(c, next)),
  (c) => c.redirect(safeNext(c.req.query('next'))),
)

authRoutes.get('/callback', (c) => processOAuthCallback(c))

// Ends the homeport session only; the Authelia SSO session is left alone.
authRoutes.get('/logout', async (c) => {
  if (!getEnv().AUTH_DISABLED) await revokeSession(c)
  return c.redirect('/')
})
