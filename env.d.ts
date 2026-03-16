declare namespace Cloudflare {
  interface Env {
    MENU_CACHE: KVNamespace
    DB: D1Database
    AI: Ai
    BETTER_AUTH_URL: string
    BETTER_AUTH_SECRET: string
    GOOGLE_CLIENT_ID: string
    GOOGLE_CLIENT_SECRET: string
  }
}
