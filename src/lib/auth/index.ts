import { betterAuth } from 'better-auth'
import { Kysely } from 'kysely'
import { D1Dialect } from 'kysely-d1'
import { betterAuthOptions } from './options'

export const createAuth = (envBindings: Cloudflare.Env) => {
  const db = new Kysely<Record<string, unknown>>({
    dialect: new D1Dialect({ database: envBindings.DB }),
  })

  return betterAuth({
    ...betterAuthOptions,
    database: {
      db,
      type: 'sqlite',
    },
    baseURL: envBindings.BETTER_AUTH_URL,
    secret: envBindings.BETTER_AUTH_SECRET,
    socialProviders: {
      google: {
        clientId: envBindings.GOOGLE_CLIENT_ID,
        clientSecret: envBindings.GOOGLE_CLIENT_SECRET,
      },
    },
  })
}

export type Auth = ReturnType<typeof createAuth>
