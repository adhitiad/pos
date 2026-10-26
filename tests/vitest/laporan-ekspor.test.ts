import { describe, expect, it } from 'vitest'

import { eksporCsv, eksporXlsx } from '#/server/laporanEkspor'
import type { LaporanPenjualan } from '#/types/laporan-penjualan'

const laporan: LaporanPenjualan = {
  dari: '2026-01-01',
  sampai: '2026-01-31',
  grup: 'harian',
  ringkasan: {
    jumlahTransaksi: 2,
    qtyTerjual: 3,
    subtotal: 100,
    diskon: 10,
    pajak: 5,
    ongkir: 0,
    total: 95,
    omzet: 90,
    hpp: 40,
    labaKotor: 50,
    poinTerpakai: 0,
    poinDapat: 0,
  },
  rekap: [
    {
      periode: '2026-01-01',
      jumlahTransaksi: 2,
      omzet: 90,
      hpp: 40,
      labaKotor: 50,
      total: 95,
    },
  ],
  produkTerlaris: [{ produkId: 'p1', nama: 'Kopi Susu', qty: 2, omzet: 90 }],
  performaKasir: [
    { kasirId: 'u1', nama: 'Budi', jumlahTransaksi: 2, omzet: 90 },
  ],
}

describe('laporanEkspor — CSV', () => {
  it('menghasilkan nama, tipe, dan isi CSV dengan BOM', () => {
    const hasil = eksporCsv(laporan)
    expect(hasil.nama).toBe('laporan-penjualan_2026-01-01_2026-01-31.csv')
    expect(hasil.tipe.startsWith('text/csv')).toBe(true)
    expect(hasil.isi[0]).toBe(0xef)
    const teks = hasil.isi.toString('utf8')
    expect(teks).toContain('Kopi Susu')
    expect(teks).toContain('Performa kasir')
  })
})

describe('laporanEkspor — XLSX', () => {
  it('menghasilkan berkas xlsx non-kosong', () => {
    const hasil = eksporXlsx(laporan)
    expect(hasil.nama).toBe('laporan-penjualan_2026-01-01_2026-01-31.xlsx')
    expect(hasil.tipe).toContain('spreadsheetml')
    expect(hasil.isi.length).toBeGreaterThan(0)
  })
})
