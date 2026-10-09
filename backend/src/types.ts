export type Bindings = {
  DB: D1Database
  APP_ORIGIN: string
  CORS_ORIGIN: string
  BETTER_AUTH_URL: string
  EMAIL_FROM: string
  BETTER_AUTH_SECRET: string
  BREVO_API_KEY: string
}

export type AppEnv = {
  Bindings: Bindings
}
