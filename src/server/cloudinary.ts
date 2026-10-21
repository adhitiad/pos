import { env } from '#/env'
import type { TandaTanganUnggah } from '#/types/cloudinary'
import { GalatDomain } from './galat.js'
import {
  FORMAT_DIIZINKAN,
  MAKS_BYTE,
  publicIdDariUrl,
  tandaTangan,
  urlUnduhAman,
} from './bantu.cloudinary.js'

// Folder default khusus aset POS; dipakai untuk membatasi hapus/unduh.
const FOLDER_DEFAULT = 'pos/produk'

interface KonfigCloudinary {
  cloud: string
  apiKey: string
  apiSecret: string
  folder: string
}

// Kredensial hanya ada di server; secret tidak pernah dikirim ke klien.
function konfigurasi(): KonfigCloudinary {
  const cloud = env.CLOUDINARY_CLOUD_NAME
  const apiKey = env.CLOUDINARY_API_KEY
  const apiSecret = env.CLOUDINARY_API_SECRET
  if (!cloud || !apiKey || !apiSecret) {
    throw new GalatDomain(
      'Cloudinary belum dikonfigurasi di server (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET)',
    )
  }
  return {
    cloud,
    apiKey,
    apiSecret,
    folder: env.CLOUDINARY_FOLDER ?? FOLDER_DEFAULT,
  }
}

export type { TandaTanganUnggah }

// Buat parameter + tanda tangan upload. Klien memakai ini untuk mengunggah
// langsung ke Cloudinary; tanpa tanda tangan, unggahan ditolak.
export function tandaTanganUnggah(
  sekarang = Math.floor(Date.now() / 1000),
): TandaTanganUnggah {
  const { cloud, apiKey, apiSecret, folder } = konfigurasi()
  const params = {
    allowed_formats: FORMAT_DIIZINKAN,
    folder,
    timestamp: String(sekarang),
  }
  return {
    cloudName: cloud,
    apiKey,
    timestamp: sekarang,
    folder,
    allowedFormats: FORMAT_DIIZINKAN,
    maxFileSize: MAKS_BYTE,
    signature: tandaTangan(params, apiSecret),
  }
}

// Hapus aset Cloudinary milik kita (publicId diturunkan dari secure_url & wajib
// berada di dalam folder POS → tak bisa menghapus aset sembarangan).
export async function hapusAset(url: string): Promise<{ hasil: string }> {
  const { cloud, apiKey, apiSecret, folder } = konfigurasi()
  const publicId = publicIdDariUrl(url, cloud, folder)
  if (!publicId) throw new GalatDomain('Aset tidak dikenali')
  const sekarang = Math.floor(Date.now() / 1000)
  const params = { public_id: publicId, timestamp: String(sekarang) }
  const body = new URLSearchParams({
    ...params,
    api_key: apiKey,
    signature: tandaTangan(params, apiSecret),
  })
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloud}/image/destroy`,
    { method: 'POST', body },
  )
  if (!res.ok) throw new GalatDomain('Gagal menghapus aset')
  const json = (await res.json().catch(() => null)) as {
    result?: string
  } | null
  if (json?.result !== 'ok' && json?.result !== 'not found') {
    throw new GalatDomain('Gagal menghapus aset')
  }
  return { hasil: json.result ?? 'ok' }
}

// Ambil aset dari Cloudinary di sisi server (unduh tidak lagi dari browser).
export async function ambilAsetUnduh(url: string): Promise<Response> {
  const { cloud } = konfigurasi()
  if (!urlUnduhAman(url, cloud)) throw new GalatDomain('URL tidak diizinkan')
  const res = await fetch(url)
  if (!res.ok) throw new GalatDomain('Gagal mengunduh aset')
  return res
}
