import { auth } from '#/lib/auth'
import { createHash } from 'node:crypto'
import { prisma } from '#/db'
import { GalatPayload, terjemahGalat } from './galat.js'
import {
  rateLimit,
  KAPASITAS_DEFAULT,
  JENDELA_DEFAULT_MS,
} from './rateLimit.js'
import type { Role } from '#/generated/prisma/enums.js'
import type { Pengguna } from '#/types/auth'

import { AsyncLocalStorage } from 'node:async_hooks'

const konteksPermintaan = new AsyncLocalStorage<{ requestId: string }>()

function buatRequestId(request: Request): string {
  const existing = request.headers.get('x-request-id')
  if (existing) return existing
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

// ─── Request ID / correlation ID untuk setiap response API ───
// Bungkus handler dengan `denganRequestId(request, async () => { ... })`.
// Header `X-Request-ID` otomatis ditambahkan ke setiap respons via ok/gagal/apiError.
export function denganRequestId(
  request: Request,
  handler: () => Promise<Response>,
): Promise<Response> {
  const requestId = buatRequestId(request)
  return konteksPermintaan.run({ requestId }, handler)
}

export function ambilRequestId(): string | undefined {
  const store = konteksPermintaan.getStore()
  return store?.requestId
}

function lampirkanRequestId(response: Response): Response {
  const requestId = ambilRequestId()
  if (!requestId) return response
  const headers = new Headers(response.headers)
  headers.set('X-Request-ID', requestId)
  const body = response.body
  if (body === null) {
    return new Response(null, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

// ─── Envelope JSON standar untuk SEMUA API (web & mobile/Expo) ───// Sukses: { ok: true, data: ... }
// Gagal : { ok: false, error: { code, message } }
export function ok<T>(data: T, status = 200): Response {
  return lampirkanRequestId(Response.json({ ok: true, data }, { status }))
}

export function gagal(code: string, message: string, status: number): Response {
  return lampirkanRequestId(
    Response.json({ ok: false, error: { code, message } }, { status }),
  )
}

// ─── ETag / conditional GET untuk endpoint baca ───
// `etag(data)` menghasilkan weak ETag (`W/"..."`) dari payload JSON.
// `okEtag(data, request)` memeriksa header `If-None-Match`; bila cocok,
// kembalikan 304 Not Modified (tanpa body). Bila tidak, kembalikan 200 dengan
// header ETag agar klien bisa cache.
export function etag(data: unknown): string {
  const payload = JSON.stringify(data)
  const hash = createHash('sha1').update(payload).digest('hex').slice(0, 16)
  return `W/"${hash}"`
}

export function okEtag(
  data: unknown,
  request: Request,
  status = 200,
): Response {
  const tag = etag(data)
  const ifNoneMatch = request.headers.get('if-none-match')
  if (ifNoneMatch === tag) {
    return lampirkanRequestId(
      new Response(null, {
        status: 304,
        headers: { ETag: tag },
      }),
    )
  }
  return lampirkanRequestId(
    Response.json({ ok: true, data }, { status, headers: { ETag: tag } }),
  )
}

// ─── Guard sesi via header request (cookie Better Auth) ───
// Sesi opsional: kembalikan Pengguna bila login, null bila anonim.
export async function apiPenggunaOpsional(
  request: Request,
): Promise<Pengguna | null> {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session?.user) return null
  // `role` bukan additionalFields Better Auth, jadi tidak ada di sesi; ambil dari DB.
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  const role: Role = dbUser?.role ?? 'MEMBER'
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    role,
  }
}

export async function apiPengguna(
  request: Request,
  peran: ReadonlyArray<Role>,
): Promise<Pengguna | Response> {
  const pengguna = await apiPenggunaOpsional(request)
  if (!pengguna) return gagal('UNAUTHORIZED', 'Login dulu', 401)
  if (!peran.includes(pengguna.role))
    return gagal('FORBIDDEN', 'Akses ditolak untuk peran ini', 403)
  return pengguna
}

// ─── Error apa pun → envelope aman (tanpa isi perut DB) ───
export function apiError(e: unknown): Response {
  const aman = terjemahGalat(e)
  return gagal(aman.code, aman.message, aman.status)
}

// ─── Rate limit wrapper untuk handler route REST ───
// Panggil di awal handler: `return denganRateLimit(request, async () => { ... })`.
// Mengembalikan Response 429 bila melebihi kuota, selanjutnya jalankan handler.
export async function denganRateLimit(
  request: Request,
  handler: () => Promise<Response>,
  max = KAPASITAS_DEFAULT,
  windowMs = JENDELA_DEFAULT_MS,
): Promise<Response> {
  const batas = await rateLimit(request, max, windowMs)
  if (batas) return batas
  return handler()
}

// Baca body teks dengan batas ukuran, sebelum JSON.parse. Content-Length
// diperiksa lebih dulu agar body raksasa tidak sempat dibaca penuh.
export async function bacaTeksTerbatas(
  request: Request,
  maksByte: number,
): Promise<string> {
  const panjang = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(panjang) && panjang > maksByte) {
    throw new GalatPayload()
  }
  // Baca bertahap dan hentikan segera saat melewati batas; `request.text()`
  // akan menelan seluruh body lebih dulu sehingga klien tanpa content-length
  // masih bisa memaksa memori server.
  const reader = request.body?.getReader()
  if (!reader) return ''
  const decoder = new TextDecoder()
  let total = 0
  let teks = ''
  try {
    let selesai = false
    while (!selesai) {
      const hasil = await reader.read()
      selesai = hasil.done
      if (hasil.done) continue
      total += hasil.value.byteLength
      if (total > maksByte) throw new GalatPayload()
      teks += decoder.decode(hasil.value, { stream: true })
    }
    return teks + decoder.decode()
  } catch (e) {
    await reader.cancel().catch(() => {})
    throw e
  }
}

export async function bacaJsonTerbatas(
  request: Request,
  maksByte: number,
): Promise<unknown> {
  return JSON.parse(await bacaTeksTerbatas(request, maksByte))
}
