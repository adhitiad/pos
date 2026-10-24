import { useEffect, useState } from 'react'

import { logoUrlFn } from '#/server/pengaturanFn'

export const LOGO_DEFAULT = '/logo.svg'

let cache: string | undefined
let janji: Promise<string> | null = null
const pendengar = new Set<(url: string) => void>()

function sebarkan(url: string): void {
  for (const dengar of pendengar) dengar(url)
}

function muatLogo(): Promise<string> {
  if (cache !== undefined) return Promise.resolve(cache)
  if (!janji) {
    janji = logoUrlFn()
      .then((url) => {
        cache = url
        sebarkan(url)
        return url
      })
      .catch(() => '')
      .finally(() => {
        janji = null
      })
  }
  return janji
}

// Perbarui logo di semua komponen yang sedang tampil (mis. setelah simpan
// pengaturan) tanpa perlu memuat ulang halaman.
export function setLogoUrlCache(url: string): void {
  cache = url
  sebarkan(url)
}

export function useLogoUrl(): string {
  const [url, setUrl] = useState('')

  useEffect(() => {
    let aktif = true
    const dengar = (nilai: string) => {
      if (aktif) setUrl(nilai)
    }
    pendengar.add(dengar)
    void muatLogo()
    return () => {
      aktif = false
      pendengar.delete(dengar)
    }
  }, [])

  return url || LOGO_DEFAULT
}
