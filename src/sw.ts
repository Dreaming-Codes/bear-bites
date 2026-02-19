import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import {
  StaleWhileRevalidate,
  CacheFirst,
  NetworkFirst,
} from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { createTRPCClient, httpLink } from '@trpc/client'
import type { AppRouter } from '@/trpc/router'

declare let self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()

cleanupOutdatedCaches()

// Precache all build assets (JS, CSS, HTML, etc.)
// self.__WB_MANIFEST is replaced at build time with the actual asset list
precacheAndRoute(self.__WB_MANIFEST)

// ─── tRPC GET queries: Stale-While-Revalidate ───────────────────────────────
// tRPC v11 sends GET for queries by default. Both the app client and the SW
// prefetcher use httpLink, producing identical cache keys.
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/trpc/') && request.method === 'GET',
  new StaleWhileRevalidate({
    cacheName: 'trpc-api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        purgeOnQuotaError: true,
      }),
    ],
  }),
)

// ─── Static image assets: Cache-First ────────────────────────────────────────
registerRoute(
  ({ url }) =>
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webp'),
  new CacheFirst({
    cacheName: 'image-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        purgeOnQuotaError: true,
      }),
    ],
  }),
)

// ─── Navigation: Network-First with cached app shell fallback ────────────────
registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: 'navigation-cache',
      networkTimeoutSeconds: 3,
      plugins: [
        new ExpirationPlugin({
          maxEntries: 30,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        }),
      ],
    }),
    {
      denylist: [/^\/api\//],
    },
  ),
)

// ─── tRPC client for proactive prefetching ───────────────────────────────────
// Uses httpLink (same as the browser client) with the SW's own fetch, which
// routes through the Workbox strategies above — responses get cached automatically.
function createPrefetchClient() {
  return createTRPCClient<AppRouter>({
    links: [
      httpLink({
        url: `${self.location.origin}/api/trpc`,
        fetch: self.fetch.bind(self),
      }),
    ],
  })
}

// Dining hall locations (hardcoded to avoid a circular dep on server code)
const LOCATIONS = ['02', '03']

/** Get today and tomorrow as YYYY-MM-DD strings in LA timezone */
function getPrefetchDates(): string[] {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const now = new Date()
  const today = fmt.format(now)
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const tomorrowStr = fmt.format(tomorrow)
  return [today, tomorrowStr]
}

/** Prefetch menu data for all locations × today + tomorrow */
async function prefetchMenuData() {
  const trpc = createPrefetchClient()
  const dates = getPrefetchDates()

  const promises: Promise<unknown>[] = []

  // Prefetch locations list
  promises.push(trpc.menu.getLocations.query({}))

  for (const locationId of LOCATIONS) {
    // Prefetch date bounds for each location
    promises.push(trpc.menu.getDateBounds.query({ locationId }))

    // Prefetch menus for today and tomorrow
    for (const date of dates) {
      promises.push(trpc.menu.getMenu.query({ locationId, date }))
    }
  }

  // Fire all prefetch requests in parallel, don't let failures block others
  const results = await Promise.allSettled(promises)
  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length
  console.log(
    `[SW] Prefetch complete: ${succeeded} succeeded, ${failed} failed`,
  )
}

// ─── Activate: prefetch menu data ────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(prefetchMenuData())
})

// ─── Message handler ─────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
