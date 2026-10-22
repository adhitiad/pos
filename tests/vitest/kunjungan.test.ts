import { describe, expect, it } from 'vitest'

import { kunciPeriodeKunjungan, normalkanPath } from '#/server/kunjungan'

describe('kunjungan — normalkanPath', () => {
  it('menerima path relatif apa adanya', () => {
    expect(normalkanPath('/kasir')).toBe('/kasir')
  })

  it('mengambil pathname dari URL absolut', () => {
    expect(normalkanPath('https://pos.example.com/kasir?a=1#x')).toBe('/kasir')
  })

  it('menambahkan slash depan bila perlu', () => {
    expect(normalkanPath('kasir')).toBe('/kasir')
  })

  it('menolak protocol-relative //host', () => {
    expect(normalkanPath('//evil.com/kasir')).toBeNull()
  })

  it('menolak kosong/null', () => {
    expect(normalkanPath('')).toBeNull()
    expect(normalkanPath(null)).toBeNull()
    expect(normalkanPath(undefined)).toBeNull()
  })

  it('menolak path terlalu panjang', () => {
    expect(normalkanPath(`/${'a'.repeat(200)}`)).toBeNull()
  })
})

describe('kunjungan — kunciPeriodeKunjungan', () => {
  it('harian → YYYY-MM-DD', () => {
    expect(kunciPeriodeKunjungan(new Date(2026, 2, 5), 'harian')).toBe(
      '2026-03-05',
    )
  })

  it('bulanan → YYYY-MM', () => {
    expect(kunciPeriodeKunjungan(new Date(2026, 2, 5), 'bulanan')).toBe(
      '2026-03',
    )
  })

  it('tahunan → YYYY', () => {
    expect(kunciPeriodeKunjungan(new Date(2026, 2, 5), 'tahunan')).toBe('2026')
  })

  it('mingguan → ISO week (Senin 2026-01-05 = W02)', () => {
    expect(kunciPeriodeKunjungan(new Date(2026, 0, 5), 'mingguan')).toBe(
      '2026-W02',
    )
  })

  it('mingguan → Minggu masuk minggu yang sama', () => {
    expect(kunciPeriodeKunjungan(new Date(2026, 0, 4), 'mingguan')).toBe(
      '2026-W01',
    )
  })
})
