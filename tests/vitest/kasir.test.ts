import { describe, expect, it } from 'vitest'

import { kasirData, laporanBukuBesar } from '#/server/kasir'

describe('kasir — kasirData', () => {
  it('mengembalikan struktur master kasir', async () => {
    const data = await kasirData()
    expect(Array.isArray(data.kategori)).toBe(true)
    expect(Array.isArray(data.produk)).toBe(true)
    expect(Array.isArray(data.member)).toBe(true)
    expect(Array.isArray(data.delivery)).toBe(true)
    expect(typeof data.penjualanHariIni.total).toBe('number')
    expect(typeof data.penjualanHariIni.jumlah).toBe('number')
    expect(typeof data.keuntunganHariIni.kotor).toBe('number')
  })
})

describe('kasir — laporanBukuBesar', () => {
  it('rentang valid → akun/pembuka/entri/trial', async () => {
    const hasil = await laporanBukuBesar({
      dari: '2026-01-01',
      sampai: '2026-01-31',
    })
    expect(Array.isArray(hasil.akun)).toBe(true)
    expect(Array.isArray(hasil.pembuka)).toBe(true)
    expect(Array.isArray(hasil.entri)).toBe(true)
    expect(Array.isArray(hasil.trial)).toBe(true)
  })

  it('rentang terbalik → GalatDomain', async () => {
    await expect(
      laporanBukuBesar({ dari: '2026-02-01', sampai: '2026-01-01' }),
    ).rejects.toThrow('Rentang tanggal tidak valid')
  })
})
