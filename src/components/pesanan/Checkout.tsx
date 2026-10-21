import { m } from '#/paraglide/messages'

import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Separator } from '#/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

import type { CheckoutProps, MetodeBayarOnline } from '#/types/pesanan'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

const PAY: { id: MetodeBayarOnline; label: () => string }[] = [
  { id: 'QRIS', label: () => m.pay_qris() },
  { id: 'TRANSFER', label: () => m.pay_transfer() },
  { id: 'EWALLET', label: () => m.pay_ewallet() },
]

export default function Checkout({
  mode,
  mejaId,
  namaPelanggan,
  pembayaran,
  daftarMeja,
  total,
  pending,
  onModeChange,
  onMejaChange,
  onNamaChange,
  onPembayaranChange,
  onCheckout,
}: CheckoutProps) {
  const mejaPilihan = daftarMeja.find((mja) => mja.id === mejaId)

  return (
    <Card className="space-y-3">
      <CardHeader>
        <CardTitle>{m.pesan_konfirmasi()}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid w-full grid-cols-2">
          <Button
            variant={mode === 'DINE_IN' ? 'default' : 'outline'}
            className="w-full"
            onClick={() => onModeChange('DINE_IN')}
          >
            {m.pesan_makan_di_tempat()}
          </Button>
          <Button
            variant={mode === 'TAKE_AWAY' ? 'default' : 'outline'}
            className="w-full"
            onClick={() => onModeChange('TAKE_AWAY')}
          >
            {m.pesan_bawa_pulang()}
          </Button>
        </div>
        {mode === 'DINE_IN' && (
          <div className="space-y-1 pt-2">
            <Label>{m.pesan_meja()}</Label>
            <Select value={mejaId} onValueChange={onMejaChange}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    mejaPilihan ? `${mejaPilihan.nomor}` : m.pesan_pilih_meja()
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {daftarMeja.map((mja) => (
                  <SelectItem key={mja.id} value={mja.id}>
                    {mja.nomor}
                    {mja.nama ? ` - ${mja.nama}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {mode === 'TAKE_AWAY' && (
          <p className="pt-2 text-xs text-neutral-500">
            {m.pesan_bawa_pulang_desc()}
          </p>
        )}

        <Separator />

        <div className="space-y-1">
          <Label>{m.pesan_pembayaran_online()}</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            {PAY.map((p) => (
              <Button
                key={p.id}
                variant={pembayaran === p.id ? 'default' : 'outline'}
                className="w-full justify-between text-sm"
                onClick={() => onPembayaranChange(p.id)}
              >
                <span>{p.label()}</span>
                <span className="text-xs text-neutral-400">
                  {pembayaran === p.id ? m.pesan_dipilih() : ''}
                </span>
              </Button>
            ))}
          </div>
          <p className="text-xs text-neutral-500">
            {m.pesan_pembayaran_online_desc()}
          </p>
        </div>

        <Separator />

        <div className="space-y-1">
          <Label htmlFor="pesan-nama">{m.pesan_nama_pelanggan()}</Label>
          <Input
            id="pesan-nama"
            placeholder={m.pesan_nama_pelanggan_hint()}
            value={namaPelanggan}
            onChange={(e) => onNamaChange(e.target.value)}
          />
        </div>

        <div className="flex items-baseline gap-2 pt-1">
          <span className="text-neutral-500">{m.pesan_total()}</span>
          <span className="font-bold text-lg">Rp{rupiah(total)}</span>
        </div>

        <Button
          onClick={onCheckout}
          disabled={pending || total <= 0}
          className="w-full"
        >
          {pending ? m.pesan_memproses() : m.pesan_konfirmasi_pesan()}
        </Button>
      </CardContent>
    </Card>
  )
}
