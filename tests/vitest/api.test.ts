import { afterAll, describe, expect, it } from 'vitest'

import { prisma } from '#/db'
import { apiError, bacaTeksTerbatas, gagal, ok } from '#/server/api'
import { GalatDomain, GalatPayload, GalatRateLimit } from '#/server/galat'
import {
  batasi,
  hitungTokenBucket,
  pilihIpKlien,
  rateLimitPengguna,
  rateLimitPrinter,
} from '#/server/rateLimit'

const kunciUji: string[] = []
const kunciBaru = (nama: string) => {
  const k = `uji:${nama}:${crypto.randomUUID()}`
  kunciUji.push(k)
  return k
}

afterAll(async () => {
  await prisma.rateLimit.deleteMany({ where: { key: { in: kunciUji } } })
})

describe('api — envelope', () => {
  it('ok membungkus data sukses', async () => {
    const res = ok({ a: 1 })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, data: { a: 1 } })
  })

  it('gagal membungkus error terstruktur', async () => {
    const res = gagal('KODE', 'pesan', 400)
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      ok: false,
      error: { code: 'KODE', message: 'pesan' },
    })
  })
})

describe('api — batas body', () => {
  it('membaca body di bawah batas', async () => {
    const req = new Request('http://localhost/', {
      method: 'POST',
      body: 'halo',
    })
    await expect(bacaTeksTerbatas(req, 10)).resolves.toBe('halo')
  })

  it('menolak body di atas batas meski tanpa content-length', async () => {
    const req = new Request('http://localhost/', {
      method: 'POST',
      body: 'x'.repeat(20),
    })
    req.headers.delete('content-length')
    await expect(bacaTeksTerbatas(req, 10)).rejects.toBeInstanceOf(GalatPayload)
  })
})

describe('api — apiError', () => {
  it('GalatDomain → 422 dengan pesan asli', async () => {
    const res = apiError(new GalatDomain('tidak boleh'))
    expect(res.status).toBe(422)
    const body = (await res.json()) as {
      ok: boolean
      error: { message: string }
    }
    expect(body.ok).toBe(false)
    expect(body.error.message).toBe('tidak boleh')
  })

  it('GalatRateLimit → 429', async () => {
    const res = apiError(new GalatRateLimit())
    expect(res.status).toBe(429)
    const body = (await res.json()) as {
      ok: boolean
      error: { code: string; message: string }
    }
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe('TOO_MANY_REQUESTS')
  })

  it('error tak dikenal → 500 tanpa bocoran pesan', async () => {
    const res = apiError(new Error('rahasia isi database'))
    expect(res.status).toBe(500)
    const body = (await res.json()) as {
      ok: boolean
      error: { message: string }
    }
    expect(body.ok).toBe(false)
    expect(body.error.message).not.toContain('rahasia')
  })
})

describe('token bucket — logika murni', () => {
  const awal = new Date('2026-10-22T00:00:00.000Z')

  it('mengisi ulang 100 token per menit secara linear', () => {
    const hasil = hitungTokenBucket({
      tokenMili: 0,
      diperbaruiPada: awal,
      sekarang: new Date(awal.getTime() + 60_000),
      kapasitas: 100,
      jendelaMs: 60_000,
    })
    expect(hasil.boleh).toBe(true)
    expect(hasil.tokenMili).toBe(99_000)
  })

  it('menahan saat kosong dan menghitung Retry-After', () => {
    const hasil = hitungTokenBucket({
      tokenMili: 0,
      diperbaruiPada: awal,
      sekarang: awal,
      kapasitas: 100,
      jendelaMs: 60_000,
    })
    expect(hasil.boleh).toBe(false)
    expect(hasil.retryAfter).toBe(1)
  })

  it('tidak menambah token melebihi kapasitas', () => {
    const hasil = hitungTokenBucket({
      tokenMili: 99_500,
      diperbaruiPada: awal,
      sekarang: new Date(awal.getTime() + 3_600_000),
      kapasitas: 100,
      jendelaMs: 60_000,
    })
    expect(hasil.boleh).toBe(true)
    expect(hasil.tokenMili).toBe(99_000)
  })
})

