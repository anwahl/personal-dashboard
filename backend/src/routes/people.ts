import { createRoute, z } from '@hono/zod-openapi'
import { createRouter } from '../lib/router.ts'
import { errorResponses } from '../schemas/common.ts'
import { PersonRefSchema } from '../schemas/people.ts'
import { listPeople } from '../services/people.ts'

export const peopleRoutes = createRouter()

peopleRoutes.openapi(
  createRoute({
    method: 'get',
    path: '/people',
    tags: ['people'],
    summary: 'Active people',
    responses: {
      200: { description: 'OK', content: { 'application/json': { schema: z.array(PersonRefSchema) } } },
      ...errorResponses,
    },
  }),
  async (c) => c.json(await listPeople(), 200),
)
