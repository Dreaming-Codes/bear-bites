import { createFileRoute } from '@tanstack/react-router'

const API_HOST = 'us.i.posthog.com'
const ASSET_HOST = 'us-assets.i.posthog.com'

async function retrieveStatic(
  request: Request,
  pathname: string,
): Promise<Response> {
  // Check cache first using Cloudflare's caches API
  const cache = (caches as unknown as { default: Cache }).default
  let response = await cache.match(request)

  if (!response) {
    response = await fetch(`https://${ASSET_HOST}${pathname}`)
    // Clone and cache the response
    if (response.ok) {
      const responseToCache = response.clone()
      // Cache the response for future requests
      cache.put(request, responseToCache)
    }
  }

  return response
}

async function forwardRequest(
  request: Request,
  pathWithSearch: string,
): Promise<Response> {
  const ip = request.headers.get('CF-Connecting-IP') || ''
  const originHeaders = new Headers(request.headers)

  // Remove cookies for privacy
  originHeaders.delete('cookie')
  // Set the real user IP so PostHog can geolocate correctly
  originHeaders.set('X-Forwarded-For', ip)

  const originRequest = new Request(`https://${API_HOST}${pathWithSearch}`, {
    method: request.method,
    headers: originHeaders,
    body:
      request.method !== 'GET' && request.method !== 'HEAD'
        ? await request.arrayBuffer()
        : null,
    redirect: request.redirect,
  })

  return await fetch(originRequest)
}

async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const pathname = url.pathname
  const search = url.search

  // Remove the /ingest prefix to get the actual PostHog path
  const posthogPath = pathname.replace(/^\/ingest/, '') || '/'
  const pathWithParams = posthogPath + search

  if (posthogPath.startsWith('/static/')) {
    return retrieveStatic(request, pathWithParams)
  } else {
    return forwardRequest(request, pathWithParams)
  }
}

async function handle({ request }: { request: Request }): Promise<Response> {
  return handleRequest(request)
}

export const Route = createFileRoute('/ingest/$')({
  server: {
    handlers: {
      HEAD: handle,
      GET: handle,
      POST: handle,
      PUT: handle,
      PATCH: handle,
      DELETE: handle,
      OPTIONS: handle,
    },
  },
})
