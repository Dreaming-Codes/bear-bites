import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { createAuth } from '@/lib/auth/index'

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const auth = createAuth(env)
        return auth.handler(request)
      },
      POST: ({ request }) => {
        const auth = createAuth(env)
        return auth.handler(request)
      },
    },
  },
})
