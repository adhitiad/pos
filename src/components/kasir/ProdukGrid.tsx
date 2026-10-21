import { useMemo, useState } from 'react'
import { useStore } from '@tanstack/react-store'
import { toast } from 'sonner'

import { cartIncrement, cartSetQty, cartStore } from '#/lib/kasir-store'
import { urlGambarCloudinary } from '#/lib/cloudinary'
import { m } from '#/paraglide/messages'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Minus, Plus } from 'lucide-react'

import ModifierPicker from './ModifierPicker'
import type { CartModifier } from '#/types/kasir-store'
import type { DataKasir } from '#/types/kasir'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

const inisial = (nama: string) =>
  nama
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('')

export default function ProdukGrid({
  data,
}: {
  data: DataKasir
  bolehBayar?: boolean
}) {
  const cart = useStore(cartStore)
  const [cari, setCari] = useState('')
  const [katId, setKatId] = useState('')
  const [modalProduk, setModalProduk] = useState<{
    produk: DataKasir['produk'][number]
    modifiers: CartModifier[]
  } | null>(null)

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return data.produk.filter(
      (p) =>
        (!katId || p.kategoriId === katId) &&
        (!q ||
          p.nama.toLowerCase().includes(q) ||
          (p.sku ?? '').toLowerCase().includes(q)),
    )
  }, [data.produk, cari, katId])

  const tambahKeKeranjang = (p: DataKasir['produk'][number]) => {
    if (p.modifierGrup.length > 0) {
      setModalProduk({ produk: p, modifiers: [] })
    } else {
      cartIncrement(p.id)
      toast(m.kasir_added(), { duration: 800 })
    }
  }

  return (
    <div className="min-w-0 space-y-3">
      <Input
        placeholder={m.kasir_cari()}
        value={cari}
        onChange={(e) => {
          setCari(e.target.value)
        }}
      />
      {/* Pil kategori */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Button
          variant={katId === '' ? 'default' : 'outline'}
          className="h-9 shrink-0 rounded-full"
          onClick={() => {
            setKatId('')
          }}
        >
          {m.kasir_semua()}
        </Button>
        {data.kategori.map((k) => (
          <Button
            key={k.id}
            variant={katId === k.id ? 'default' : 'outline'}
            className="h-9 shrink-0 rounded-full"
            onClick={() => {
              setKatId(katId === k.id ? '' : k.id)
            }}
          >
            {k.nama}
          </Button>
        ))}
      </div>
      {/* Grid foto */}
      {tampil.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-500">
          {m.produk_kosong()}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {tampil.map((p) => {
            // Produk di luar keranjang → qty 0 (tidak boleh accessing undefined).
            const qty = cart[p.id]?.qty ?? 0
            const habis = p.stok <= qty
            return (
              <div
                key={p.id}
                className="flex flex-col rounded-2xl border border-border bg-card p-2 text-left shadow-sm"
              >
                <span className="relative block aspect-square overflow-hidden rounded-xl bg-accent">
                  {p.gambar ? (
                    <img
                      src={urlGambarCloudinary(p.gambar, 400)}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted-foreground">
                      {inisial(p.nama)}
                    </span>
                  )}
                  {qty > 0 && (
                    <Badge className="absolute right-1.5 top-1.5 min-h-6 min-w-6 items-center justify-center">
                      {qty}
                    </Badge>
                  )}
                </span>
                <span className="block truncate px-0.5 text-sm font-medium">
                  {p.nama}
                </span>
                <span className="block px-0.5 text-xs text-muted-foreground">
                  {p.kategoriNama ?? '—'}
                </span>
                <span className="block px-0.5 text-sm font-bold">
                  Rp{rupiah(p.harga)}
                </span>
                <div className="mt-1 flex items-center gap-1.5">
                  {qty > 0 ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 shrink-0"
                        onClick={() => {
                          cartSetQty(p.id, qty - 1)
                          if (qty - 1 <= 0) {
                            toast(m.kasir_removed(), { duration: 1200 })
                          }
                        }}
                        aria-label={m.kasir_remove()}
                      >
                        <Minus className="size-3" />
                        <span className="sr-only">{m.kasir_remove()}</span>
                      </Button>
                      <span className="text-xs font-medium">
                        {m.kasir_qty().toLowerCase()}: {qty}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 shrink-0"
                        onClick={() => {
                          cartSetQty(p.id, qty + 1)
                          toast(m.kasir_added(), { duration: 800 })
                        }}
                        disabled={habis}
                        aria-label={m.kasir_added()}
                      >
                        <Plus className="size-3" />
                        <span className="sr-only">{m.kasir_added()}</span>
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      className="h-8 w-full text-xs"
                      onClick={() => {
                        tambahKeKeranjang(p)
                      }}
                      disabled={habis}
                    >
                      <Plus className="size-3 mr-1" />
                      {m.kasir_add()}
                    </Button>
                  )}
                </div>
                {habis && (
                  <Badge
                    variant="secondary"
                    className="mt-1 self-start text-xs"
                  >
                    {m.produk_stok_habis()}
                  </Badge>
                )}
              </div>
            )
          })}
        </div>
      )}
      {modalProduk && (
        <Dialog
          open
          onOpenChange={(o) => {
            if (!o) setModalProduk(null)
          }}
        >
          <DialogContent>
            <ModifierPicker
              modifierGrup={modalProduk.produk.modifierGrup}
              selected={modalProduk.modifiers}
              onConfirm={(modifiers) => {
                cartIncrement(modalProduk.produk.id, modifiers)
                setModalProduk(null)
                toast(m.kasir_added(), { duration: 800 })
              }}
              onCancel={() => {
                setModalProduk(null)
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
