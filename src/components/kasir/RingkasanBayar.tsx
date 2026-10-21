import { m } from '#/paraglide/messages'

import { hitungTotal } from '#/lib/kasir-total'
import type { NilaiRingkasan } from '#/types/kasir'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

export default function RingkasanBayar({
  nilai,
  subtotal,
  memberPoin,
  tarif,
  pajakPersen,
  pajakJenis,
}: {
  nilai: NilaiRingkasan
  subtotal: number
  memberPoin: number
  tarif: number
  pajakPersen: number
  pajakJenis?: string | null
}) {
  const { diskon, pakai, pajak, total } = hitungTotal({
    subtotal,
    diskon: Number(nilai.diskon) || 0,
    pajakPersen,
    tukarPoin: Number(nilai.tukarPoin) || 0,
    memberPoin,
    tarif,
  })
  return (
    <div className="space-y-1 rounded-md bg-neutral-50 p-3 text-sm dark:bg-neutral-900">
      <div className="flex justify-between">
        <span>{m.kasir_subtotal()}</span>
        <span>Rp{rupiah(subtotal)}</span>
      </div>
      {diskon > 0 && (
        <div className="flex justify-between">
          <span>{m.kasir_discount()}</span>
          <span>−Rp{rupiah(diskon)}</span>
        </div>
      )}
      {pakai > 0 && (
        <div className="flex justify-between">
          <span>
            {m.kasir_diskon_poin()} ({pakai} pts)
          </span>
          <span>−Rp{rupiah(pakai * 100)}</span>
        </div>
      )}
      {pajak > 0 && (
        <div className="flex justify-between">
          <span>
            {m.kasir_tax()}
            {pajakJenis ? ` ${pajakJenis}` : ''} ({pajakPersen}%)
          </span>
          <span>Rp{rupiah(pajak)}</span>
        </div>
      )}
      {tarif > 0 && (
        <div className="flex justify-between">
          <span>{m.kasir_shipping()}</span>
          <span>Rp{rupiah(tarif)}</span>
        </div>
      )}
      <div className="flex justify-between border-t pt-1 text-base font-bold">
        <span>{m.kasir_total()}</span>
        <span>Rp{rupiah(total)}</span>
      </div>
    </div>
  )
}
