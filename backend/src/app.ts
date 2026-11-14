import { HTTPException } from 'hono/http-exception'
import { logger } from 'hono/logger'
import { createRouter } from './lib/router.ts'
import { requireAuth } from './middleware/auth.ts'
import { authRoutes } from './routes/auth.ts'
import { meRoutes } from './routes/me.ts'
import { peopleRoutes } from './routes/people.ts'
import { taskRoutes } from './routes/tasks.ts'

const api = createRouter()
api.use('*', requireAuth)
api.get('/health', (c) => c.json({ ok: true }))
api.route('/', meRoutes)
api.route('/', peopleRoutes)
api.route('/', taskRoutes)

export const app = createRouter()
app.use(logger())
app.route('/auth', authRoutes)
app.route('/api', api)

app.doc31('/openapi.json', {
  openapi: '3.1.0',
  info: { title: 'homeport API', version: '0.1.0' },
})

app.notFound((c) => c.json({ error: 'not found' }, 404))

app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status)
  console.error(err)
  return c.json({ error: 'internal error' }, 500)
})
