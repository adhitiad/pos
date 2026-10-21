import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { logger } from '#/lib/logger'
import { GalatDomain, terjemahGalat } from '#/server/galat'

describe('terjemahGalat (SEC-01)', () => {
  it('GalatDomain → 422 dengan pesan asli', () => {
    expect(terjemahGalat(new GalatDomain('Stok habis'))).toEqual({
      status: 422,
      code: 'DOMAIN',
      message: 'Stok habis',
    })
  })

  it('ZodError → 400 dengan pesan issue pertama', () => {
    const schema = z.object({ a: z.string().min(1, 'wajib diisi') })
    let err: unknown
    try {
      schema.parse({ a: '' })
    } catch (e) {
      err = e
    }
    const hasil = terjemahGalat(err)
    expect(hasil.status).toBe(400)
    expect(hasil.message).toBe('wajib diisi')
  })

  it('SyntaxError → 400 body JSON', () => {
    expect(terjemahGalat(new SyntaxError('Unexpected token')).status).toBe(400)
  })

  it('guard UNAUTHORIZED/FORBIDDEN → 401/403', () => {
    expect(terjemahGalat(new Error('UNAUTHORIZED')).status).toBe(401)
    expect(terjemahGalat(new Error('FORBIDDEN')).status).toBe(403)
  })

  it('error tak terduga → 500 generik + ref tanpa membocorkan pesan', () => {
    const spy = vi.spyOn(logger, 'error').mockImplementation(() => logger)
    const mentah = new Error(
      'PrismaClientKnownRequestError P2002: Unique constraint on User.email',
    )
    const hasil = terjemahGalat(mentah)
    expect(hasil.status).toBe(500)
    expect(hasil.code).toBe('INTERNAL')
    expect(hasil.ref).toBeTruthy()
    expect(hasil.message).not.toContain('P2002')
    expect(hasil.message).toContain(hasil.ref!)
    expect(spy).toHaveBeenCalledOnce()
    spy.mockRestore()
  })
})
