export interface User {
  sub: string
  email: string
}

/** Hono generics shared by every router. */
export interface AppEnv {
  Variables: {
    user: User
  }
}
