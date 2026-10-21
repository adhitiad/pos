import { Minus, Plus } from 'lucide-react'

import { m } from '#/paraglide/messages'

import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'

import { urlGambarCloudinary } from '#/lib/cloudinary'
import type { ProdukItemProps } from '#/types/pesanan'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

const inisial = (nama: string) =>
  nama
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('')

export default function ProdukItem({
  produk,
  qty,
  habis,
  onTambah,
  onKurang,
}: ProdukItemProps) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-3 text-left shadow-sm">
      <span className="relative block aspect-square overflow-hidden rounded-xl bg-accent">
        {produk.gambar ? (
          <img
            src={urlGambarCloudinary(produk.gambar, 400)}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-muted-foreground">
            {inisial(produk.nama)}
          </span>
        )}
        {qty > 0 && (
          <Badge className="absolute right-1.5 top-1.5 min-h-6 min-w-6 items-center justify-center">
            {qty}
          </Badge>
        )}
      </span>
      <span className="block truncate px-0.5 text-sm font-medium">
        {produk.nama}
      </span>
      {produk.kategoriNama && (
        <span className="block px-0.5 text-xs text-muted-foreground">
          {produk.kategoriNama}
        </span>
      )}
      <span className="block px-0.5 text-sm font-bold">
        Rp{rupiah(produk.harga)}
      </span>
      <div className="mt-2 flex items-center gap-1.5">
        {qty > 0 ? (
          <>
            <Button
              variant="outline"
              size="sm"
              className="size-11 shrink-0"
              onClick={onKurang}
              aria-label={m.kasir_remove()}
            >
              <Minus className="size-3" />
              <span className="sr-only">{m.kasir_remove()}</span>
            </Button>
            <span className="text-xs font-medium w-6 text-center">{qty}</span>
            <Button
              variant="outline"
              size="sm"
              className="size-11 shrink-0"
              onClick={onTambah}
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
            className="h-11 w-full text-xs"
            onClick={onTambah}
            disabled={habis}
          >
            <Plus className="size-3 mr-1" />
            {m.pesan_tambah()}
          </Button>
        )}
      </div>
      {habis && (
        <Badge variant="secondary" className="mt-1 self-start text-xs">
          {m.produk_stok_habis()}
        </Badge>
      )}
    </div>
  )
}
