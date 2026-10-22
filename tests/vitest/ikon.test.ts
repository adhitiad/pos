import { describe, expect, it } from 'vitest'

import { escapeXml, inisialJudul, svgIkon } from '#/server/bantu.ikon'

describe('ikon — svg', () => {
  it('memakai inisial judul dan melarikan karakter XML', () => {
    const svg = svgIkon('Warung <Kita> & Co')
    expect(svg).toContain('<title>Warung &lt;Kita&gt; &amp; Co</title>')
    expect(svg).toContain('>W</text>')
    expect(svg).toContain('viewBox="0 0 512 512"')
  })

  it('jatuh ke P bila judul kosong', () => {
    expect(inisialJudul('   ')).toBe('P')
    expect(svgIkon('')).toContain('>P</text>')
  })

  it('membungkus gambar Cloudinary sebagai data URI', () => {
    const svg = svgIkon('Toko', 'data:image/png;base64,abc')
    expect(svg).toContain('<image href="data:image/png;base64,abc"')
    expect(svg).toContain('clip-path="url(#potong)"')
  })

  it('tidak meneruskan tanda kutip mentah ke atribut', () => {
    expect(escapeXml(`a"b'c`)).toBe('a&quot;b&apos;c')
  })
})
