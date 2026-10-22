import { describe, expect, it } from 'vitest'

import {
  hitungPajak,
  hitungTotal,
  POIN_RUPIAH,
} from '../../src/lib/kasir-total.js'

const dasar = {
  subtotal: 100000,
  diskon: 0,
  pajakPersen: 0,
  tukarPoin: 0,
  memberPoin: 0,
  tarif: 0,
}

describe('hitungTotal', () => {
  it('tanpa diskon/poin/ongkir = subtotal', () => {
    expect(hitungTotal(dasar).total).toBe(100000)
  })

  it('menjumlahkan pajak & ongkir', () => {
    const { pajak, total } = hitungTotal({
      ...dasar,
      pajakPersen: 11,
      tarif: 8000,
    })
    expect(pajak).toBe(11000)
    expect(total).toBe(119000)
  })

  it('pajak dihitung dari pokok setelah diskon & poin', () => {
    const { pajak } = hitungTotal({
      ...dasar,
      diskon: 20000,
      tukarPoin: 100,
      memberPoin: 100,
      pajakPersen: 10,
    })
    expect(pajak).toBe(Math.round((100000 - 20000 - 100 * POIN_RUPIAH) * 0.1))
  })

  it('diskon dibatasi subtotal (tidak negatif)', () => {
    const { diskon, total } = hitungTotal({ ...dasar, diskon: 150000 })
    expect(diskon).toBe(100000)
    expect(total).toBe(0)
  })

  it('poin dibatasi saldo member', () => {
    const { pakai, total } = hitungTotal({
      ...dasar,
      tukarPoin: 500,
      memberPoin: 120,
    })
    expect(pakai).toBe(120)
    expect(total).toBe(100000 - 120 * POIN_RUPIAH)
  })

  it('poin dibatasi nilai belanja setelah diskon', () => {
    const { pakai } = hitungTotal({
      ...dasar,
      subtotal: 5000,
      tukarPoin: 999,
      memberPoin: 999,
    })
    expect(pakai).toBe(Math.floor(5000 / POIN_RUPIAH))
  })

  it('nilai negatif diklem ke 0', () => {
    const { diskon, pakai, pajak, total } = hitungTotal({
      ...dasar,
      diskon: -5000,
      pajakPersen: -5,
      tarif: -2000,
      tukarPoin: -3,
    })
    expect(diskon).toBe(0)
    expect(pakai).toBe(0)
    expect(pajak).toBe(0)
    expect(total).toBe(100000)
  })
})

describe('hitungPajak', () => {
  it('menghitung persen dari pokok & dibulatkan', () => {
    expect(hitungPajak(33333, 10)).toBe(3333)
  })

  it('tarif diklem 0..100 dan pokok negatif jadi 0', () => {
    expect(hitungPajak(100000, 150)).toBe(100000)
    expect(hitungPajak(100000, -10)).toBe(0)
    expect(hitungPajak(-500, 10)).toBe(0)
  })
})
