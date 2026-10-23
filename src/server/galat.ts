import { ZodError } from 'zod'

import { logger } from '#/lib/logger'
import type { GalatAman } from '#/types/galat'

// Galat domain: error yang pesannya SENGAJA ditulis untuk dilihat pengguna.
// Hanya subclass ini yang pesannya boleh sampai ke klien.
export class GalatDomain extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GalatDomain'
  }
}

// Pelanggaran rate limit: pesan aman, dipetakan ke HTTP 429.
export class GalatRateLimit extends Error {
  constructor(message = 'Terlalu banyak permintaan. Coba lagi nanti.') {
    super(message)
    this.name = 'GalatRateLimit'
  }
}

// Body request melebihi batas: dipetakan ke HTTP 413.
export class GalatPayload extends Error {
  constructor(message = 'Body request terlalu besar') {
    super(message)
    this.name = 'GalatPayload'
  }
}

// Konflik domain dengan kode mesin, dipetakan ke HTTP 409.
export class GalatKonflik extends Error {
  readonly kode: string

  constructor(kode: string, message: string) {
    super(message)
    this.name = 'GalatKonflik'
    this.kode = kode
  }
}

let urutanRef = 0

function buatRef(): string {
  urutanRef += 1
  return `${Date.now().toString(36)}${urutanRef.toString(36)}`
}

// Terjemahkan error apa pun menjadi envelope aman untuk klien.
// Detail mentah (Prisma, stack, bug tak terduga) tidak pernah dikirim;
// lengkapnya dicatat di log server dengan `ref` yang bisa dirujuk operator.
export function terjemahGalat(e: unknown, konteks?: string): GalatAman {
  if (e instanceof GalatRateLimit) {
    return { status: 429, code: 'TOO_MANY_REQUESTS', message: e.message }
  }
  if (e instanceof GalatPayload) {
    return { status: 413, code: 'PAYLOAD_TOO_LARGE', message: e.message }
  }
  if (e instanceof GalatKonflik) {
    return { status: 409, code: e.kode, message: e.message }
  }
  if (e instanceof GalatDomain) {
    return { status: 422, code: 'DOMAIN', message: e.message }
  }
  if (e instanceof ZodError) {
    const pesan = e.issues[0]?.message ?? 'Data tidak valid'
    return { status: 400, code: 'BAD_REQUEST', message: pesan }
  }
  if (e instanceof SyntaxError) {
    return {
      status: 400,
      code: 'BAD_REQUEST',
      message: 'Body JSON tidak valid',
    }
  }
  if (e instanceof Error) {
    if (e.message === 'UNAUTHORIZED') {
      return { status: 401, code: 'UNAUTHORIZED', message: 'Login dulu' }
    }
    if (e.message === 'FORBIDDEN') {
      return {
        status: 403,
        code: 'FORBIDDEN',
        message: 'Akses ditolak untuk peran ini',
      }
    }
  }

  const ref = buatRef()
  const detail = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
  logger.error(
    { kind: 'galat', ref, konteks, detail, err: e },
    'kesalahan server tak terduga',
  )
  return {
    status: 500,
    code: 'INTERNAL',
    message: `Terjadi kesalahan di server (ref: ${ref}). Hubungi operator.`,
    ref,
  }
}
