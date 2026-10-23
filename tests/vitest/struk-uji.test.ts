import { describe, expect, it } from 'vitest'

import { barisStrukUji, strukUji } from '../../src/lib/struk-uji.js'

describe('struk uji printer', () => {
  it('memakai pesanan & member dummy dengan total yang konsisten', () => {
    const payload = strukUji(new Date('2026-10-22T10:30:00.000Z'))
    expect(payload.nomor).toBe('TEST-20261022-0001')
    expect(payload.memberNama).toBe('Member Demo')
    expect(payload.items.length).toBeGreaterThan(0)
    expect(payload.total).toBe(
      payload.subtotal - payload.diskon + payload.pajak,
    )
    expect(payload.kembalian).toBe((payload.uangDiterima ?? 0) - payload.total)
  })

  it('menyusun baris ESC/POS tanpa karakter kontrol', () => {
    const payload = strukUji(new Date('2026-10-22T10:30:00.000Z'))
    const baris = barisStrukUji(payload, 'Toko Uji')
    const teks = baris.join('\n')

    expect(teks).toContain('Toko Uji')
    expect(teks).toContain('Member: Member Demo')
    expect(teks).toContain('Kopi Susu Gula Aren')
    expect(teks).toContain('*** DATA UJI / DUMMY ***')
    expect(
      baris.every((b) =>
        [...b].every((karakter) => {
          const kode = karakter.charCodeAt(0)
          return kode >= 32 && kode !== 127
        }),
      ),
    ).toBe(true)
    expect(baris.every((b) => b.length <= 32)).toBe(true)
  })

  it('mengikuti lebar kolom 80 mm (48 karakter)', () => {
    const payload = strukUji(new Date('2026-10-22T10:30:00.000Z'))
    const baris = barisStrukUji(payload, 'Toko Uji', 48)
    const garis = baris.filter((b) => /^-+$/.test(b))

    expect(garis.length).toBeGreaterThan(0)
    expect(garis.every((b) => b.length === 48)).toBe(true)
    expect(baris.every((b) => b.length <= 48)).toBe(true)
  })
})
