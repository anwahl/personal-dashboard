import { OpenAPIHono } from '@hono/zod-openapi'
import type { AppEnv } from './types.ts'

/**
 * Every router uses this so zod validation failures share one 400 shape.
 * (The hook belongs to the router a route is defined on, so route modules
 * must use this too, not a bare `new OpenAPIHono()`.)
 */
export function createRouter() {
  return new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (!result.success) {
        const issues = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
        return c.json({ error: 'invalid request', issues }, 400)
      }
    },
  })
}
