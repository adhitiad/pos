import { createFileRoute } from '@tanstack/react-router'

import { env } from '#/env'
import { identitasApp } from '#/server/pengaturan'
import { urlUnduhAman } from '#/server/bantu.cloudinary'
import { svgIkon } from '#/server/bantu.ikon'

const MAKS_BYTE = 2 * 1024 * 1024
const TIPE_DIIZINKAN = new Set(['image/jpeg', 'image/png', 'image/webp'])

async function dataUriGambar(url: string): Promise<string | null> {
  const cloud = env.CLOUDINARY_CLOUD_NAME
  if (!cloud || !urlUnduhAman(url, cloud)) return null
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return null
    const tipe = (res.headers.get('content-type') ?? '').split(';')[0] ?? ''
    if (!TIPE_DIIZINKAN.has(tipe)) return null
    const panjang = Number(res.headers.get('content-length') ?? 0)
    if (panjang > MAKS_BYTE) return null
    const buffer = await res.arrayBuffer()
    if (buffer.byteLength > MAKS_BYTE) return null
    return `data:${tipe};base64,${Buffer.from(buffer).toString('base64')}`
  } catch {
    return null
  }
}

export const Route = createFileRoute('/api/v1/app-icon')({
  server: {
    handlers: {
      // Ikon publik: SVG dibuat otomatis dari ikon Cloudinary milik owner.
      // Tanpa ikon (atau Cloudinary belum dikonfigurasi) → ikon inisial.
      GET: async () => {
        const identitas = await identitasApp().catch(() => ({
          judul: 'POS',
          ikonUrl: '',
          logoUrl: '',
          deskripsi: '',
        }))
        const gambar = identitas.ikonUrl
          ? await dataUriGambar(identitas.ikonUrl)
          : null
        return new Response(svgIkon(identitas.judul, gambar), {
          headers: {
            'content-type': 'image/svg+xml; charset=utf-8',
            'cache-control': 'public, max-age=60, stale-while-revalidate=300',
            'x-content-type-options': 'nosniff',
          },
        })
      },
    },
  },
})
