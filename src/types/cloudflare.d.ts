
interface CloudflareEnv {
  DB: D1Database

  MENU_CACHE: KVNamespace

  BETTER_AUTH_URL: string
  BETTER_AUTH_SECRET: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
}

declare global {
  interface CloudflareBindings extends CloudflareEnv {}
}

export type { CloudflareEnv }
