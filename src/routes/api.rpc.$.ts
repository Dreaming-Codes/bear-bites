import '@/polyfill'

import { RPCHandler } from '@orpc/server/fetch'
import { createFileRoute } from '@tanstack/react-router'
import { env } from 'cloudflare:workers'
import router from '@/orpc/router'
import { createAuth } from '@/lib/auth'

const handler = new RPCHandler(router)

async function handle({ request }: { request: Request }) {
  let userId: string | undefined

  try {
    const auth = createAuth(env as Cloudflare.Env)
    const session = await auth.api.getSession({
      headers: request.headers,
    })
    userId = session?.user?.id
  } catch (e) {}

  const { response } = await handler.handle(request, {
    prefix: '/api/rpc',
    context: { userId },
  })

  return response ?? new Response('Not Found', { status: 404 })
}

export const Route = createFileRoute('/api/rpc/$')({
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
