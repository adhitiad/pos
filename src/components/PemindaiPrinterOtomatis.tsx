import { useEffect } from 'react'

import { authClient } from '#/lib/auth-client'
import { simpanPerangkatPrinter } from '#/lib/printer-daftar'
import { hapusCachePrinter, pindaiPrinterOtomatis } from '#/lib/printer-scan'
import { getPenggunaFn } from '#/server/authFn'

// Pindai printer sekali setiap login owner/kasir. Cache sesi tetap dipakai
// untuk koneksi langsung; metadata perangkat disegarkan ke database.
export default function PemindaiPrinterOtomatis() {
  const { data: session, isPending } = authClient.useSession()
  const idPengguna = session?.user.id

  useEffect(() => {
    if (isPending) return
    if (!idPengguna) {
      hapusCachePrinter()
      return
    }
    let aktif = true
    const masihAktif = () => aktif
    void getPenggunaFn()
      .then(async (pengguna) => {
        if (!masihAktif()) return
        if (pengguna?.role !== 'OWNER' && pengguna?.role !== 'KASIR') {
          hapusCachePrinter()
          return
        }
        const daftar = await pindaiPrinterOtomatis()
        if (!masihAktif()) return
        await simpanPerangkatPrinter(daftar)
      })
      .catch(() => {
        // pemindaian perangkat opsional — jangan ganggu halaman
      })
    return () => {
      aktif = false
    }
  }, [idPengguna, isPending])

  return null
}
