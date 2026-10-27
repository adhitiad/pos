import { TIPE_PESANAN_DINE_IN, TIPE_PESANAN_PICKUP } from '#/lib/kasir-checkout'
import { m } from '#/paraglide/messages'
import type { FormKasir } from '#/hooks/useFormKasir'
import type { DataKasir, MejaRingkas } from '#/types/kasir'

import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

// Tujuan pesanan: tipe pesanan (dine-in/pickup/layanan antar) dan meja bila
// mode F&B aktif. Nilai `DINE_IN`/`PICKUP` adalah sentinel form, bukan id
// Delivery; konversinya dilakukan sebelum payload dibuat.
export default function PilihanPesanan({
  form,
  delivery,
  daftarMeja,
}: {
  form: FormKasir
  delivery: DataKasir['delivery']
  daftarMeja: MejaRingkas[]
}) {
  return (
    <>
      <form.Field name="deliveryId">
        {(field) => (
          <div className="space-y-1">
            <Label>{m.kasir_delivery()}</Label>
            <Select
              value={field.state.value}
              onValueChange={field.handleChange}
            >
              <SelectTrigger aria-label={m.kasir_delivery()}>
                <SelectValue placeholder={m.kasir_pilih_tipe_pesanan()} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TIPE_PESANAN_DINE_IN}>
                  {m.kasir_tipe_dine_in()}
                </SelectItem>
                <SelectItem value={TIPE_PESANAN_PICKUP}>
                  {m.kasir_tipe_pickup()}
                </SelectItem>
                {delivery.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.nama} — Rp{rupiah(d.tarif)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </form.Field>

      {daftarMeja.length > 0 && (
        <form.Field name="mejaId">
          {(field) => (
            <div className="space-y-1">
              <Label>{m.kasir_meja()}</Label>
              <Select
                value={field.state.value}
                onValueChange={field.handleChange}
              >
                <SelectTrigger aria-label={m.kasir_meja()}>
                  <SelectValue placeholder={m.kasir_pilih_meja()} />
                </SelectTrigger>
                <SelectContent>
                  {daftarMeja.map((meja) => (
                    <SelectItem key={meja.id} value={meja.id}>
                      {meja.nomor}
                      {meja.nama ? ` - ${meja.nama}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </form.Field>
      )}
    </>
  )
}
