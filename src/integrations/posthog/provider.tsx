import { useEffect, useState } from 'react'
import { useRouterState } from '@tanstack/react-router'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

// Component that tracks page views on route changes
function PostHogPageView() {
  const routerState = useRouterState({
    select: (state) => ({
      location: state.location,
      isLoading: state.isLoading,
    }),
  })

  useEffect(() => {
    // Only capture page view when the route has finished loading
    if (!routerState.isLoading && routerState.location) {
      posthog.capture('$pageview', {
        $current_url: window.location.href,
        $pathname: routerState.location.pathname,
      })
    }
  }, [routerState.location.pathname, routerState.isLoading])

  return null
}

interface PostHogProviderProps {
  children: React.ReactNode
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    // Initialize PostHog only on the client
    if (typeof window !== 'undefined' && !posthog.__loaded) {
      posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY, {
        api_host: '/ingest', // Proxied through our own domain to avoid ad blockers
        ui_host: 'https://us.posthog.com', // Required for PostHog toolbar to work
        person_profiles: 'identified_only',
        capture_pageview: false, // We'll capture page views manually with the router
        capture_pageleave: true,
      })
    }
    setIsInitialized(true)
  }, [])

  // During SSR and initial client render, just render children without PostHog
  if (!isInitialized) {
    return <>{children}</>
  }

  return (
    <PHProvider client={posthog}>
      <PostHogPageView />
      {children}
    </PHProvider>
  )
}
