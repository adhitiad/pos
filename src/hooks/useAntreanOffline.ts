import { useCallback, useEffect, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { antreanBaru, penyimpananIndexedDB } from '#/lib/outbox'
import type { AntreanItem, PenyimpananAntrean } from '#/types/outbox'
import type { PostingTransaksiInput } from '#/validations/transaksi'
import { postingTransaksiFn } from '#/server/transaksiFn'

// Antrean offline (outbox IndexedDB): simpan transaksi saat luring,
// kirim otomatis saat kembali daring. SSR/privat → antrean nonaktif.
export function useAntreanOffline() {
  const router = useRouter()
  const [daring, setDaring] = useState(true)
  const [antrean, setAntrean] = useState<AntreanItem[]>([])
  const [sinkron, setSinkron] = useState(false)

  const muatAntrean = useCallback(async (simpan?: PenyimpananAntrean) => {
    try {
      const s = simpan ?? penyimpananIndexedDB()
      setAntrean(await s.daftar())
    } catch {
      // IndexedDB tidak tersedia (SSR/privat) — antrean nonaktif
    }
  }, [])

  const kirimAntrean = useCallback(async () => {
    if (sinkron) return
    setSinkron(true)
    try {
      const simpan = penyimpananIndexedDB()
      const daftar = await simpan.daftar()
      let berhasil = 0
      for (const item of daftar) {
        try {
          await postingTransaksiFn({ data: item.payload })
          await simpan.hapus(item.id)
          berhasil++
        } catch (e) {
          if (e instanceof TypeError || !navigator.onLine) break
          await simpan.tandai(
            item.id,
            e instanceof Error ? e.message : 'Gagal terkirim',
          )
        }
      }
      await muatAntrean(simpan)
      await router.invalidate()
      if (berhasil > 0) toast.success(`${berhasil} transaksi terkirim`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal sinkronisasi')
    } finally {
      setSinkron(false)
    }
  }, [sinkron, muatAntrean, router])

  const simpanAntrean = useCallback(
    async (payload: PostingTransaksiInput) => {
      const simpan = penyimpananIndexedDB()
      await simpan.tambah(antreanBaru(payload))
      await muatAntrean(simpan)
    },
    [muatAntrean],
  )

  const hapusAntrean = useCallback(
    async (id: string) => {
      try {
        const simpan = penyimpananIndexedDB()
        await simpan.hapus(id)
        await muatAntrean(simpan)
      } catch {
        toast.error('Gagal menghapus antrean')
      }
    },
    [muatAntrean],
  )

  useEffect(() => {
    setDaring(navigator.onLine)
    void muatAntrean()
    const saatOnline = () => {
      setDaring(true)
      void kirimAntrean()
    }
    const saatOffline = () => {
      setDaring(false)
    }
    window.addEventListener('online', saatOnline)
    window.addEventListener('offline', saatOffline)
    return () => {
      window.removeEventListener('online', saatOnline)
      window.removeEventListener('offline', saatOffline)
    }
  }, [])

  return {
    daring,
    antrean,
    sinkron,
    kirimAntrean,
    simpanAntrean,
    hapusAntrean,
  }
}
