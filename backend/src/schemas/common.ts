import { z } from '@hono/zod-openapi'

export const ErrorSchema = z
  .object({
    error: z.string(),
    issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  })
  .openapi('Error')

export const IdParamSchema = z.object({
  id: z.coerce.number().int().positive().openapi({ param: { name: 'id', in: 'path' }, example: 1 }),
})

const errorBody = { 'application/json': { schema: ErrorSchema } } as const

export const errorResponses = {
  400: { description: 'Invalid request', content: errorBody },
  401: { description: 'Not logged in', content: errorBody },
} as const

export const notFoundResponse = {
  404: { description: 'Not found', content: errorBody },
} as const

// ── Input helpers: all text is trimmed once, here ───────────────────────────

/** Required text: trimmed, must not be empty. */
export const requiredText = z.string().trim().min(1)

/** Optional text: trimmed; empty becomes null. */
export const optionalText = z
  .string()
  .trim()
  .nullable()
  .transform((s) => (s === '' ? null : s))

/** One or many of a query param (`?x=a` or `?x=a&x=b`), always an array. */
export function queryList<T extends z.ZodType<string>>(item: T) {
  return z.union([z.array(item), item.transform((v) => [v])])
}
