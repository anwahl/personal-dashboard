import { createRoute, z } from '@hono/zod-openapi'
import { createRouter } from '../lib/router.ts'
import { errorResponses } from '../schemas/common.ts'

const UserSchema = z.object({ sub: z.string(), email: z.string() }).openapi('User')

export const meRoutes = createRouter()

meRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/me',
    tags: ['auth'],
    summary: 'The logged-in user',
    responses: {
      200: { description: 'OK', content: { 'application/json': { schema: UserSchema } } },
      ...errorResponses,
    },
  }),
  (c) => c.json(c.get('user'), 200),
)
