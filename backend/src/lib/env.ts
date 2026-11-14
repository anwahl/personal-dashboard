import { z } from 'zod'

// OIDC_* vars are also read directly by @hono/oidc-auth (fixed names); they're
// listed here so a missing one fails at startup instead of on first login.
const flag = z
  .enum(['true', 'false', ''])
  .optional()
  .transform((v) => v === 'true')

const schema = z
  .object({
    NODE_ENV: z.string().default('development'),
    PORT: z.coerce.number().default(3000),

    SUPABASE_URL: z.url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

    AUTH_DISABLED: flag,
    OIDC_ISSUER: z.url().optional(),
    OIDC_CLIENT_ID: z.string().optional(),
    OIDC_CLIENT_SECRET: z.string().optional(),
    OIDC_AUTH_SECRET: z.string().min(32).optional(),
    OIDC_REDIRECT_URI: z.string().optional(),
    OIDC_COOKIE_NAME: z.string().default('oidc-auth'),
    OIDC_COOKIE_PATH: z.string().default('/'),

    SERVE_STATIC: flag,
    STATIC_ROOT: z.string().default('../frontend/build'),
  })
  .superRefine((env, ctx) => {
    if (env.AUTH_DISABLED) {
      if (env.NODE_ENV === 'production') {
        ctx.addIssue({ code: 'custom', path: ['AUTH_DISABLED'], message: 'not allowed when NODE_ENV=production' })
      }
      return
    }
    for (const key of ['OIDC_ISSUER', 'OIDC_CLIENT_ID', 'OIDC_CLIENT_SECRET', 'OIDC_AUTH_SECRET', 'OIDC_REDIRECT_URI'] as const) {
      if (!env[key]) ctx.addIssue({ code: 'custom', path: [key], message: 'required unless AUTH_DISABLED=true' })
    }
  })

export type Env = z.infer<typeof schema>

let cached: Env | undefined

/** Parsed lazily so importing the app (e.g. in tests) doesn't require every var up front. */
export function getEnv(): Env {
  if (cached) return cached
  const result = schema.safeParse(process.env)
  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`)
  }
  cached = result.data
  return cached
}
