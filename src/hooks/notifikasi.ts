import { useCallback, useEffect, useState } from 'react'

const KUNCI = 'pos_notifikasi_dibaca'
const EVENT = 'pos:notifikasi-dibaca'
const EVENT_SEGARKAN = 'pos:notifikasi-segarkan'

const baca = (): string[] => {
  if (typeof window === 'undefined') return []
  try {
    const nilai = JSON.parse(window.localStorage.getItem(KUNCI) ?? '[]')
    return Array.isArray(nilai)
      ? nilai.filter((v): v is string => typeof v === 'string')
      : []
  } catch {
    return []
  }
}

export function tandaiNotifikasiDibaca(ids: string[]) {
  if (typeof window === 'undefined' || ids.length === 0) return
  const baru = [...new Set([...baca(), ...ids])].slice(-250)
  try {
    window.localStorage.setItem(KUNCI, JSON.stringify(baru))
  } catch {
    return
  }
  window.dispatchEvent(new Event(EVENT))
}

export function segarkanNotifikasi() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(EVENT_SEGARKAN))
}

export function useSegarkanNotifikasi(callback: () => void) {
  useEffect(() => {
    const panggil = () => callback()
    const saatTerlihat = () => {
      if (document.visibilityState === 'visible') callback()
    }
    window.addEventListener(EVENT_SEGARKAN, panggil)
    window.addEventListener('focus', panggil)
    document.addEventListener('visibilitychange', saatTerlihat)
    return () => {
      window.removeEventListener(EVENT_SEGARKAN, panggil)
      window.removeEventListener('focus', panggil)
      document.removeEventListener('visibilitychange', saatTerlihat)
    }
  }, [callback])
}

export function useNotifikasiDibaca() {
  const [ids, setIds] = useState<string[]>([])

  useEffect(() => {
    const muat = () => setIds(baca())
    muat()
    window.addEventListener('storage', muat)
    window.addEventListener(EVENT, muat)
    return () => {
      window.removeEventListener('storage', muat)
      window.removeEventListener(EVENT, muat)
    }
  }, [])

  const tandai = useCallback((daftar: string[]) => {
    tandaiNotifikasiDibaca(daftar)
    setIds(baca())
  }, [])

  return { dibaca: new Set(ids), tandai }
}
