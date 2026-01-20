const APP_VERSION = '__APP_VERSION__'
const CACHE_NAME = `bear-bites-${APP_VERSION}`
const STATIC_CACHE_NAME = `bear-bites-static-${APP_VERSION}`
const DYNAMIC_CACHE_NAME = `bear-bites-dynamic-${APP_VERSION}`
const MENU_CACHE_NAME = `bear-bites-menu-${APP_VERSION}`

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets')
      return cache.addAll(STATIC_ASSETS)
    }),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return (
              name.startsWith('bear-bites-') &&
              name !== STATIC_CACHE_NAME &&
              name !== DYNAMIC_CACHE_NAME &&
              name !== MENU_CACHE_NAME
            )
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name)
            return caches.delete(name)
          }),
      )
    }),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') {
    return
  }

  // Handle menu API requests (oRPC endpoints) - cache for offline support
  if (url.pathname.startsWith('/api/rpc')) {
    event.respondWith(handleMenuApiRequest(request))
    return
  }

  if (url.pathname.startsWith('/api/')) {
    return
  }

  if (url.origin !== self.location.origin) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache the response
          const responseClone = response.clone()
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
          return response
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match('/')
          })
        }),
    )
    return
  }

  // For static assets (JS, CSS, images), use cache first
  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.svg')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }
        return fetch(request).then((response) => {
          const responseClone = response.clone()
          caches.open(STATIC_CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
          return response
        })
      }),
    )
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseClone = response.clone()
        caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
          cache.put(request, responseClone)
        })
        return response
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          // Return cached response or a proper error response
          if (cachedResponse) {
            return cachedResponse
          }
          // Return a proper Response object instead of undefined
          return new Response('Resource not available offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' },
          })
        })
      }),
  )
})

async function handleMenuApiRequest(request) {
  const cache = await caches.open(MENU_CACHE_NAME)

  try {
    const networkResponse = await fetch(request)

    // Only cache successful responses
    if (networkResponse.ok) {
      // Clone the response before caching (response can only be used once)
      const responseToCache = networkResponse.clone()

      // Store with timestamp for potential future cache invalidation
      cache.put(request, responseToCache)
      console.log('[SW] Cached menu API response:', request.url)
    }

    return networkResponse
  } catch (error) {
    // Network failed, try cache
    console.log('[SW] Network failed, trying cache for:', request.url)
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      console.log('[SW] Serving cached menu data:', request.url)
      return cachedResponse
    }

    // No cache available, return error response
    console.log('[SW] No cached data available for:', request.url)
    return new Response(
      JSON.stringify({
        error: 'You are offline and this menu has not been cached yet.',
        offline: true,
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
