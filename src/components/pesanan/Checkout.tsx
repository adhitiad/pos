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
  mejaNomor,
  namaPelanggan,
  pembayaran,
  deliveryId,
  daftarDelivery,
  alamat,
  subtotal,
  ongkir,
  total,
  pending,
  onModeChange,
  onNamaChange,
  onPembayaranChange,
  onDeliveryChange,
  onAlamatChange,
  onCheckout,
}: CheckoutProps) {
  const deliveryPilihan = daftarDelivery.find((d) => d.id === deliveryId)

  return (
    <Card className="space-y-3">
      <CardHeader>
        <CardTitle>{m.pesan_konfirmasi()}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
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
          <Button
            variant={mode === 'DELIVERY' ? 'default' : 'outline'}
            className="w-full"
            onClick={() => onModeChange('DELIVERY')}
            disabled={daftarDelivery.length === 0}
          >
            {m.pesan_delivery()}
          </Button>
        </div>
        {mode === 'DINE_IN' && (
          <div className="space-y-1 pt-2">
            <Label>{m.pesan_meja()}</Label>
            {mejaNomor ? (
              <p className="text-sm font-medium">{mejaNomor}</p>
            ) : (
              <p className="text-xs text-neutral-500">
                {m.pesan_dinein_perlu_qr()}
              </p>
            )}
          </div>
        )}
        {mode === 'TAKE_AWAY' && (
          <p className="pt-2 text-xs text-neutral-500">
            {m.pesan_bawa_pulang_desc()}
          </p>
        )}
        {mode === 'DELIVERY' && (
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label>{m.pesan_delivery()}</Label>
              <Select value={deliveryId} onValueChange={onDeliveryChange}>
                <SelectTrigger>
                  <SelectValue placeholder={m.pesan_pilih_delivery()} />
                </SelectTrigger>
                <SelectContent>
                  {daftarDelivery.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nama} · Rp{rupiah(d.tarif)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {deliveryPilihan?.estimasi && (
                <p className="text-xs text-neutral-500">
                  {m.pesan_delivery_estimasi({
                    estimasi: deliveryPilihan.estimasi,
                  })}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="pesan-alamat">{m.pesan_alamat()}</Label>
              <Input
                id="pesan-alamat"
                placeholder={m.pesan_alamat_hint()}
                value={alamat}
                onChange={(e) => onAlamatChange(e.target.value)}
              />
              <p className="text-xs text-neutral-500">
                {m.pesan_alamat_hint()}
              </p>
            </div>
          </div>
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

        <div className="space-y-1 pt-1 text-sm">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-neutral-500">{m.pesan_subtotal()}</span>
            <span>Rp{rupiah(subtotal)}</span>
          </div>
          {ongkir > 0 && (
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-neutral-500">{m.pesan_ongkir()}</span>
              <span>Rp{rupiah(ongkir)}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between gap-2 pt-1">
            <span className="font-medium">{m.pesan_total()}</span>
            <span className="font-bold text-lg">Rp{rupiah(total)}</span>
          </div>
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
