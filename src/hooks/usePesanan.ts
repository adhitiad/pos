import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { authClient } from '#/lib/auth-client'
import { segarkanNotifikasi } from '#/hooks/notifikasi'
import { m } from '#/paraglide/messages'
import type {
  Delivery,
  Meja,
  MemberSaya,
  MetodeBayarOnline,
  ModePesanan,
  PesananItem,
  PesananModifierPilihan,
  PesananOpsi,
  PesananProduk,
} from '#/types/pesanan'

// State + efek pemesanan publik. Komponen hanya mengurus markup; seluruh
// fetch, keranjang, dan aturan validasi checkout tinggal di sini.
export function usePesanan({
  mejaTokenAwal,
  tokoBuka = true,
  tokoAlasan,
}: PesananOpsi) {
  const { data: session, isPending } = authClient.useSession()
  const [produk, setProduk] = useState<PesananProduk[]>([])
  const [cari, setCari] = useState('')
  const [delivery, setDelivery] = useState<Delivery[]>([])
  const [loaded, setLoaded] = useState(false)

  const [cart, setCart] = useState<Record<string, PesananItem>>({})
  const [modalProduk, setModalProduk] = useState<{
    produk: PesananProduk
    modifiers: PesananModifierPilihan[]
  } | null>(null)
  const [mode, setMode] = useState<ModePesanan>('TAKE_AWAY')
  const [mejaNomor, setMejaNomor] = useState<string | null>(null)
  const [mejaToken, setMejaToken] = useState(mejaTokenAwal ?? '')
  const [deliveryId, setDeliveryId] = useState('')
  const [alamat, setAlamat] = useState('')
  const [namaPelanggan, setNamaPelanggan] = useState('')
  const [pembayaran, setPembayaran] = useState<MetodeBayarOnline>('QRIS')
  const [pending, setPending] = useState(false)
  const [member, setMember] = useState<MemberSaya | null>(null)
  const [memuatMember, setMemuatMember] = useState(false)
  const [pesanan, setPesanan] = useState<{
    nomor: string
    total: number
    tanggal: string
  } | null>(null)

  useEffect(() => {
    let abort = false
    const url = mejaTokenAwal
      ? `/api/v1/pesan?mejaToken=${encodeURIComponent(mejaTokenAwal)}`
      : '/api/v1/pesan'
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Gagal memuat menu')
        return res.json()
      })
      .then((data) => {
        if (abort) return
        setProduk(data.data.produk ?? [])
        setDelivery(data.data.delivery ?? [])
        const dariToken = (data.data.mejaDariToken ?? null) as Meja | null
        if (mejaTokenAwal) {
          if (dariToken) {
            setMode('DINE_IN')
            setMejaNomor(dariToken.nomor)
            setMejaToken(mejaTokenAwal)
            toast.success(m.pesan_qr_meja({ nomor: dariToken.nomor }))
          } else {
            setMejaToken('')
            setMejaNomor(null)
            toast.error(m.pesan_qr_tidak_valid())
          }
        }
        setLoaded(true)
      })
      .catch(() => {
        if (abort) return
        setLoaded(true)
      })
    return () => {
      abort = true
    }
  }, [mejaTokenAwal])

  useEffect(() => {
    const userId = session?.user.id
    if (!userId) {
      setMember(null)
      setMemuatMember(false)
      return
    }
    let abort = false
    setMemuatMember(true)
    fetch('/api/v1/saya')
      .then((res) => {
        if (!res.ok) throw new Error('Gagal memuat member')
        return res.json()
      })
      .then((body) => {
        if (abort) return
        const data = body.data?.member ?? null
        setMember(data)
        if (data) {
          setNamaPelanggan((sebelumnya) => sebelumnya || data.nama)
          if (data.alamat) setAlamat((sebelumnya) => sebelumnya || data.alamat)
        }
      })
      .catch(() => {
        if (!abort) setMember(null)
      })
      .finally(() => {
        if (!abort) setMemuatMember(false)
      })
    return () => {
      abort = true
    }
  }, [session?.user.id])

  const items = Object.values(cart)
  const subtotal = items.reduce((s, i) => s + i.harga * i.qty, 0)
  const deliveryPilihan = delivery.find((d) => d.id === deliveryId)
  const ongkir = mode === 'DELIVERY' ? (deliveryPilihan?.tarif ?? 0) : 0
  const total = subtotal + ongkir
  const isDineIn = mode === 'DINE_IN'
  const produkTampil = cari
    ? produk.filter((p) => p.nama.toLowerCase().includes(cari.toLowerCase()))
    : produk

  const hitungModifier = (
    pilihan: PesananModifierPilihan[],
  ): { modifierId: string; qty: number; catatan: string }[] =>
    pilihan.map((p) => ({
      modifierId: p.modifierId,
      qty: p.qty,
      catatan: p.catatan,
    }))

  const tambahProduk = (p: PesananProduk) => {
    if (p.modifierGrup.length > 0) {
      setModalProduk({ produk: p, modifiers: [] })
      return
    }
    tambahKeCart(p.id, [])
  }

  const tambahKeCart = (
    produkId: string,
    modifiers: PesananModifierPilihan[],
  ) => {
    const ada = cart[produkId]
    if (produkId in cart) {
      setCart({
        ...cart,
        [produkId]: { ...ada, qty: ada.qty + 1 },
      })
    } else {
      const p = produk.find((x: PesananProduk) => x.id === produkId)!
      setCart({
        ...cart,
        [produkId]: {
          produkId,
          nama: p.nama,
          harga: p.harga,
          qty: 1,
          modifiers: hitungModifier(modifiers),
        },
      })
    }
    toast(m.pesan_ditambahkan(), { duration: 800 })
  }

  const kurangProduk = (produkId: string) => {
    if (!(produkId in cart)) return
    const ada = cart[produkId]
    if (ada.qty <= 1) {
      const next = { ...cart }
      delete next[produkId]
      setCart(next)
    } else {
      setCart({ ...cart, [produkId]: { ...ada, qty: ada.qty - 1 } })
    }
  }

  const hapusProduk = (produkId: string) => {
    const next = { ...cart }
    delete next[produkId]
    setCart(next)
  }

  const konfirmasiModifier = (
    modifiers: { modifierId: string; qty: number; catatan: string }[],
  ) => {
    if (!modalProduk) return
    tambahKeCart(modalProduk.produk.id, modifiers)
    setModalProduk(null)
  }

  const ubahMode = (modeBaru: ModePesanan) => {
    setMode(modeBaru)
    if (modeBaru === 'DELIVERY' && !deliveryId && delivery.length > 0) {
      setDeliveryId(delivery[0].id)
    }
  }

  const ajukanPesanan = async () => {
    if (!tokoBuka) {
      toast.error(tokoAlasan ?? m.pesan_toko_tutup())
      return
    }
    if (items.length === 0) return
    if (isDineIn && !mejaToken) {
      toast.error(m.pesan_dinein_perlu_qr())
      return
    }
    if (mode === 'DELIVERY' && !deliveryId) {
      toast.error(m.pesan_pilih_delivery())
      return
    }
    if (mode === 'DELIVERY' && alamat.trim().length < 5) {
      toast.error(m.pesan_alamat_wajib())
      return
    }
    setPending(true)
    try {
      const res = await fetch('/api/v1/pesan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            produkId: i.produkId,
            qty: i.qty,
            modifiers: i.modifiers.map((mod) => ({
              modifierId: mod.modifierId,
              qty: mod.qty,
              catatan: mod.catatan,
            })),
          })),
          mejaToken: isDineIn ? mejaToken : undefined,
          deliveryId: mode === 'DELIVERY' ? deliveryId : undefined,
          alamat: mode === 'DELIVERY' ? alamat.trim() : undefined,
          metodeBayar: pembayaran,
          catatan:
            namaPelanggan.trim() !== ''
              ? `Pelanggan: ${namaPelanggan.trim()}`
              : undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || 'Gagal membuat pesanan')
      }
      const body = await res.json()
      setPesanan({
        nomor: body.data.nomor,
        total: body.data.total,
        tanggal: body.data.tanggal,
      })
      setCart({})
      // Token meja dipertahankan agar pelanggan bisa memesan lagi tanpa
      // memindai ulang QR yang sama.
      setDeliveryId('')
      setAlamat('')
      setNamaPelanggan('')
      setPembayaran('QRIS')
      segarkanNotifikasi()
      toast.success(m.pesan_sukses())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : m.pesan_gagal())
    } finally {
      setPending(false)
    }
  }

  return {
    session,
    isPending,
    produk,
    cari,
    setCari,
    delivery,
    loaded,
    modalProduk,
    setModalProduk,
    mode,
    mejaNomor,
    deliveryId,
    setDeliveryId,
    alamat,
    setAlamat,
    namaPelanggan,
    setNamaPelanggan,
    pembayaran,
    setPembayaran,
    pending,
    member,
    memuatMember,
    pesanan,
    setPesanan,
    cart,
    items,
    subtotal,
    ongkir,
    total,
    isDineIn,
    produkTampil,
    tambahProduk,
    tambahKeCart,
    kurangProduk,
    hapusProduk,
    konfirmasiModifier,
    ubahMode,
    ajukanPesanan,
  }
}
