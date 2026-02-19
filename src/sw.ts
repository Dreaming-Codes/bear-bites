import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import {
  StaleWhileRevalidate,
  CacheFirst,
  NetworkFirst,
} from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

declare let self: ServiceWorkerGlobalScope

// Take control immediately
self.skipWaiting()
clientsClaim()

// Clean up old precaches from previous versions
cleanupOutdatedCaches()

// Precache all build assets (JS, CSS, HTML, etc.)
// self.__WB_MANIFEST is replaced by vite-plugin-pwa with the actual asset list
precacheAndRoute(self.__WB_MANIFEST)

// tRPC v11 uses GET for queries (input encoded in URL params).
// These are public menu data — safe and valuable to cache for offline use.
registerRoute(
  ({ url, request }) =>
    url.pathname.startsWith('/api/trpc/') && request.method === 'GET',
  new StaleWhileRevalidate({
    cacheName: 'trpc-api-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 60, // 30 minutes
        purgeOnQuotaError: true,
      }),
    ],
  }),
)

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

// For SSR pages, try network first. Cache successful responses so the app
// works offline after the first visit.
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
      // Don't intercept API or auth routes
      denylist: [/^\/api\//],
    },
  ),
)

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
