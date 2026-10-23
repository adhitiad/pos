import { createFileRoute } from '@tanstack/react-router'

import { env } from '#/env'
import { identitasApp } from '#/server/pengaturan'
import { urlUnduhAman } from '#/server/bantu.cloudinary'
import { svgIkon } from '#/server/bantu.ikon'
import { rateLimit } from '#/server/rateLimit'

const MAKS_BYTE = 2 * 1024 * 1024
const TIPE_DIIZINKAN = new Set(['image/jpeg', 'image/png', 'image/webp'])
const TTL_SUKSES = 10 * 60_000
const TTL_GAGAL = 60_000

let cacheIkon: { url: string; nilai: string | null; sampai: number } | null =
  null

async function ambilDataUri(url: string): Promise<string | null> {
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

async function dataUriGambar(url: string): Promise<string | null> {
  const sekarang = Date.now()
  if (cacheIkon?.url === url && cacheIkon.sampai > sekarang) {
    return cacheIkon.nilai
  }
  const nilai = await ambilDataUri(url)
  cacheIkon = {
    url,
    nilai,
    sampai: sekarang + (nilai ? TTL_SUKSES : TTL_GAGAL),
  }
  return nilai
}

export const Route = createFileRoute('/api/v1/app-icon')({
  server: {
    handlers: {
      // Ikon publik: SVG dibuat otomatis dari ikon Cloudinary milik owner.
      // Tanpa ikon (atau Cloudinary belum dikonfigurasi) → ikon inisial.
      GET: async ({ request }) => {
        const rl = await rateLimit(request, 60)
        if (rl) return rl
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
            'cache-control': 'public, max-age=600, stale-while-revalidate=3600',
            'x-content-type-options': 'nosniff',
          },
        })
      },
    },
  },
})
