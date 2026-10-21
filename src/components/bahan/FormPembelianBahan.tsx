import { useState } from 'react'

import { m } from '#/paraglide/messages'

import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Checkbox } from '#/components/ui/checkbox'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import type { NilaiPembelianBahan } from '#/types/bahan'
import type { SupplierOpsi } from '#/types/supplier'
import type { SumberBelanja } from '#/validations/pembelian-bahan'

const TANPA_SUPPLIER = 'tanpa-supplier'
const PASAR_ONLINE = 'PASAR_ONLINE'
const PASAR_OFFLINE = 'PASAR_OFFLINE'

// Form tambah stok bahan (pembelian). Nilai dibaca dari DOM saat submit,
// mengikuti pola kontrol tak-terkendali yang sudah ada.
//
// Dua mode belanja:
//   - ada supplier → sumber belanja SUPPLIER (nama supplier dari master)
//   - tanpa supplier → belanja ke pasar online/offline, nama pasar opsional
export default function FormPembelianBahan({
  supplier,
  onSubmit,
  onBatal,
}: {
  supplier: SupplierOpsi[]
  onSubmit: (nilai: NilaiPembelianBahan) => Promise<void>
  onBatal: () => void
}) {
  const [pending, setPending] = useState(false)
  const [supplierId, setSupplierId] = useState(TANPA_SUPPLIER)
  const [sumberBelanja, setSumberBelanja] =
    useState<SumberBelanja>(PASAR_ONLINE)
  const [tempatBelanja, setTempatBelanja] = useState('')
  const [hutang, setHutang] = useState(false)

  const tanpaSupplier = supplierId === TANPA_SUPPLIER

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.bahan_tambah_stok()}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault()
            const nilai: NilaiPembelianBahan = {
              jumlah:
                Number(
                  (
                    document.getElementById(
                      'pembelian-jumlah',
                    ) as HTMLInputElement
                  ).value,
                ) || 0,
              hargaSatuan:
                Number(
                  (
                    document.getElementById(
                      'pembelian-harga',
                    ) as HTMLInputElement
                  ).value,
                ) || 0,
              catatan:
                (
                  document.getElementById(
                    'pembelian-catatan',
                  ) as HTMLInputElement
                ).value || undefined,
              supplierId: tanpaSupplier ? undefined : supplierId,
              hutang,
              sumberBelanja: tanpaSupplier ? sumberBelanja : 'SUPPLIER',
              tempatBelanja: tanpaSupplier
                ? tempatBelanja || undefined
                : undefined,
            }
            setPending(true)
            try {
              await onSubmit(nilai)
            } finally {
              setPending(false)
            }
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>{m.bahan_jumlah_beli()}</Label>
              <Input
                id="pembelian-jumlah"
                type="number"
                min="0"
                step="any"
                className="max-w-sm"
              />
            </div>
            <div className="space-y-1">
              <Label>{m.bahan_harga_beli()}</Label>
              <Input
                id="pembelian-harga"
                type="number"
                min="0"
                step="any"
                className="max-w-sm"
              />
            </div>
            <div className="space-y-1">
              <Label>{m.bahan_pilih_supplier()}</Label>
              <Select
                value={supplierId}
                onValueChange={(v) => {
                  setSupplierId(v)
                  if (v === TANPA_SUPPLIER) setHutang(false)
                }}
              >
                <SelectTrigger className="max-w-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TANPA_SUPPLIER}>
                    {m.bahan_tanpa_supplier()}
                  </SelectItem>
                  {supplier.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {tanpaSupplier && (
              <>
                <div className="space-y-1">
                  <Label>{m.bahan_sumber_belanja()}</Label>
                  <Select
                    value={sumberBelanja}
                    onValueChange={(v) => {
                      setSumberBelanja(v as SumberBelanja)
                    }}
                  >
                    <SelectTrigger className="max-w-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={PASAR_ONLINE}>
                        {m.bahan_pasar_online()}
                      </SelectItem>
                      <SelectItem value={PASAR_OFFLINE}>
                        {m.bahan_pasar_offline()}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>{m.bahan_tempat_belanja()}</Label>
                  <Input
                    id="pembelian-tempat"
                    placeholder={m.bahan_tempat_belanja_hint()}
                    value={tempatBelanja}
                    onChange={(e) => {
                      setTempatBelanja(e.target.value)
                    }}
                    className="max-w-sm"
                  />
                </div>
              </>
            )}
            <div className="space-y-1 sm:col-span-2">
              <Label>{m.bahan_catatan_pembelian()}</Label>
              <Input id="pembelian-catatan" className="max-w-sm" />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              id="pembelian-hutang"
              checked={hutang}
              disabled={tanpaSupplier}
              onCheckedChange={(v) => {
                setHutang(v === true)
              }}
            />
            {m.bahan_beli_hutang()}
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending} className="h-11">
              {m.bahan_simpan_pembelian()}
            </Button>
            <Button type="button" variant="outline" onClick={onBatal}>
              {m.bahan_batal()}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
