import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: async () => {
        const body = [
          'User-agent: *',
          'Allow: /',
          'Disallow: /api/',
          'Disallow: /dashboard',
          '',
          'Sitemap: /sitemap.xml',
        ].join('\n')
        return new Response(body, {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
            'cache-control': 'public, max-age=3600',
          },
        })
      },
    },
  },
})
