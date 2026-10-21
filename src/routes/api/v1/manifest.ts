import { createFileRoute } from '@tanstack/react-router'

import { identitasApp } from '#/server/pengaturan'

function pngIkon(url: string, px: number): string {
  if (!url.includes('res.cloudinary.com')) return url
  return url.replace('/upload/', `/upload/w_${px},h_${px},c_fill,q_auto,f_png/`)
}

export const Route = createFileRoute('/api/v1/manifest')({
  server: {
    handlers: {
      // Manifest dinamis: judul & ikon mengikuti pengaturan owner.
      GET: async () => {
        const identitas = await identitasApp().catch(() => ({
          judul: 'POS',
          ikonUrl: '',
          logoUrl: '',
          deskripsi: '',
        }))
        const ikon = identitas.ikonUrl
        const icons = ikon
          ? [
              {
                src: pngIkon(ikon, 192),
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
              },
              {
                src: pngIkon(ikon, 512),
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
              },
              {
                src: '/api/v1/app-icon',
                sizes: 'any',
                type: 'image/svg+xml',
                purpose: 'any',
              },
            ]
          : [
              {
                src: '/api/v1/app-icon',
                sizes: 'any',
                type: 'image/svg+xml',
                purpose: 'any',
              },
            ]
        return Response.json(
          {
            name: identitas.judul,
            short_name: identitas.judul.slice(0, 12),
            description:
              identitas.deskripsi ||
              'Sistem kasir (POS) dan buku besar untuk usaha kuliner dan ritel.',
            start_url: '/',
            scope: '/',
            display: 'standalone',
            background_color: '#f8fafc',
            theme_color: '#0f3d3a',
            icons,
          },
          {
            headers: {
              'content-type': 'application/manifest+json; charset=utf-8',
              'cache-control': 'public, max-age=60, stale-while-revalidate=300',
            },
          },
        )
      },
    },
  },
})
