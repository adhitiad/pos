import { createHmac, timingSafeEqual } from 'node:crypto'

import { env } from '#/env'
import { GalatDomain } from './galat.js'

// Token QR meja bertanda tangan HMAC-SHA256. Stateless: tidak ada kolom token
// di DB, jadi QR lama otomatis mati saat secret auth dirotasi. Masa berlaku
// dibuat panjang karena QR ditempel di meja, tetapi tetap dibatasi agar tautan
// lama tidak berlaku selamanya.
export const MASA_BERLAKU_MEJA_MS = 14 * 24 * 60 * 60 * 1_000
export const MAKS_TOKEN_MEJA = 512

type MuatanTokenMeja = {
  v: 1
  m: string
  e: number
}

const rahasia = () => env.BETTER_AUTH_SECRET

function tandaTangan(muatan: string): string {
  return createHmac('sha256', rahasia())
    .update(`meja|${muatan}`)
    .digest('base64url')
}

function muatanSah(nilai: unknown): nilai is MuatanTokenMeja {
  if (!nilai || typeof nilai !== 'object') return false
  const data = nilai as Record<string, unknown>
  return (
    data.v === 1 &&
    typeof data.m === 'string' &&
    data.m.length > 0 &&
    data.m.length <= 64 &&
    typeof data.e === 'number' &&
    Number.isFinite(data.e)
  )
}

export function buatTokenMeja(mejaId: string): {
  token: string
  berlakuSampai: string
} {
  const muatan: MuatanTokenMeja = {
    v: 1,
    m: mejaId,
    e: Date.now() + MASA_BERLAKU_MEJA_MS,
  }
  const isi = Buffer.from(JSON.stringify(muatan)).toString('base64url')
  return {
    token: `${isi}.${tandaTangan(isi)}`,
    berlakuSampai: new Date(muatan.e).toISOString(),
  }
}

export function bacaTokenMeja(token: string): { mejaId: string } {
  if (!token || token.length > MAKS_TOKEN_MEJA) {
    throw new GalatDomain('QR meja tidak valid')
  }
  const bagian = token.split('.')
  if (bagian.length !== 2 || !bagian[0] || !bagian[1]) {
    throw new GalatDomain('QR meja tidak valid')
  }
  const [isi, tanda] = bagian
  const harapan = Buffer.from(tandaTangan(isi))
  const diterima = Buffer.from(tanda)
  if (
    harapan.length !== diterima.length ||
    !timingSafeEqual(harapan, diterima)
  ) {
    throw new GalatDomain('QR meja tidak valid')
  }

  let muatan: unknown
  try {
    muatan = JSON.parse(Buffer.from(isi, 'base64url').toString('utf8'))
  } catch {
    throw new GalatDomain('QR meja tidak valid')
  }
  if (!muatanSah(muatan)) {
    throw new GalatDomain('QR meja tidak valid')
  }
  if (muatan.e < Date.now()) {
    throw new GalatDomain('QR meja sudah kedaluwarsa')
  }
  return { mejaId: muatan.m }
}

export function urlPesananMeja(token: string): string {
  const url = new URL('/pesanan', env.BETTER_AUTH_URL)
  url.searchParams.set('meja', token)
  return url.toString()
}
