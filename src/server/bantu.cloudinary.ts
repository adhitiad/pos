import { createHash } from 'node:crypto'

// Helper murni (tanpa env/DB) untuk Cloudinary agar bisa diuji unit.
export const FORMAT_DIIZINKAN = 'jpg,png,webp'
export const MAKS_BYTE = 2 * 1024 * 1024

// Urutkan kunci A→Z lalu susun query string (aturan tanda tangan Cloudinary).
export function rangkaiParams(params: Record<string, string | number>): string {
  return Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&')
}

export function tandaTangan(
  params: Record<string, string | number>,
  apiSecret: string,
): string {
  return createHash('sha1')
    .update(rangkaiParams(params) + apiSecret)
    .digest('hex')
}

// publicId hanya boleh berada di dalam folder kita (cegah traversal / hapus aset lain).
export function publicIdAman(publicId: string, folder: string): boolean {
  const bersih = publicId.trim()
  if (!bersih || bersih.length > 200) return false
  if (bersih.includes('..') || bersih.startsWith('/') || /[?#]/.test(bersih))
    return false
  return bersih === folder || bersih.startsWith(`${folder}/`)
}

// Ambil publicId dari secure_url Cloudinary milik cloud+folder kita; null bila
// bukan URL Cloudinary kita (mencegah SSRF / hapus aset luar).
export function publicIdDariUrl(
  url: string,
  cloud: string,
  folder: string,
): string | null {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }
  if (u.protocol !== 'https:' || u.hostname !== 'res.cloudinary.com')
    return null
  const penanda = `/${cloud}/image/upload/`
  if (!u.pathname.startsWith(penanda)) return null
  let sisa = u.pathname.slice(penanda.length)
  sisa = sisa.replace(/^v\d+\//, '')
  const titik = sisa.lastIndexOf('.')
  if (titik > 0) sisa = sisa.slice(0, titik)
  const publicId = decodeURIComponent(sisa)
  return publicIdAman(publicId, folder) ? publicId : null
}

// URL Cloudinary aman untuk diunduh server (host & folder kita saja).
export function urlUnduhAman(url: string, cloud: string): boolean {
  try {
    const u = new URL(url)
    return (
      u.protocol === 'https:' &&
      u.hostname === 'res.cloudinary.com' &&
      u.pathname.startsWith(`/${cloud}/image/upload/`)
    )
  } catch {
    return false
  }
}
