import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { app } from '../app.ts'
import { getEnv } from '../lib/env.ts'

// Fail on startup, not on the first request.
const env = getEnv()

// VPS mode: one process serves the API and the built SPA. Unknown paths fall back
// to the SPA's 200.html so client-side routes survive a reload.
if (env.SERVE_STATIC) {
  app.use('*', serveStatic({ root: env.STATIC_ROOT }))
  app.get('*', serveStatic({ path: `${env.STATIC_ROOT}/200.html` }))
}

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`homeport backend on http://localhost:${info.port}`)
})
