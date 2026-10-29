import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const base = (
          process.env.BETTER_AUTH_URL || 'http://localhost:3000'
        ).replace(/\/$/, '')
        const paths = ['/', '/login', '/privasi', '/tos', '/tentang']
        const urls = paths
          .map(
            (p) =>
              `  <url>\n    <loc>${base}${p}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${p === '/' ? '1.0' : '0.5'}</priority>\n  </url>`,
          )
          .join('\n')
        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`
        return new Response(body, {
          headers: {
            'content-type': 'application/xml; charset=utf-8',
            'cache-control': 'public, max-age=3600',
          },
        })
      },
    },
  },
})
