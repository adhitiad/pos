// Unggah & unduh media Cloudinary lewat backend:
//  - unggah: klien minta tanda tangan dari server (POST /api/v1/unggah), lalu
//    mengunggah langsung ke Cloudinary dengan tanda tangan itu. API secret
//    TIDAK pernah ada di klien.
//  - unduh/hapus: diproses server (GET/DELETE /api/v1/unggah...), bukan dari
//    browser. URL divalidasi server agar tak bisa diarahkan ke luar Cloudinary.
import type {
  GalatUnggahCloudinary,
  HasilUnggahCloudinary,
  TandaTanganUnggah,
} from '#/types/cloudinary'

const TIPE_FOTO_DIIZINKAN: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const MAKS_BYTE = 2 * 1024 * 1024 // 2 MB

function validasiGambar(file: File): void {
  if (file.size === 0) throw new Error('File tidak ada')
  if (!TIPE_FOTO_DIIZINKAN[file.type])
    throw new Error('Hanya JPG, PNG, atau WebP')
  if (file.size > MAKS_BYTE) throw new Error('Maksimal 2 MB')
}

async function mintaTandaTangan(): Promise<TandaTanganUnggah> {
  const res = await fetch('/api/v1/unggah', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  })
  const json = (await res.json().catch(() => null)) as
    | { ok: true; data: TandaTanganUnggah }
    | { ok: false; error: { message: string } }
    | null
  if (!res.ok || !json || !json.ok) {
    throw new Error(
      json && !json.ok ? json.error.message : 'Gagal menyiapkan unggahan',
    )
  }
  return json.data
}

export async function unggahGambar(file: File): Promise<string> {
  validasiGambar(file)
  const ttd = await mintaTandaTangan()

  const body = new FormData()
  body.append('file', file)
  body.append('api_key', ttd.apiKey)
  body.append('timestamp', String(ttd.timestamp))
  body.append('signature', ttd.signature)
  body.append('folder', ttd.folder)
  body.append('allowed_formats', ttd.allowedFormats)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${ttd.cloudName}/image/upload`,
    { method: 'POST', body },
  )
  const json = (await res.json()) as HasilUnggahCloudinary &
    GalatUnggahCloudinary
  if (!res.ok || !json.secure_url) {
    throw new Error(json.error?.message ?? 'Upload ke Cloudinary gagal')
  }
  // Pastikan hasil benar-benar dari cloud & tipe gambar kita.
  const asal = `https://res.cloudinary.com/${ttd.cloudName}/image/`
  if (
    !json.secure_url.startsWith(asal) ||
    !['jpg', 'png', 'webp'].includes(json.format)
  ) {
    throw new Error('Sumber gambar tidak valid')
  }
  return json.secure_url
}

export function unggahFotoProduk(file: File): Promise<string> {
  return unggahGambar(file)
}

// Sisipkan transformasi (resize + format otomatis) ke URL Cloudinary.
// URL non-Cloudinary (mis. data lama /uploads/...) dikembalikan apa adanya.
export function urlGambarCloudinary(url: string, lebar: number): string {
  if (!url.includes('res.cloudinary.com')) return url
  return url.replace('/upload/', `/upload/w_${lebar},c_limit,q_auto,f_auto/`)
}

// Unduh aset produk lewat server. URL non-Cloudinary (data lama) dibuka langsung.
export async function unduhDariCloudinary(
  url: string,
  namaFile: string,
): Promise<void> {
  if (!url.includes('res.cloudinary.com')) {
    const tautan = document.createElement('a')
    tautan.href = url
    tautan.download = namaFile
    document.body.appendChild(tautan)
    tautan.click()
    tautan.remove()
    return
  }
  const res = await fetch(`/api/v1/unggah/unduh?url=${encodeURIComponent(url)}`)
  if (!res.ok) throw new Error('Unduh dari server gagal')
  const blob = await res.blob()
  const tautan = document.createElement('a')
  tautan.href = URL.createObjectURL(blob)
  tautan.download = namaFile
  document.body.appendChild(tautan)
  tautan.click()
  tautan.remove()
  URL.revokeObjectURL(tautan.href)
}
