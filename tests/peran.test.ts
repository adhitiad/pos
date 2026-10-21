import { describe, expect, it } from 'vitest'

import { AKSES, punyaAkses } from '#/server/peran'

describe('peran — matriks akses', () => {
  it('operasional = pemilik & kasir', () => {
    expect(punyaAkses('OWNER', 'operasional')).toBe(true)
    expect(punyaAkses('KASIR', 'operasional')).toBe(true)
    expect(punyaAkses('MEMBER', 'operasional')).toBe(false)
  })

  it('manajerial = pemilik saja', () => {
    expect(punyaAkses('OWNER', 'manajerial')).toBe(true)
    expect(punyaAkses('KASIR', 'manajerial')).toBe(false)
    expect(punyaAkses('MEMBER', 'manajerial')).toBe(false)
  })

  it('semua = seluruh peran login', () => {
    for (const role of AKSES.semua) {
      expect(punyaAkses(role, 'semua')).toBe(true)
    }
  })
})
