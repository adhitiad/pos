import { describe, expect, it, vi } from 'vitest'

import {
  bacaTokenMeja,
  buatTokenMeja,
  MASA_BERLAKU_MEJA_MS,
  urlPesananMeja,
} from '../../src/server/mejaToken.js'

describe('mejaToken (FIT-01)', () => {
  it('menasilkan dan membaca token meja yang benar', () => {
    const mejaId = 'meja-abc'
    const { token, berlakuSampai } = buatTokenMeja(mejaId)

    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(2)
    expect(new Date(berlakuSampai).getTime()).toBeGreaterThan(Date.now())

    const baca = bacaTokenMeja(token)
    expect(baca.mejaId).toBe(mejaId)
  })

  it('tolak token yang dirusak', () => {
    const { token } = buatTokenMeja('meja-abc')
    // Ubah karakter teralu; pilih huruf yang pasti berbeda dari aslinya.
    const rusak = token.endsWith('A')
      ? `${token.slice(0, -1)}B`
      : `${token.slice(0, -1)}A`
    expect(() => bacaTokenMeja(rusak)).toThrow('QR meja tidak valid')
  })

  it('tolak token kedaluwarsa', () => {
    const { token } = buatTokenMeja('meja-abc')
    vi.useFakeTimers()
    vi.setSystemTime(new Date(Date.now() + MASA_BERLAKU_MEJA_MS + 1_000))
    expect(() => bacaTokenMeja(token)).toThrow('QR meja sudah kedaluwarsa')
    vi.useRealTimers()
  })

  it('tolak token yang panjangnya melebihi batas', () => {
    const terlaluPanjang = 'a'.repeat(600)
    expect(() => bacaTokenMeja(terlaluPanjang)).toThrow('QR meja tidak valid')
  })

  it('urlPesananMeja memuat token ke path /pesanan', () => {
    const { token } = buatTokenMeja('meja-abc')
    const url = urlPesananMeja(token)
    expect(new URL(url).pathname).toBe('/pesanan')
    expect(new URL(url).searchParams.get('meja')).toBe(token)
  })
})
