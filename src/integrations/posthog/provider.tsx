import { useEffect } from 'react'
import { useRouterState } from '@tanstack/react-router'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

// Initialize PostHog only on the client
if (typeof window !== 'undefined') {
  posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: false, // We'll capture page views manually with the router
    capture_pageleave: true,
  })
}

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
  return (
    <PHProvider client={posthog}>
      <PostHogPageView />
      {children}
    </PHProvider>
  )
}
