import { getRequestHeaders, getRequestIP } from '@tanstack/react-start/server'

import { prisma } from '#/db'
import { env } from '#/env'
import { GalatRateLimit } from './galat.js'
import type { HasilBatasi } from '#/types/rate-limit'

const MILI_TOKEN = 1_000
export const KAPASITAS_DEFAULT = 100
export const JENDELA_DEFAULT_MS = 60_000
export const IDLE_MS = 30 * 60_000

// Rate limit bersama berbasis Postgres: atomik dan berlaku lintas instance
// server (bukan in-memory per-proses). Baris lama disapu sesekali.
let hitunganSapu = 0

export interface HasilHitungToken extends HasilBatasi {
  tokenMili: number
}

// Token bucket murni: `hit` di DB menyimpan token x 1.000 agar pengisian
// ulang fraksional tetap presisi. Baris idle >= 30 menit otomatis penuh.
export function hitungTokenBucket({
  tokenMili,
  diperbaruiPada,
  sekarang,
  kapasitas,
  jendelaMs,
}: {
  tokenMili: number
  diperbaruiPada: Date
  sekarang: Date
  kapasitas: number
  jendelaMs: number
}): HasilHitungToken {
  const kapasitasMili = Math.max(1, Math.floor(kapasitas)) * MILI_TOKEN
  const jendela = Math.max(1, Math.floor(jendelaMs))
  const lajuPerMs = kapasitasMili / jendela
  const berlaluMs = Math.max(0, sekarang.getTime() - diperbaruiPada.getTime())
  const tersediaMili = Math.min(
    kapasitasMili,
    Math.max(0, tokenMili) + berlaluMs * lajuPerMs,
  )

  if (tersediaMili >= MILI_TOKEN) {
    return {
      boleh: true,
      retryAfter: 0,
      tokenMili: Math.floor(tersediaMili - MILI_TOKEN),
    }
  }

  const butuhMili = MILI_TOKEN - tersediaMili
  return {
    boleh: false,
    retryAfter: Math.max(1, Math.ceil(butuhMili / lajuPerMs / 1000)),
    tokenMili: Math.floor(tersediaMili),
  }
}

