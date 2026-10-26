import { Plus, Trash2 } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import MetodeBayar from './MetodeBayar'
import type { BarisBayar, MetodeBayar as TipeBayar } from '#/types/kasir'
import { m } from '#/paraglide/messages'
import { METODE_BAYAR } from '#/validations/transaksi'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

const LABEL: Record<TipeBayar, () => string> = {
  TUNAI: () => m.pay_cash(),
  QRIS: () => m.pay_qris(),
  TRANSFER: () => m.pay_transfer(),
  KARTU: () => m.pay_card(),
  EWALLET: () => m.pay_ewallet(),
}

export default function PembayaranPanel({
  total,
  split,
  onSplitChange,
  metode,
  onMetodeChange,
  uangDiterima,
  onUangDiterimaChange,
  baris,
  onBarisChange,
}: {
  total: number
  split: boolean
  onSplitChange: (v: boolean) => void
  metode: TipeBayar
  onMetodeChange: (v: TipeBayar) => void
  uangDiterima: number
  onUangDiterimaChange: (v: number) => void
  baris: BarisBayar[]
  onBarisChange: (v: BarisBayar[]) => void
}) {
  const dibayar = baris.reduce((s, b) => s + (Number(b.jumlah) || 0), 0)
  const sisa = total - dibayar

  const ubahBaris = (key: string, patch: Partial<BarisBayar>) => {
    onBarisChange(baris.map((b) => (b.key === key ? { ...b, ...patch } : b)))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{m.kasir_payment()}</Label>
        <div className="flex overflow-hidden rounded-lg border">
          <Button
            type="button"
            variant={split ? 'ghost' : 'secondary'}
            size="sm"
            className="rounded-none"
            onClick={() => {
              onSplitChange(false)
            }}
          >
            {m.kasir_pay()}
          </Button>
          <Button
            type="button"
            variant={split ? 'secondary' : 'ghost'}
            size="sm"
            className="rounded-none"
            onClick={() => {
              onSplitChange(true)
            }}
          >
            {m.kasir_split()}
          </Button>
        </div>
      </div>

      {!split && (
        <div className="space-y-2">
          <MetodeBayar nilai={metode} onPilih={onMetodeChange} />
          {metode === 'TUNAI' && (
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Label htmlFor="uang-diterima">{m.kasir_cash_received()}</Label>
                <Input
                  id="uang-diterima"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={uangDiterima || ''}
                  onChange={(e) => {
                    onUangDiterimaChange(Number(e.target.value) || 0)
                  }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => {
                  onUangDiterimaChange(total)
                }}
              >
                {m.kasir_exact()}
              </Button>
            </div>
          )}
          {metode === 'TUNAI' && uangDiterima > total && (
            <p className="text-sm font-medium">
              {m.kasir_change()}: Rp{rupiah(uangDiterima - total)}
            </p>
          )}
        </div>
      )}

      {split && (
        <div className="space-y-2">
          {baris.map((b, i) => (
            <div key={b.key} className="flex items-center gap-2">
              <Select
                value={b.metode}
                onValueChange={(v) => {
                  ubahBaris(b.key, { metode: v as TipeBayar })
                }}
              >
                <SelectTrigger
                  aria-label={`${m.kasir_payment()} ${i + 1}`}
                  className="w-32 shrink-0"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METODE_BAYAR.map((md) => (
                    <SelectItem key={md} value={md}>
                      {LABEL[md]()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                aria-label={`${m.kasir_paid()} ${i + 1}`}
                className="text-right"
                value={b.jumlah || ''}
                onChange={(e) => {
                  ubahBaris(b.key, { jumlah: Number(e.target.value) || 0 })
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label={m.kasir_remove()}
                disabled={baris.length <= 1}
                onClick={() => {
                  onBarisChange(baris.filter((x) => x.key !== b.key))
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onBarisChange([
                ...baris,
                {
                  key: `${Date.now()}`,
                  metode: 'TUNAI',
                  jumlah: Math.max(0, sisa),
                },
              ])
            }}
          >
            <Plus className="size-4 mr-1" />
            {m.kasir_add_method()}
          </Button>
          <div className="flex justify-between rounded-md bg-neutral-50 px-3 py-2 text-sm dark:bg-neutral-900">
            <span>
              {m.kasir_paid()}: Rp{rupiah(dibayar)}
            </span>
            <span
              className={
                sisa === 0 ? 'font-medium' : 'font-medium text-amber-600'
              }
            >
              {m.kasir_remaining()}: Rp{rupiah(sisa)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
