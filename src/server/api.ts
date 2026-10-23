import { auth } from '#/lib/auth'
import { prisma } from '#/db'
import { GalatPayload, terjemahGalat } from './galat.js'
import type { Role } from '#/generated/prisma/enums.js'
import type { Pengguna } from '#/types/auth'

// ─── Envelope JSON standar untuk SEMUA API (web & mobile/Expo) ───// Sukses: { ok: true, data: ... }
// Gagal : { ok: false, error: { code, message } }
export function ok<T>(data: T, status = 200): Response {
  return Response.json({ ok: true, data }, { status })
}

export function gagal(code: string, message: string, status: number): Response {
  return Response.json({ ok: false, error: { code, message } }, { status })
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
