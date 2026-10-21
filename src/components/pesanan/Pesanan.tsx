import { ArrowLeft, ShoppingCart } from 'lucide-react'

import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { m } from '#/paraglide/messages'
import { authClient } from '#/lib/auth-client'
import { segarkanNotifikasi } from '#/lib/notifikasi'

import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '#/components/ui/dialog'

import ModifierPicker from '#/components/kasir/ModifierPicker'
import NotificationBell from '#/components/NotificationBell'
import Keranjang from '#/components/pesanan/Keranjang'
import Checkout from '#/components/pesanan/Checkout'
import ProdukItem from '#/components/pesanan/ProdukItem'
import type {
  Meja,
  ModePesanan,
  MetodeBayarOnline,
  PesananItem,
  PesananModifierPilihan,
  PesananProduk,
} from '#/types/pesanan'

type MemberSaya = {
  id: string
  nama: string
  poin: number
  diskonPersen: number | null
}

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

export default function Pesanan() {
  const { data: session, isPending } = authClient.useSession()
  const [produk, setProduk] = useState<PesananProduk[]>([])
  const [cari, setCari] = useState('')
  const [meja, setMeja] = useState<Meja[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let abort = false
    fetch('/api/v1/pesan')
      .then((res) => {
        if (!res.ok) throw new Error('Gagal memuat menu')
        return res.json()
      })
      .then((data) => {
        if (abort) return
        setProduk(data.data.produk ?? [])
        setMeja(data.data.meja ?? [])
        setLoaded(true)
      })
      .catch(() => {
        if (abort) return
        setLoaded(true)
      })
    return () => {
      abort = true
    }
  }, [])

  const [cart, setCart] = useState<Record<string, PesananItem>>({})
  const [modalProduk, setModalProduk] = useState<{
    produk: PesananProduk
    modifiers: PesananModifierPilihan[]
  } | null>(null)
  const [mode, setMode] = useState<ModePesanan>('TAKE_AWAY')
  const [mejaId, setMejaId] = useState('')
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
  const total = items.reduce((s, i) => s + i.harga * i.qty, 0)
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

  const ajukanPesanan = async () => {
    if (items.length === 0) return
    if (isDineIn && !mejaId) {
      toast.error(m.pesan_pilih_meja())
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
          mejaId: isDineIn ? mejaId : undefined,
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
      setMejaId('')
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

  if (pesanan) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border bg-background">
          <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between gap-2">
            <Link
              to="/"
              className="flex items-center gap-2 text-sm sm:text-base"
              onClick={() => setPesanan(null)}
            >
              <ArrowLeft className="size-4" /> {m.home_kembali()}
            </Link>
            {session?.user && <NotificationBell />}
          </div>
        </header>
        <main className="flex-1 mx-auto max-w-md w-full px-4 py-10 text-center">
          <ShoppingCart className="mx-auto size-16 text-green-600 dark:text-green-400 mb-4" />
          <h1 className="text-2xl font-bold mb-2">{m.pesan_sukses()}</h1>
          <p className="text-sm text-neutral-500 mb-6">
            {m.pesan_nomor_pesanan()}: <strong>{pesanan.nomor}</strong>
          </p>
          <p className="text-sm text-neutral-500 mb-2">
            {m.pesan_total()}: <strong>Rp{rupiah(pesanan.total)}</strong>
          </p>
          <p className="text-xs text-neutral-400 mb-8">
            {m.pesan_silakan_tunggu()}
          </p>
          <Button onClick={() => setPesanan(null)} className="w-full sm:w-auto">
            {m.pesan_pesan_lagi()}
          </Button>
        </main>
      </div>
    )
  }

  if (!loaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <ShoppingCart className="size-8 text-muted-foreground animate-spin" />
          <p className="text-sm text-neutral-500">{m.pesan_memuat()}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-background">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="flex min-h-11 items-center gap-2 text-sm sm:text-base"
          >
            <ArrowLeft className="size-4" /> {m.home_kembali()}
          </Link>
          <div className="flex items-center gap-2 text-sm font-medium">
            <div className="flex items-center gap-2">
              <ShoppingCart className="size-4" /> {m.pesan_judul()}
            </div>
            {session?.user && <NotificationBell />}
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto max-w-5xl w-full px-4 py-6">
        <h1 className="text-lg sm:text-xl font-semibold mb-6">
          {m.pesan_menu()}
        </h1>
        {!isPending && member && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
            <p className="font-medium">
              {m.pesan_member_aktif({ nama: member.nama })}
            </p>
            <p className="text-xs">
              {m.pesan_member_poin({ poin: member.poin })}
              {member.diskonPersen != null && member.diskonPersen > 0
                ? ` · ${m.pesan_member_diskon({ diskon: member.diskonPersen })}`
                : ''}
            </p>
          </div>
        )}
        {!isPending && session?.user && !memuatMember && !member && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
            {m.pesan_member_tidak_terhubung()}
          </div>
        )}
        {!isPending && !session?.user && (
          <div className="mb-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
            {m.pesan_member_login_hint()}{' '}
            <Link to="/login" className="font-medium underline">
              {m.nav_login()}
            </Link>
          </div>
        )}
        <Input
          placeholder={m.pesan_cari()}
          aria-label={m.pesan_cari()}
          value={cari}
          onChange={(e) => {
            setCari(e.target.value)
          }}
          className="mb-4 h-11 w-full sm:w-80"
        />
        {produkTampil.length === 0 ? (
          <p className="text-center py-12 text-sm text-neutral-500">
            {produk.length === 0 ? m.produk_kosong() : m.pesan_kosong_cari()}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {produkTampil.map((p: PesananProduk) => {
              const item = cart[p.id] as PesananItem | undefined
              const qty = item?.qty ?? 0
              const habis = p.stok <= qty
              return (
                <ProdukItem
                  key={p.id}
                  produk={p}
                  qty={qty}
                  habis={habis}
                  onTambah={() => tambahProduk(p)}
                  onKurang={() => kurangProduk(p.id)}
                />
              )
            })}
          </div>
        )}
        {items.length > 0 && (
          <div className="mt-8 sm:mt-10 lg:grid lg:grid-cols-12 lg:gap-6">
            <div className="lg:col-span-8">
              <Keranjang
                items={items}
                onTambah={(produkId) => tambahKeCart(produkId, [])}
                onKurang={kurangProduk}
                onHapus={hapusProduk}
              />
            </div>
            <div className="lg:col-span-4 lg:sticky lg:top-24">
              <Checkout
                mode={mode}
                mejaId={mejaId}
                namaPelanggan={namaPelanggan}
                pembayaran={pembayaran}
                daftarMeja={meja}
                total={total}
                pending={pending}
                onModeChange={setMode}
                onMejaChange={setMejaId}
                onNamaChange={setNamaPelanggan}
                onPembayaranChange={setPembayaran}
                onCheckout={ajukanPesanan}
              />
            </div>
          </div>
        )}
      </main>
      {modalProduk && (
        <Dialog open onOpenChange={(o) => !o && setModalProduk(null)}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>
                {modalProduk.produk.nama} - {m.pesan_pilih_modifier()}
              </DialogTitle>
              <DialogDescription>
                {m.pesan_pilih_modifier_desc()}
              </DialogDescription>
            </DialogHeader>
            <ModifierPicker
              modifierGrup={modalProduk.produk.modifierGrup}
              selected={modalProduk.modifiers}
              onConfirm={(mods) => konfirmasiModifier(mods)}
              onCancel={() => setModalProduk(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
