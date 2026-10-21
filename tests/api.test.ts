import { afterAll, describe, expect, it } from 'vitest'

import { prisma } from '#/db'
import { apiError, gagal, ok } from '#/server/api'
import { GalatDomain, GalatRateLimit } from '#/server/galat'
import { batasi } from '#/server/rateLimit'

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
})
