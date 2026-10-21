import { useEffect, useState } from 'react'

import { identitasAppFn } from '#/server/pengaturanFn'
import type { IdentitasApp } from '#/types/pengaturan'

export const IDENTITAS_DEFAULT: IdentitasApp = {
  judul: 'POS',
  ikonUrl: '',
  logoUrl: '',
  deskripsi: '',
}

let cache: IdentitasApp | undefined
let janji: Promise<IdentitasApp> | null = null
const pendengar = new Set<(nilai: IdentitasApp) => void>()

function sebarkan(nilai: IdentitasApp): void {
  for (const dengar of pendengar) dengar(nilai)
}

function muatIdentitas(): Promise<IdentitasApp> {
  if (cache !== undefined) return Promise.resolve(cache)
  if (!janji) {
    janji = identitasAppFn()
      .then((nilai) => {
        cache = nilai
        sebarkan(nilai)
        return nilai
      })
      .catch(() => IDENTITAS_DEFAULT)
      .finally(() => {
        janji = null
      })
  }
  return janji
}

// Perbarui identitas di semua komponen yang sedang tampil (setelah owner
// menyimpan judul/ikon) tanpa memuat ulang halaman.
export function setIdentitasCache(nilai: IdentitasApp): void {
  cache = nilai
  sebarkan(nilai)
}

export function useIdentitasApp(): IdentitasApp {
  const [nilai, setNilai] = useState(IDENTITAS_DEFAULT)

  useEffect(() => {
    let aktif = true
    const dengar = (baru: IdentitasApp) => {
      if (aktif) setNilai(baru)
    }
    pendengar.add(dengar)
    void muatIdentitas().then((baru) => {
      if (aktif) setNilai(baru)
    })
    return () => {
      aktif = false
      pendengar.delete(dengar)
    }
  }, [])

  return nilai
}

export function urlIkonSekarang(versi = Date.now()): string {
  return `/api/v1/app-icon?v=${versi}`
}

export function urlIkonPng(url: string, px: number): string {
  if (!url.includes('res.cloudinary.com')) return url
  return url.replace('/upload/', `/upload/w_${px},h_${px},c_fill,q_auto,f_png/`)
}
