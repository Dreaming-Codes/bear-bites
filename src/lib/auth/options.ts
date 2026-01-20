import type { BetterAuthOptions } from 'better-auth'

export const betterAuthOptions = {
  appName: 'Bear Bites',
  basePath: '/api/auth',
  emailAndPassword: {
    enabled: false, // Only Google OAuth for simplicity
  },
  trustedOrigins: [
    'http://localhost:3000',
    'https://bear-bites.dreamingcodes.workers.dev',
    'https://bearbites.dreaming.codes',
  ],
} satisfies Partial<BetterAuthOptions>
