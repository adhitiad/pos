import { describe, expect, it } from 'vitest'

import {
  KUNCI_PAJAK_LEGACY,
  KUNCI_PAJAK_RETAIL,
  KUNCI_PAJAK_RESTO,
  normalisasiPersen,
  tarifPajak,
} from '#/server/pajak'
import { hitungPajak } from '#/server/postingHitung'

describe('tarif pajak: PB1 restoran/cafe vs PPN retail', () => {
  it('mode F&B memakai pajak_resto_persen dengan jenis PB1', () => {
    const t = tarifPajak(
      { [KUNCI_PAJAK_RESTO]: '10', [KUNCI_PAJAK_RETAIL]: '11' },
      true,
    )
    expect(t).toEqual({ persen: 10, jenis: 'PB1' })
  })

  it('mode retail memakai pajak_retail_persen dengan jenis PPN', () => {
    const t = tarifPajak(
      { [KUNCI_PAJAK_RESTO]: '10', [KUNCI_PAJAK_RETAIL]: '11' },
      false,
    )
    expect(t).toEqual({ persen: 11, jenis: 'PPN' })
  })

  it('fallback ke pajak_persen (legacy) bila kunci baru kosong', () => {
    expect(tarifPajak({ [KUNCI_PAJAK_LEGACY]: '7' }, true)).toEqual({
      persen: 7,
      jenis: 'PB1',
    })
    expect(tarifPajak({ [KUNCI_PAJAK_LEGACY]: '7' }, false)).toEqual({
      persen: 7,
      jenis: 'PPN',
    })
    expect(
      tarifPajak({ [KUNCI_PAJAK_RESTO]: '', [KUNCI_PAJAK_LEGACY]: '7' }, true),
    ).toEqual({ persen: 7, jenis: 'PB1' })
    expect(
      tarifPajak(
        { [KUNCI_PAJAK_RETAIL]: '   ', [KUNCI_PAJAK_LEGACY]: '7' },
        false,
      ),
    ).toEqual({ persen: 7, jenis: 'PPN' })
  })

  it('tarif kosong / ngawur menjadi 0', () => {
    expect(tarifPajak({}, true)).toEqual({ persen: 0, jenis: 'PB1' })
    expect(tarifPajak({ [KUNCI_PAJAK_RESTO]: 'abc' }, true).persen).toBe(0)
  })

  it('normalisasiPersen membatasi 0..100', () => {
    expect(normalisasiPersen(-5)).toBe(0)
    expect(normalisasiPersen('150')).toBe(100)
    expect(normalisasiPersen(undefined)).toBe(0)
    expect(normalisasiPersen('10.5')).toBe(10.5)
  })
})

describe('hitungPajak: dibebankan ke pelanggan (eksklusif)', () => {
  it('menambahkan pajak di atas pokok', () => {
    expect(hitungPajak(100000, 10)).toBe(10000)
    expect(hitungPajak(100000, 11)).toBe(11000)
  })

  it('pokok 0 / tarif 0 menghasilkan 0', () => {
    expect(hitungPajak(0, 10)).toBe(0)
    expect(hitungPajak(50000, 0)).toBe(0)
  })

  it('membulatkan ke rupiah terdekat', () => {
    expect(hitungPajak(33333, 11)).toBe(3667)
  })
})
