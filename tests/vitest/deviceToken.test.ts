import { describe, expect, it } from 'vitest'

import {
  bacaTokenDevice,
  buatTokenDevice,
  deteksiPerangkat,
  lokasiDariHeader,
} from '#/server/deviceToken'

describe('token perangkat analytics (SEC-24)', () => {
  it('token stabil untuk IP + User-Agent yang sama', () => {
    const a = buatTokenDevice({
      ipAddress: '198.51.100.7',
      userAgent: 'Mozilla/5.0 (Linux; Android 14) TokenStabil',
    })
    const b = buatTokenDevice({
      ipAddress: '198.51.100.7',
      userAgent: 'Mozilla/5.0 (Linux; Android 14) TokenStabil',
    })
    expect(
      bacaTokenDevice(a.token, 'Mozilla/5.0 (Linux; Android 14) TokenStabil')
        .deviceId,
    ).toBe(
      bacaTokenDevice(b.token, 'Mozilla/5.0 (Linux; Android 14) TokenStabil')
        .deviceId,
    )
  })

  it('User-Agent berbeda menghasilkan perangkat berbeda', () => {
    const a = buatTokenDevice({
      ipAddress: '198.51.100.8',
      userAgent: 'UA-Satu',
    })
    const b = buatTokenDevice({
      ipAddress: '198.51.100.8',
      userAgent: 'UA-Dua',
    })
    expect(bacaTokenDevice(a.token, 'UA-Satu').deviceId).not.toBe(
      bacaTokenDevice(b.token, 'UA-Dua').deviceId,
    )
  })

  it('menolak token yang diubah atau dipakai UA lain', () => {
    const { token } = buatTokenDevice({
      ipAddress: '198.51.100.9',
      userAgent: 'UA-Asli',
    })
    expect(() => bacaTokenDevice(`${token}x`, 'UA-Asli')).toThrow(
      'Token perangkat tidak valid',
    )
    expect(() => bacaTokenDevice(token, 'UA-Lain')).toThrow(
      'Token perangkat tidak cocok',
    )
  })

  it('menurunkan OS/klasifikasi dari User-Agent, bukan body klien', () => {
    expect(
      deteksiPerangkat(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile',
      ),
    ).toMatchObject({ os: 'ios', klasifikasi: 'hp' })
    expect(
      deteksiPerangkat('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)'),
    ).toMatchObject({ os: 'ios', klasifikasi: 'tablet' })
    expect(
      deteksiPerangkat('Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile'),
    ).toMatchObject({ os: 'android', klasifikasi: 'hp' })
    expect(
      deteksiPerangkat('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),
    ).toMatchObject({ os: 'windows', klasifikasi: 'pc' })
  })

  it('lokasi hanya dari header geolokasi tepercaya', () => {
    expect(lokasiDariHeader(() => null)).toBeNull()
    expect(
      lokasiDariHeader((nama) => {
        if (nama === 'x-vercel-ip-city') return 'Jakarta'
        if (nama === 'x-vercel-ip-country') return 'ID'
        return null
      }),
    ).toBe('Jakarta, ID')
  })
})
