import { createHmac, timingSafeEqual } from 'node:crypto'

import { env } from '#/env'
import { GalatDomain } from './galat.js'
import type {
  KlasifikasiDevice,
  MuatanTokenDevice,
  OsDevice,
  PerangkatTerdeteksi,
  TokenPerangkat,
} from '#/types/device-visit'

// Token analytics ditandatangani HMAC-SHA256. Identitas perangkat diturunkan
// server dari IP + User-Agent, jadi klien tidak bisa mengarang deviceId baru
// hanya dengan mengubah body (SEC-24).
const MASA_BERLAKU_MS = 14 * 24 * 60 * 60 * 1_000

const rahasia = () => env.BETTER_AUTH_SECRET

function tandaTangan(muatan: string): string {
  return createHmac('sha256', rahasia()).update(muatan).digest('base64url')
}

function sidikJariUserAgent(userAgent: string): string {
  return createHmac('sha256', rahasia())
    .update(`ua|${userAgent}`)
    .digest('base64url')
    .slice(0, 22)
}

function deviceIdDari(ipAddress: string, userAgent: string): string {
  const hash = createHmac('sha256', rahasia())
    .update(`device|${ipAddress}|${userAgent}`)
    .digest('hex')
    .slice(0, 32)
  return `dv_${hash}`
}

// Terbitkan token baru yang stabil untuk kombinasi IP + User-Agent saat ini.
// Permintaan berulang dari perangkat yang sama menghasilkan deviceId sama,
// sehingga tidak menambah baris analytics baru.
export function buatTokenDevice(input: {
  ipAddress: string
  userAgent: string
}): TokenPerangkat {
  const sekarang = Date.now()
  const muatan: MuatanTokenDevice = {
    v: 1,
    d: deviceIdDari(input.ipAddress, input.userAgent),
    u: sidikJariUserAgent(input.userAgent),
    e: sekarang + MASA_BERLAKU_MS,
  }
  const isi = Buffer.from(JSON.stringify(muatan)).toString('base64url')
  return {
    token: `${isi}.${tandaTangan(isi)}`,
    berlakuSampai: new Date(muatan.e).toISOString(),
  }
}

function muatanSah(nilai: unknown): nilai is MuatanTokenDevice {
  if (!nilai || typeof nilai !== 'object') return false
  const m = nilai as Record<string, unknown>
  return (
    m.v === 1 &&
    typeof m.d === 'string' &&
    m.d.startsWith('dv_') &&
    typeof m.u === 'string' &&
    typeof m.e === 'number'
  )
}

// Verifikasi tanda tangan, masa berlaku, dan ikatan User-Agent. Token yang
// dipalsukan/diubah tidak boleh membuat baris DeviceVisit.
export function bacaTokenDevice(
  token: string,
  userAgent: string,
): { deviceId: string } {
  const bagian = token.split('.')
  if (bagian.length !== 2) {
    throw new GalatDomain('Token perangkat tidak valid')
  }
  const [isi, tanda] = bagian
  const tandaDiharapkan = tandaTangan(isi)
  const a = Buffer.from(tanda)
  const b = Buffer.from(tandaDiharapkan)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new GalatDomain('Token perangkat tidak valid')
  }

  let muatan: unknown
  try {
    muatan = JSON.parse(Buffer.from(isi, 'base64url').toString('utf8'))
  } catch {
    throw new GalatDomain('Token perangkat tidak valid')
  }
  if (!muatanSah(muatan)) {
    throw new GalatDomain('Token perangkat tidak valid')
  }
  if (muatan.e < Date.now()) {
    throw new GalatDomain('Token perangkat kedaluwarsa')
  }
  if (muatan.u !== sidikJariUserAgent(userAgent)) {
    throw new GalatDomain('Token perangkat tidak cocok dengan perangkat ini')
  }
  return { deviceId: muatan.d }
}

function namaOs(ua: string): string {
  if (/android/i.test(ua)) return 'Android'
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS'
  if (/macintosh|mac os x/i.test(ua)) return 'macOS'
  if (/windows/i.test(ua)) return 'Windows'
  if (/linux|x11/i.test(ua)) return 'Linux'
  return 'Tidak diketahui'
}

function namaBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return 'Edge'
  if (/opr\//i.test(ua)) return 'Opera'
  if (/firefox\//i.test(ua)) return 'Firefox'
  if (/chrome\//i.test(ua)) return 'Chrome'
  if (/safari\//i.test(ua)) return 'Safari'
  return 'Browser'
}

// Turunkan OS, kelas perangkat, dan nama ringkas dari User-Agent. Tidak ada
// nilai metadata perangkat yang diambil dari body klien.
export function deteksiPerangkat(userAgent: string): PerangkatTerdeteksi {
  const ua = userAgent || ''
  let os: OsDevice = 'windows'
  if (/android/i.test(ua)) os = 'android'
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'ios'
  else if (/macintosh|mac os x/i.test(ua)) os = 'mac'
  else if (/linux|x11/i.test(ua)) os = 'linux'

  let klasifikasi: KlasifikasiDevice = 'pc'
  if (/ipad|tablet|playbook|silk/i.test(ua)) klasifikasi = 'tablet'
  else if (/android/i.test(ua) && !/mobile/i.test(ua)) klasifikasi = 'tablet'
  else if (/mobi|iphone|ipod/i.test(ua)) klasifikasi = 'hp'

  return {
    os,
    klasifikasi,
    deviceName: `${namaOs(ua)} · ${namaBrowser(ua)}`.slice(0, 100),
  }
}

// Lokasi hanya dari header geolokasi yang diisi platform tepercaya (Vercel/
// Cloudflare). Bila header tidak ada, biarkan null — jangan pakai kiriman klien.
export function lokasiDariHeader(
  ambil: (nama: string) => string | null | undefined,
): string | null {
  const kota = ambil('x-vercel-ip-city') ?? ambil('cf-ipcity')
  const negara = ambil('x-vercel-ip-country') ?? ambil('cf-ipcountry')
  const bagian = [kota, negara].filter((b) => b && b.trim().length > 0)
  if (bagian.length === 0) return null
  let nilai = bagian.join(', ')
  try {
    nilai = decodeURIComponent(nilai)
  } catch {
    // Header rusak: tetap simpan bentuk mentah yang sudah dibatasi.
  }
  return nilai.replace(/\s+/g, ' ').trim().slice(0, 100) || null
}
