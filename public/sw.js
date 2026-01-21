const APP_VERSION = '__APP_VERSION__'
const CACHE_NAME = `bear-bites-${APP_VERSION}`
const STATIC_CACHE_NAME = `bear-bites-static-${APP_VERSION}`
const DYNAMIC_CACHE_NAME = `bear-bites-dynamic-${APP_VERSION}`

// Note: We don't pre-cache '/' because it's server-rendered and changes frequently
// The root page and JS bundles are cached on first visit via runtime caching
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets')
        // Use addAll with individual error handling
        return Promise.allSettled(
          STATIC_ASSETS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn('[SW] Failed to cache:', url, err)
            }),
          ),
        )
      })
      .then(() => {
        console.log('[SW] Install complete')
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
              name !== DYNAMIC_CACHE_NAME
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

  // Skip all API requests - let them go to network
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
          // Only cache successful responses
          if (response.ok) {
            const responseClone = response.clone()
            caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
              // Always cache as the root URL for SPA fallback
              // This ensures we have a cached shell for offline navigation
              cache.put(new Request('/'), response.clone())
            })
          }
          return response
        })
        .catch(async () => {
          console.log('[SW] Navigation failed, trying cache for:', request.url)
          // Try to find cached response for this specific URL
          const cachedResponse = await caches.match(request)
          if (cachedResponse) {
            console.log('[SW] Serving cached page:', request.url)
            return cachedResponse
          }
          // Fallback to cached root page (SPA shell)
          const rootResponse = await caches.match('/')
          if (rootResponse) {
            console.log('[SW] Serving cached root as fallback')
            return rootResponse
          }
          throw new Error('No cached navigation available')
        }),
    )
    return
  }

  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }
        return fetch(request)
          .then((response) => {
            // Only cache successful responses
            if (response.ok) {
              const responseClone = response.clone()
              caches.open(STATIC_CACHE_NAME).then((cache) => {
                cache.put(request, responseClone)
              })
            }
            return response
          })
          .catch(() => {
            // Asset not in cache and network failed
            console.log('[SW] Asset not available offline:', request.url)
            return new Response('Asset not available offline', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain' },
            })
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

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
