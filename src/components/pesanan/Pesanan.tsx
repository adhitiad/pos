import { ArrowLeft, ShoppingCart } from 'lucide-react'

import { Link } from '@tanstack/react-router'

import { usePesanan } from '#/hooks/usePesanan'
import { m } from '#/paraglide/messages'

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
import NotificationBellLazy from '#/components/NotificationBellLazy'
import Keranjang from '#/components/pesanan/Keranjang'
import Checkout from '#/components/pesanan/Checkout'
import ProdukItem from '#/components/pesanan/ProdukItem'
import type { PesananItem, PesananOpsi, PesananProduk } from '#/types/pesanan'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

export default function Pesanan(props: PesananOpsi) {
  const tokoBuka = props.tokoBuka ?? true
  const tokoAlasan = props.tokoAlasan
  const {
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
    produkTampil,
    tambahProduk,
    tambahKeCart,
    kurangProduk,
    hapusProduk,
    konfirmasiModifier,
    ubahMode,
    ajukanPesanan,
  } = usePesanan(props)

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
            {session?.user && <NotificationBellLazy />}
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
            {session?.user && <NotificationBellLazy />}
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
        {!tokoBuka && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
            {m.pesan_toko_tutup()}
            {tokoAlasan && ` (${tokoAlasan})`}
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
                mejaNomor={mejaNomor}
                namaPelanggan={namaPelanggan}
                pembayaran={pembayaran}
                deliveryId={deliveryId}
                daftarDelivery={delivery}
                alamat={alamat}
                subtotal={subtotal}
                ongkir={ongkir}
                total={total}
                pending={pending}
                onModeChange={ubahMode}
                onNamaChange={setNamaPelanggan}
                onPembayaranChange={setPembayaran}
                onDeliveryChange={setDeliveryId}
                onAlamatChange={setAlamat}
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
