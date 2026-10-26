import { describe, expect, it } from 'vitest'

import {
  bangunRekap,
  isoWeek,
  keCsv,
  kunciPeriode,
  ringkasBaris,
} from '../../src/server/laporanPenjualan.js'
import type { BarisTransaksi } from '#/types/laporan-penjualan'

const baris = (over: Partial<BarisTransaksi> = {}): BarisTransaksi => {
  const b: BarisTransaksi = {
    tanggal: new Date('2025-01-15T10:00:00'),
    subtotal: 10000,
    diskon: 0,
    pajak: 0,
    ongkir: 0,
    total: 10000,
    hpp: 4000,
    qtyTerjual: 1,
    kategoriId: null,
    kategoriNama: null,
    kasirId: null,
    shiftId: null,
    memberId: null,
    metodeBayar: 'TUNAI',
    mejaId: null,
    deliveryId: null,
    sumber: 'POS',
    statusPesanan: 'SELESAI',
    pajakJenis: null,
    ...over,
  }
  return b
}

describe('kunciPeriode', () => {
  it('harian = YYYY-MM-DD', () => {
    expect(kunciPeriode(new Date('2025-01-15T23:00:00'), 'harian')).toBe(
      '2025-01-15',
    )
  })

  it('bulanan = YYYY-MM', () => {
    expect(kunciPeriode(new Date('2025-01-15T00:00:00'), 'bulanan')).toBe(
      '2025-01',
    )
  })

  it('mingguan = YYYY-Www (ISO, Senin awal minggu)', () => {
    // 2025-01-15 (Rabu) → minggu ke-3
    expect(kunciPeriode(new Date('2025-01-15T00:00:00'), 'mingguan')).toBe(
      '2025-W03',
    )
    // 2024-12-30 (Senin) masuk minggu ISO pertama 2025
    expect(kunciPeriode(new Date('2024-12-30T00:00:00'), 'mingguan')).toBe(
      '2025-W01',
    )
  })

  it('isoWeek mengembalikan tahun & minggu', () => {
    expect(isoWeek(new Date('2024-12-30T00:00:00'))).toEqual({
      tahun: 2025,
      minggu: 1,
    })
  })
})

describe('bangunRekap', () => {
  it('mengelompokkan per periode dan mengurutkan naik', () => {
    const rekap = bangunRekap(
      [
        baris({ tanggal: new Date('2025-01-02T10:00:00') }),
        baris({ tanggal: new Date('2025-01-01T10:00:00') }),
        baris({ tanggal: new Date('2025-01-01T15:00:00') }),
      ],
      'harian',
    )
    expect(rekap.map((r) => r.periode)).toEqual(['2025-01-01', '2025-01-02'])
    expect(rekap[0].jumlahTransaksi).toBe(2)
    expect(rekap[0].omzet).toBe(20000)
    expect(rekap[0].labaKotor).toBe(12000)
  })

  it('mengelompokkan mingguan', () => {
    const rekap = bangunRekap(
      [
        baris({ tanggal: new Date('2025-01-06T10:00:00') }),
        baris({ tanggal: new Date('2025-01-13T10:00:00') }),
      ],
      'mingguan',
    )
    expect(rekap.map((r) => r.periode)).toEqual(['2025-W02', '2025-W03'])
  })
})

describe('ringkasBaris', () => {
  it('menjumlahkan seluruh metrik dan menghitung omzet/laba', () => {
    const r = ringkasBaris([
      baris({
        subtotal: 10000,
        diskon: 1000,
        pajak: 500,
        ongkir: 2000,
        total: 11500,
        hpp: 4000,
      }),
      baris({
        subtotal: 5000,
        diskon: 0,
        pajak: 0,
        ongkir: 0,
        total: 5000,
        hpp: 2000,
      }),
    ])
    expect(r.jumlahTransaksi).toBe(2)
    expect(r.subtotal).toBe(15000)
    expect(r.diskon).toBe(1000)
    expect(r.pajak).toBe(500)
    expect(r.ongkir).toBe(2000)
    expect(r.total).toBe(16500)
    expect(r.omzet).toBe(14000) // (10000-1000) + 5000
    expect(r.hpp).toBe(6000)
    expect(r.labaKotor).toBe(8000) // 9000 + 3000 - 4000
  })

  it('kosong → semua nol', () => {
    expect(ringkasBaris([]).jumlahTransaksi).toBe(0)
    expect(ringkasBaris([]).omzet).toBe(0)
  })
})

describe('keCsv', () => {
  it('meng-escape sel dengan koma, kutip, dan newline', () => {
    expect(keCsv([['a,b', 'c"d', 'e\nf', 'g']])).toBe('"a,b","c""d","e\nf",g')
  })

  it('menggabungkan baris dengan CRLF', () => {
    expect(keCsv([['a'], ['b']])).toBe('a\r\nb')
  })

  it('menyanitasi formula sebelum quoting', () => {
    expect(keCsv([['=1+1,evil']])).toBe('"\'=1+1,evil"')
    expect(keCsv([['+62 812']])).toBe("'+62 812")
    expect(keCsv([['-5']])).toBe("'-5")
    expect(keCsv([['@SUM(A1:A2)']])).toBe("'@SUM(A1:A2)")
    expect(keCsv([['  =1+1']])).toBe("'  =1+1")
  })
})
