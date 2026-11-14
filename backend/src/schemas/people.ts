import { z } from '@hono/zod-openapi'

/** A person as other records reference them. */
export const PersonRefSchema = z
  .object({
    id: z.number().int(),
    person_name: z.string(),
  })
  .openapi('PersonRef')
