import { describe, expect, it } from 'vitest'

import { GrupIdQuerySchema, IdQuerySchema } from '#/validations/id'

const CUID = 'clh3q8x9k0000abcd1234efgh'

describe('validasi query id (OW-02)', () => {
  it('IdQuerySchema menolak id kosong / ngawur', () => {
    expect(IdQuerySchema.safeParse({ id: 'bad' }).success).toBe(false)
    expect(IdQuerySchema.safeParse({ id: undefined }).success).toBe(false)
    expect(IdQuerySchema.safeParse({}).success).toBe(false)
  })

  it('IdQuerySchema menerima cuid', () => {
    expect(IdQuerySchema.safeParse({ id: CUID }).success).toBe(true)
  })

  it('GrupIdQuerySchema boleh kosong tapi menolak nilai ngawur', () => {
    expect(GrupIdQuerySchema.safeParse({ grupId: undefined }).success).toBe(
      true,
    )
    expect(GrupIdQuerySchema.safeParse({ grupId: 'bad' }).success).toBe(false)
    expect(GrupIdQuerySchema.safeParse({ grupId: CUID }).success).toBe(true)
  })
})
