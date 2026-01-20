import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  Link,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Home } from 'lucide-react'

import {
  BottomNav,
  PageWrapper,
  Container,
  GlassCard,
  GlassButton,
} from '@/components/bear-bites'
import { ThemeProvider } from '@/hooks/useTheme'
import { useServiceWorker } from '@/hooks/useServiceWorker'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      {
        name: 'theme-color',
        content: '#0f172a', // Dark mode default to avoid flash
      },
      {
        name: 'apple-mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'black-translucent',
      },
      {
        name: 'apple-mobile-web-app-title',
        content: 'Bear Bites',
      },
      {
        name: 'application-name',
        content: 'Bear Bites',
      },
      {
        name: 'mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'description',
        content:
          'Browse UCR dining hall menus, filter by dietary preferences, and save your favorite foods.',
      },
      {
        title: 'Bear Bites - UCR Dining Menu',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '512x512',
        href: '/icons/icon-512x512.png',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '192x192',
        href: '/icons/icon-192x192.png',
      },
      {
        rel: 'apple-touch-icon',
        href: '/apple-touch-icon.png',
      },
    ],
  }),

  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  shellComponent: RootDocument,
})

function NotFoundComponent() {
  return (
    <PageWrapper>
      <Container className="pt-8">
        <GlassCard className="text-center py-12">
          <p className="text-6xl mb-4">🐻</p>
          <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
          <p className="text-muted-foreground mb-6">
            Oops! This page doesn't exist. Let's get you back to the menu.
          </p>
          <Link to="/">
            <GlassButton variant="primary">
              <Home size={18} className="mr-2" />
              Back to Menu
            </GlassButton>
          </Link>
        </GlassCard>
      </Container>
    </PageWrapper>
  )
}

function RootComponent() {
  return <Outlet />
}

function RootDocument({ children }: { children: React.ReactNode }) {
  useServiceWorker()

  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground">
        <ThemeProvider>
          {children}
          <BottomNav />
        </ThemeProvider>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            TanStackQueryDevtools,
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
