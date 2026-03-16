import { createTRPCClient, httpLink, unstable_localLink } from '@trpc/client'
import { createTRPCContext } from '@trpc/tanstack-react-query'
import { createIsomorphicFn } from '@tanstack/react-start'

import type { AppRouter } from '@/trpc/router'
import { appRouter } from '@/trpc/router'

export const getTRPCClient = createIsomorphicFn()
  .server(() =>
    createTRPCClient<AppRouter>({
      links: [
        unstable_localLink({
          router: appRouter,
          // eslint-disable-next-line @typescript-eslint/require-await
          createContext: async () => {
            // On SSR, we don't have auth context — public procedures only
            return { userId: undefined }
          },
        }),
      ],
    }),
  )
  .client(() =>
    createTRPCClient<AppRouter>({
      links: [
        httpLink({
          url: `${window.location.origin}/api/trpc`,
        }),
      ],
    }),
  )

export const { TRPCProvider, useTRPC, useTRPCClient } =
  createTRPCContext<AppRouter>()
