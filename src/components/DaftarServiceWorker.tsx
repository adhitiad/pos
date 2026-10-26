import { useEffect } from 'react'

// Daftarkan service worker produksi setelah halaman selesai dimuat agar tidak
// berebut bandwidth dengan aset awal. Di dev SW tidak dipakai (cache basi).
export default function DaftarServiceWorker() {
  useEffect(() => {
    if (!import.meta.env.PROD) return
    if (!('serviceWorker' in navigator)) return

    const daftar = () => {
      void navigator.serviceWorker.register('/sw.js').catch(() => {
        // Registrasi gagal (mis. browser privat/HTTP non-lokal) tidak fatal.
      })
    }

    if (document.readyState === 'complete') {
      daftar()
      return
    }
    window.addEventListener('load', daftar, { once: true })
    return () => window.removeEventListener('load', daftar)
  }, [])

  return null
}