describe('rate limit — IP klien dari proxy', () => {
  it('tanpa TRUST_PROXY mengabaikan X-Forwarded-For', () => {
    expect(
      pilihIpKlien({
        xForwardedFor: '203.0.113.9',
        socketIp: '10.0.0.7',
        trustProxy: false,
      }),
    ).toBe('10.0.0.7')
  })

  it('satu hop memakai entri paling kanan, bukan spoof klien', () => {
    expect(
      pilihIpKlien({
        xForwardedFor: '1.2.3.4, 203.0.113.9',
        socketIp: '10.0.0.7',
        trustProxy: true,
        hops: 1,
      }),
    ).toBe('203.0.113.9')
  })

  it('dua hop melewati dua entri proxy dari kanan', () => {
    expect(
      pilihIpKlien({
        xForwardedFor: '1.2.3.4, 203.0.113.9, 10.0.0.8',
        socketIp: '10.0.0.7',
        trustProxy: true,
        hops: 2,
      }),
    ).toBe('203.0.113.9')
  })

  it('header kosong/kotor jatuh ke alamat soket', () => {
    expect(
      pilihIpKlien({
        xForwardedFor: ' , unknown, ',
        socketIp: '10.0.0.7',
        trustProxy: true,
      }),
    ).toBe('10.0.0.7')
  })

  it('jumlah hop melebihi entri memakai entri pertama', () => {
    expect(
      pilihIpKlien({
        xForwardedFor: '203.0.113.9',
        socketIp: '10.0.0.7',
        trustProxy: true,
        hops: 4,
      }),
    ).toBe('203.0.113.9')
  })
})

describe('api — rate limit (store bersama)', () => {
  it('mengizinkan sampai batas lalu menolak', async () => {
    const kunci = kunciBaru('batas')
    for (let i = 0; i < 3; i++) {
      expect((await batasi(kunci, 3)).boleh).toBe(true)
    }
    const tolak = await batasi(kunci, 3)
    expect(tolak.boleh).toBe(false)
    expect(tolak.retryAfter).toBeGreaterThan(0)
  })

  it('kunci berbeda punya jatah terpisah', async () => {
    const a = kunciBaru('a')
    const b = kunciBaru('b')
    expect((await batasi(a, 1)).boleh).toBe(true)
    expect((await batasi(a, 1)).boleh).toBe(false)
    expect((await batasi(b, 1)).boleh).toBe(true)
  })

  it('mengisi ulang token setelah jendela berjalan', async () => {
    const kunci = kunciBaru('isi-ulang')
    expect((await batasi(kunci, 1, 2_000)).boleh).toBe(true)
    expect((await batasi(kunci, 1, 2_000)).boleh).toBe(false)
    await new Promise((resolve) => setTimeout(resolve, 2_200))
    expect((await batasi(kunci, 1, 2_000)).boleh).toBe(true)
  })

  it('baris idle 30 menit dimulai dari bucket penuh', async () => {
    const kunci = kunciBaru('idle')
    await prisma.rateLimit.create({
      data: {
        key: kunci,
        hit: 0,
        resetAt: new Date(Date.now() - 31 * 60_000),
      },
    })
    expect((await batasi(kunci, 1)).boleh).toBe(true)
  })

  it('hanya satu request paralel yang lolos untuk bucket kosong', async () => {
    const kunci = kunciBaru('paralel')
    const hasil = await Promise.all(
      Array.from({ length: 5 }, () => batasi(kunci, 1)),
    )
    expect(hasil.filter((h) => h.boleh)).toHaveLength(1)
  })
})

describe('api — rate limit printer per user', () => {
  it('menolak setelah batas dengan envelope dan Retry-After', async () => {
    const userA = crypto.randomUUID()
    const userB = crypto.randomUUID()
    kunciUji.push(`printer:uji:${userA}`, `printer:uji:${userB}`)

    expect(await rateLimitPrinter(userA, 'uji', 2)).toBeNull()
    expect(await rateLimitPrinter(userA, 'uji', 2)).toBeNull()

    const tolak = await rateLimitPrinter(userA, 'uji', 2)
    expect(tolak?.status).toBe(429)
    expect(tolak?.headers.get('Retry-After')).toMatch(/^\d+$/)
    expect(tolak?.headers.get('X-RateLimit-Limit')).toBe('2')
    expect(tolak?.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(await tolak?.json()).toEqual({
      ok: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Terlalu banyak permintaan',
      },
    })

    expect(await rateLimitPrinter(userB, 'uji', 1)).toBeNull()
    expect(await rateLimitPrinter(userB, 'uji', 1)).not.toBeNull()
  })
})

describe('api — rate limit per pengguna terautentikasi', () => {
  it('kuota user A tidak menghabiskan kuota user B di IP yang sama', async () => {
    const userA = crypto.randomUUID()
    const userB = crypto.randomUUID()
    const aksi = `uji-bayar-${crypto.randomUUID()}`
    kunciUji.push(`user:${userA}:${aksi}`, `user:${userB}:${aksi}`)

    expect(await rateLimitPengguna(userA, aksi, 2)).toBeNull()
    expect(await rateLimitPengguna(userA, aksi, 2)).toBeNull()
    const tolak = await rateLimitPengguna(userA, aksi, 2)
    expect(tolak?.status).toBe(429)
    expect(await rateLimitPengguna(userB, aksi, 1)).toBeNull()
  })
})
