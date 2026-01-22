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
import { useEffect } from 'react'

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
import PWADevtools, { PWADevProvider } from '../integrations/pwa/provider'
import { PWAInstallPrompt } from '../components/PWAInstallPrompt'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

const SITE_URL = 'https://bearbites.dreaming.codes'
const SITE_NAME = 'Bear Bites'
const SITE_TITLE =
  'UCR Dining Menu - Bear Bites | UC Riverside Dining Hall Menus'
const SITE_DESCRIPTION =
  "View today's UCR dining menu for Glasgow, Lothian, and all UC Riverside dining halls. Filter by vegan, vegetarian, gluten-free options. Real-time meal hours, nutrition info, and save your favorite foods."
const SITE_KEYWORDS =
  'UCR dining menu, UC Riverside dining, UCR dining hall, Glasgow dining menu, Lothian menu, UCR food, UCR cafeteria, UCR vegan options, UCR vegetarian food, Bear Bites'

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
        content: '#0f172a',
      },
      // Primary SEO Meta Tags
      {
        title: SITE_TITLE,
      },
      {
        name: 'title',
        content: SITE_TITLE,
      },
      {
        name: 'description',
        content: SITE_DESCRIPTION,
      },
      {
        name: 'keywords',
        content: SITE_KEYWORDS,
      },
      {
        name: 'author',
        content: 'DreamingCodes',
      },
      {
        name: 'robots',
        content:
          'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      },
      {
        name: 'googlebot',
        content: 'index, follow',
      },
      // Open Graph / Facebook
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:url',
        content: SITE_URL,
      },
      {
        property: 'og:site_name',
        content: SITE_NAME,
      },
      {
        property: 'og:title',
        content: SITE_TITLE,
      },
      {
        property: 'og:description',
        content: SITE_DESCRIPTION,
      },
      {
        property: 'og:image',
        content: `${SITE_URL}/og-image.png`,
      },
      {
        property: 'og:image:width',
        content: '1200',
      },
      {
        property: 'og:image:height',
        content: '630',
      },
      {
        property: 'og:image:alt',
        content: 'Bear Bites - UCR Dining Menu App',
      },
      {
        property: 'og:locale',
        content: 'en_US',
      },
      // Twitter Card
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:url',
        content: SITE_URL,
      },
      {
        name: 'twitter:title',
        content: SITE_TITLE,
      },
      {
        name: 'twitter:description',
        content: SITE_DESCRIPTION,
      },
      {
        name: 'twitter:image',
        content: `${SITE_URL}/og-image.png`,
      },
      {
        name: 'twitter:image:alt',
        content: 'Bear Bites - UCR Dining Menu App',
      },
      // PWA / Mobile Meta Tags
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
        content: SITE_NAME,
      },
      {
        name: 'application-name',
        content: SITE_NAME,
      },
      {
        name: 'mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'darkreader-lock',
      },
      // Geographic targeting for local SEO
      {
        name: 'geo.region',
        content: 'US-CA',
      },
      {
        name: 'geo.placename',
        content: 'Riverside',
      },
      {
        name: 'geo.position',
        content: '33.9737;-117.3281',
      },
      {
        name: 'ICBM',
        content: '33.9737, -117.3281',
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
        rel: 'canonical',
        href: SITE_URL,
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
    scripts: [
      // JSON-LD Structured Data
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'WebApplication',
              '@id': `${SITE_URL}/#webapp`,
              name: SITE_NAME,
              description: SITE_DESCRIPTION,
              url: SITE_URL,
              applicationCategory: 'UtilitiesApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '150',
                bestRating: '5',
                worstRating: '1',
              },
            },
            {
              '@type': 'Organization',
              '@id': `${SITE_URL}/#organization`,
              name: SITE_NAME,
              url: SITE_URL,
              logo: `${SITE_URL}/icons/icon-512x512.png`,
              sameAs: [],
            },
            {
              '@type': 'WebSite',
              '@id': `${SITE_URL}/#website`,
              url: SITE_URL,
              name: SITE_NAME,
              description: SITE_DESCRIPTION,
              publisher: {
                '@id': `${SITE_URL}/#organization`,
              },
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: `${SITE_URL}/?search={search_term_string}`,
                },
                'query-input': 'required name=search_term_string',
              },
            },
            {
              '@type': 'FoodEstablishment',
              '@id': `${SITE_URL}/#foodestablishment`,
              name: 'UC Riverside Dining Services',
              description:
                'Dining services at UC Riverside including Glasgow and Lothian residential restaurants',
              url: SITE_URL,
              address: {
                '@type': 'PostalAddress',
                streetAddress: '900 University Ave',
                addressLocality: 'Riverside',
                addressRegion: 'CA',
                postalCode: '92521',
                addressCountry: 'US',
              },
              geo: {
                '@type': 'GeoCoordinates',
                latitude: 33.9737,
                longitude: -117.3281,
              },
              servesCuisine: [
                'American',
                'Asian',
                'Mexican',
                'Vegetarian',
                'Vegan',
                'Gluten-Free',
              ],
              priceRange: '$$',
              hasMenu: {
                '@type': 'Menu',
                name: 'UCR Dining Menu',
                description: 'Daily dining hall menus for UC Riverside',
                url: SITE_URL,
              },
            },
            {
              '@type': 'BreadcrumbList',
              '@id': `${SITE_URL}/#breadcrumb`,
              itemListElement: [
                {
                  '@type': 'ListItem',
                  position: 1,
                  name: 'Home',
                  item: SITE_URL,
                },
              ],
            },
          ],
        }),
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

  // Fix iOS Safari stuck :active state - adding touchstart listener enables proper touch handling
  useEffect(() => {
    document.addEventListener('touchstart', () => {}, { passive: true })
  }, [])

  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground">
        <PWADevProvider>
          <ThemeProvider>
            {children}
            <BottomNav />
            <PWAInstallPrompt />
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
              PWADevtools,
            ]}
          />
        </PWADevProvider>
        <Scripts />
      </body>
    </html>
  )
}
