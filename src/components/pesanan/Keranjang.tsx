import { Minus, Plus, Trash2 } from 'lucide-react'

import { m } from '#/paraglide/messages'

import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Separator } from '#/components/ui/separator'

import type { KeranjangProps } from '#/types/pesanan'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

export default function Keranjang({
  items,
  onTambah,
  onKurang,
  onHapus,
}: KeranjangProps) {
  const total = items.reduce((s, i) => s + i.harga * i.qty, 0)

  return (
    <Card className="space-y-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="size-4" />
          {m.pesan_keranjang()}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="p-6 text-center text-sm text-neutral-500">
            {m.pesan_kosong()}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {items.map((i) => (
              <div
                key={i.produkId}
                className="flex justify-between gap-2 px-3 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-medium truncate block">
                      {i.nama}
                    </span>
                    {i.modifiers.length > 0 && (
                      <span className="text-xs text-neutral-500 ml-1">
                        (
                        {i.modifiers
                          .map((mod) => `${mod.modifierId} ×${mod.qty}`)
                          .join(', ')}
                        )
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-neutral-500">
                    Rp{rupiah(i.harga)} ×{i.qty}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0 min-h-[44px] min-w-[44px]"
                    onClick={() => onKurang(i.produkId)}
                    aria-label={m.kasir_remove()}
                  >
                    <Minus className="size-2.5" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    value={i.qty}
                    className="w-8 h-6 text-xs text-right p-0 text-center"
                    readOnly
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0 min-h-[44px] min-w-[44px]"
                    onClick={() => onTambah(i.produkId)}
                  >
                    <Plus className="size-2.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0 min-h-[44px] min-w-[44px] text-neutral-500 hover:text-destructive"
                    onClick={() => onHapus(i.produkId)}
                    aria-label="Hapus"
                  >
                    <Trash2 className="size-2.5" />
                  </Button>
                </div>
                <span className="text-sm font-medium">
                  Rp{rupiah(i.harga * i.qty)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <Separator />
      <div className="px-3 pb-3 space-y-2">
        <div className="flex justify-between text-sm font-medium">
          <span>{m.pesan_total()}</span>
          <span>Rp{rupiah(total)}</span>
        </div>
      </div>
    </Card>
  )
}
