import { describe, expect, it } from 'vitest'

import {
  publicIdAman,
  publicIdDariUrl,
  rangkaiParams,
  tandaTangan,
  urlUnduhAman,
} from '#/server/bantu.cloudinary'

const CLOUD = 'demo-cloud'
const FOLDER = 'pos/produk'

describe('tanda tangan Cloudinary', () => {
  it('merangkai parameter terurut A→Z', () => {
    expect(
      rangkaiParams({ timestamp: '123', folder: 'a', allowed_formats: 'x' }),
    ).toBe('allowed_formats=x&folder=a&timestamp=123')
  })

  it('deterministik dan bergantung pada secret', () => {
    const p = { folder: FOLDER, timestamp: '1700000000' }
    const a = tandaTangan(p, 'secret-1')
    expect(a).toBe(tandaTangan(p, 'secret-1'))
    expect(a).not.toBe(tandaTangan(p, 'secret-2'))
    expect(a).toMatch(/^[a-f0-9]{40}$/)
  })
})

describe('publicIdAman: hanya di dalam folder kita', () => {
  it('menerima publicId di dalam folder', () => {
    expect(publicIdAman('pos/produk/abc', FOLDER)).toBe(true)
  })
  it('menolak traversal / absolut / query', () => {
    expect(publicIdAman('pos/produk/../../rahasia', FOLDER)).toBe(false)
    expect(publicIdAman('/pos/produk/abc', FOLDER)).toBe(false)
    expect(publicIdAman('pos/produk/abc?x=1', FOLDER)).toBe(false)
    expect(publicIdAman('', FOLDER)).toBe(false)
  })
  it('menolak di luar folder', () => {
    expect(publicIdAman('lain/abc', FOLDER)).toBe(false)
  })
})

describe('publicIdDariUrl: validasi host + folder (anti-SSRF)', () => {
  it('menurunkan publicId dari secure_url kita', () => {
    const url = `https://res.cloudinary.com/${CLOUD}/image/upload/v1700/${FOLDER}/foto.jpg`
    expect(publicIdDariUrl(url, CLOUD, FOLDER)).toBe(`${FOLDER}/foto`)
  })
  it('menolak host lain / skema lain', () => {
    expect(
      publicIdDariUrl('https://evil.example.com/x.jpg', CLOUD, FOLDER),
    ).toBeNull()
    expect(
      publicIdDariUrl(
        `http://res.cloudinary.com/${CLOUD}/image/upload/a.jpg`,
        CLOUD,
        FOLDER,
      ),
    ).toBeNull()
  })
  it('menolak cloud lain dan folder terlarang', () => {
    expect(
      publicIdDariUrl(
        `https://res.cloudinary.com/lain/image/upload/${FOLDER}/x.jpg`,
        CLOUD,
        FOLDER,
      ),
    ).toBeNull()
    expect(
      publicIdDariUrl(
        `https://res.cloudinary.com/${CLOUD}/image/upload/rahasia/x.jpg`,
        CLOUD,
        FOLDER,
      ),
    ).toBeNull()
  })
})

describe('urlUnduhAman', () => {
  it('hanya menerima aset cloud kita', () => {
    expect(
      urlUnduhAman(
        `https://res.cloudinary.com/${CLOUD}/image/upload/${FOLDER}/x.jpg`,
        CLOUD,
      ),
    ).toBe(true)
    expect(
      urlUnduhAman('https://res.cloudinary.com/lain/image/upload/x.jpg', CLOUD),
    ).toBe(false)
    expect(urlUnduhAman('https://evil.example.com/x.jpg', CLOUD)).toBe(false)
  })
})