export async function batasi(
  kunci: string,
  max = KAPASITAS_DEFAULT,
  windowMs = JENDELA_DEFAULT_MS,
): Promise<HasilBatasi> {
  const kapasitas = Math.max(1, Math.floor(max))
  const jendela = Math.max(1, Math.floor(windowMs))
  const kapasitasMili = kapasitas * MILI_TOKEN

  const hasil = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO "rate_limit" ("key", "hit", "resetAt")
      VALUES (${kunci}, ${kapasitasMili}, now())
      ON CONFLICT ("key") DO NOTHING
    `
    const rows = await tx.$queryRaw<
      { hit: number; resetAt: Date }[]
    >`SELECT "hit", "resetAt" FROM "rate_limit" WHERE "key" = ${kunci} FOR UPDATE`
    const row = rows.at(0)
    if (row === undefined) throw new Error('Baris rate limit tidak ditemukan')

    const sekarang = new Date()
    const hitung = hitungTokenBucket({
      tokenMili: row.hit,
      diperbaruiPada: row.resetAt,
      sekarang,
      kapasitas,
      jendelaMs: jendela,
    })
    await tx.rateLimit.update({
      where: { key: kunci },
      data: { hit: hitung.tokenMili, resetAt: sekarang },
    })
    return hitung
  })

  hitunganSapu += 1
  if (hitunganSapu % 200 === 0) {
    await prisma.rateLimit.deleteMany({
      where: { resetAt: { lt: new Date(Date.now() - IDLE_MS) } },
    })
  }

  return { boleh: hasil.boleh, retryAfter: hasil.retryAfter }
}

export interface PilihanIpKlien {
  xForwardedFor?: string | null
  socketIp?: string | null
  trustProxy?: boolean
  hops?: number
}

function bersihkanIp(nilai: string | null | undefined): string | null {
  const ip = nilai?.trim()
  if (!ip || ip.toLowerCase() === 'unknown') return null
  return ip
}

// XFF dari kiri bisa dipalsukan klien. Saat TRUST_PROXY aktif, baca dari kanan:
// `hops` = jumlah proxy tepercaya yang menambahkan entri, jadi entri ke-`hops`
// dari kanan adalah klien asli. Vercel = 1 hop. Bila jumlah hop melebihi entri,
// pakai entri paling kiri (perilaku aman untuk header satu nilai).
export function pilihIpKlien({
  xForwardedFor,
  socketIp,
  trustProxy = false,
  hops = 1,
}: PilihanIpKlien): string {
  const soket = bersihkanIp(socketIp)
  if (!trustProxy) return soket ?? 'unknown'

  const entri = (xForwardedFor ?? '')
    .split(',')
    .map((bagian) => bersihkanIp(bagian))
    .filter((bagian): bagian is string => bagian !== null)
  if (entri.length === 0) return soket ?? 'unknown'

  const jumlahHop = Number.isFinite(hops) ? Math.max(1, Math.floor(hops)) : 1
  const lompat = Math.min(entri.length, jumlahHop)
  return entri.at(entri.length - lompat) ?? soket ?? 'unknown'
}

// IP klien tepercaya: header proxy hanya dipakai bila TRUST_PROXY aktif,
// selain itu pakai alamat soket dari event server (tak bisa dipalsukan klien).
export function ipSaatIni(): string {
  try {
    return pilihIpKlien({
      xForwardedFor: getRequestHeaders().get('x-forwarded-for'),
      socketIp: getRequestIP(),
      trustProxy: env.TRUST_PROXY,
      hops: env.TRUST_PROXY_HOPS,
    })
  } catch {
    return 'unknown'
  }
}

// Pembungkus untuk route REST: kembalikan Response 429 bila melebihi batas.
function responsRateLimit(hasil: HasilBatasi, max: number): Response {
  return new Response(
    JSON.stringify({
      ok: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Terlalu banyak permintaan',
      },
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(hasil.retryAfter),
        'X-RateLimit-Limit': String(max),
        'X-RateLimit-Remaining': '0',
      },
    },
  )
}

export async function rateLimit(
  request: Request,
  max = KAPASITAS_DEFAULT,
  windowMs = JENDELA_DEFAULT_MS,
): Promise<Response | null> {
  const kunci = `${new URL(request.url).pathname}:${ipSaatIni()}`
  const hasil = await batasi(kunci, max, windowMs)
  if (hasil.boleh) return null
  return responsRateLimit(hasil, max)
}

// Endpoint terautentikasi: kunci per pengguna, bukan hanya IP, agar kuota
// tidak bisa dihabiskan orang lain di balik NAT yang sama.
export async function rateLimitPengguna(
  userId: string,
  aksi: string,
  max = KAPASITAS_DEFAULT,
  windowMs = JENDELA_DEFAULT_MS,
): Promise<Response | null> {
  const kunci = `user:${userId}:${aksi}`
  const hasil = await batasi(kunci, max, windowMs)
  if (hasil.boleh) return null
  return responsRateLimit(hasil, max)
}

export async function rateLimitPrinter(
  userId: string,
  aksi: string,
  max = KAPASITAS_DEFAULT,
  windowMs = JENDELA_DEFAULT_MS,
): Promise<Response | null> {
  const hasil = await batasi(`printer:${aksi}:${userId}`, max, windowMs)
  if (hasil.boleh) return null
  return responsRateLimit(hasil, max)
}

// Pembungkus untuk server function: lempar GalatRateLimit (dipetakan ke 429).
export async function batasiNama(
  nama: string,
  max = KAPASITAS_DEFAULT,
  windowMs = JENDELA_DEFAULT_MS,
): Promise<void> {
  const hasil = await batasi(`${nama}:${ipSaatIni()}`, max, windowMs)
  if (!hasil.boleh) throw new GalatRateLimit()
}
