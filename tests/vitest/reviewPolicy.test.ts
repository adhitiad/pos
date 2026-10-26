import { describe, expect, it } from 'vitest'

import { bolehReviewTransaksi } from '#/server/reviewPolicy'

const dasar = { peninjauId: 'kasir-1', pembuatDraftId: 'kasir-1' }

describe('reviewPolicy — kewenangan memutus draft', () => {
  it('mode kasir: kasir boleh menyetujui draft sendiri', () => {
    expect(
      bolehReviewTransaksi({
        ...dasar,
        mode: 'kasir',
        peran: 'KASIR',
      }).boleh,
    ).toBe(true)
  })

  it('mode kasir: kasir tidak boleh menyetujui draft kasir lain', () => {
    const hasil = bolehReviewTransaksi({
      mode: 'kasir',
      peran: 'KASIR',
      peninjauId: 'kasir-2',
      pembuatDraftId: 'kasir-1',
    })
    expect(hasil.boleh).toBe(false)
    expect(hasil.kode).toBe('BUKAN_PEMILIK')
    expect(hasil.alasan).toContain('sendiri')
  })

  it('mode owner: kasir tidak boleh memutus meski draft sendiri', () => {
    const hasil = bolehReviewTransaksi({
      ...dasar,
      mode: 'owner',
      peran: 'KASIR',
    })
    expect(hasil.boleh).toBe(false)
    expect(hasil.kode).toBe('MENUNGGU_OWNER')
    expect(hasil.alasan).toContain('owner')
  })

  it('owner selalu boleh memutus di kedua mode', () => {
    for (const mode of ['kasir', 'owner'] as const) {
      expect(
        bolehReviewTransaksi({
          mode,
          peran: 'OWNER',
          peninjauId: 'owner-1',
          pembuatDraftId: 'kasir-1',
        }).boleh,
      ).toBe(true)
    }
  })

  it('peran di luar kasir/owner ditolak', () => {
    expect(
      bolehReviewTransaksi({
        ...dasar,
        mode: 'kasir',
        peran: 'MEMBER',
      }).boleh,
    ).toBe(false)
  })
})
