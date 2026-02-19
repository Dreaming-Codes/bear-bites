import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import { appRouter } from '@/trpc/router'
import { createAuth } from '@/lib/auth'

async function handle({ request }: { request: Request }) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext: async () => {
      let userId: string | undefined

      try {
        const auth = createAuth(env)
        const session = await auth.api.getSession({
          headers: request.headers,
        })
        userId = session?.user?.id
      } catch (e) {}

      return { userId }
    },
    onError({ error }) {
      console.error('tRPC error:', error)
    },
  })
}

export const Route = createFileRoute('/api/trpc/$')({
  server: {
    handlers: {
      HEAD: handle,
      GET: handle,
      POST: handle,
      PUT: handle,
      PATCH: handle,
      DELETE: handle,
    },
  },
})
