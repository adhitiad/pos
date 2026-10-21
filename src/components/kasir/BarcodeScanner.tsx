import { useRef, useState } from 'react'
import { Barcode as BarcodeIcon } from 'lucide-react'
import { toast } from 'sonner'

import { m } from '#/paraglide/messages'
import { cartIncrement } from '#/lib/kasir-store'

import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import type { ProdukKasir } from '#/types/kasir'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

export default function BarcodeScanner({ produk }: { produk: ProdukKasir[] }) {
  const [kode, setKode] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = kode.trim()
    if (!q) {
      inputRef.current?.focus()
      return
    }
    const p = produk.find((x) => x.barcode === q || x.sku === q)
    if (!p) {
      toast.error(m.kasir_barang_tidak_ditemukan())
      setKode('')
      inputRef.current?.focus()
      return
    }
    cartIncrement(p.id)
    toast.success(m.kasir_barang_ditambahkan({ nama: p.nama }), {
      description: `${p.nama} · Rp${rupiah(p.harga)}`,
    })
    setKode('')
    inputRef.current?.focus()
  }

  return (
    <Card className="space-y-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarcodeIcon className="size-4" />
          {m.kasir_barcode()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            autoFocus
            placeholder={m.kasir_barcode()}
            value={kode}
            onChange={(e) => {
              setKode(e.target.value)
            }}
          />
          <Button type="submit">{m.kasir_scan()}</Button>
        </form>
      </CardContent>
    </Card>
  )
}
