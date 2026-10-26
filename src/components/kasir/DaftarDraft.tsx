import { Minus, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { cartClear, cartSetQty } from '#/lib/kasir-store'
import { m } from '#/paraglide/messages'
import type { BarisKeranjang } from '#/types/kasir'

import { Button } from '#/components/ui/button'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

// Daftar draft keranjang kasir: ubah qty, hapus baris, kosongkan.
export default function DaftarDraft({ items }: { items: BarisKeranjang[] }) {
  const jumlah = items.reduce((s, b) => s + b.qty, 0)

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">
          {m.kasir_draft()} ({jumlah})
        </h2>
        {items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              cartClear()
              toast.info(m.kasir_cart_cleared())
            }}
          >
            <Trash2 className="size-4 mr-1" />
            {m.kasir_clear_cart()}
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="space-y-1 rounded-md border border-dashed border-border p-4 text-center">
          <p className="text-sm text-neutral-500">{m.kasir_empty()}</p>
          <p className="text-xs text-muted-foreground">
            {m.kasir_empty_hint()}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((b) => {
            const qty = b.qty
            return (
              <div
                key={b.produk.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">{b.produk.nama}</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      cartSetQty(b.produk.id, qty - 1)
                      if (qty - 1 <= 0) {
                        toast(m.kasir_removed(), { duration: 1200 })
                      }
                    }}
                    aria-label={m.kasir_remove()}
                  >
                    <Minus className="size-3" />
                  </Button>
                  <span className="text-xs font-medium w-5 text-center">
                    {qty}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      cartSetQty(b.produk.id, qty + 1)
                      toast(m.kasir_added(), { duration: 800 })
                    }}
                    disabled={b.produk.stok <= qty}
                    aria-label={m.kasir_added()}
                  >
                    <Plus className="size-3" />
                  </Button>
                </div>
                <span className="shrink-0 w-20 text-right">
                  Rp{rupiah(b.produk.harga * b.qty)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
