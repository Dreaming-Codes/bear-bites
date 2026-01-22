import { createFileRoute } from '@tanstack/react-router'

const SITE_URL = 'https://bearbites.dreaming.codes'

function generateSitemap(): string {
  const today = new Date().toISOString().split('T')[0]

  const staticPages = [
    { loc: '/', changefreq: 'daily', priority: '1.0' },
    { loc: '/favorites', changefreq: 'weekly', priority: '0.8' },
    { loc: '/profile', changefreq: 'monthly', priority: '0.5' },
  ]

  const urls = staticPages
    .map(
      (page) => `  <url>
    <loc>${SITE_URL}${page.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () => {
        const sitemap = generateSitemap()
        return new Response(sitemap, {
          headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          },
        })
      },
    },
  },
})
