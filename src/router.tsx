import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import * as TanstackQuery from './integrations/tanstack-query/root-provider'
import { TRPCProvider, getTRPCClient } from './trpc/client'

import { routeTree } from './routeTree.gen'

export const getRouter = () => {
  const rqContext = TanstackQuery.getContext()
  const trpcClient = getTRPCClient()

  const router = createRouter({
    routeTree,
    context: {
      ...rqContext,
    },

    defaultPreload: 'intent',
    scrollRestoration: true,
    Wrap: ({ children }) => (
      <TRPCProvider queryClient={rqContext.queryClient} trpcClient={trpcClient}>
        {children}
      </TRPCProvider>
    ),
  })

  setupRouterSsrQueryIntegration({ router, queryClient: rqContext.queryClient })

  return router
}
