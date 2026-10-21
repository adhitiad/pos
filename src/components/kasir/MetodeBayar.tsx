import { Banknote, CreditCard, Landmark, QrCode, Wallet } from 'lucide-react'

import { Button } from '#/components/ui/button'
import { m } from '#/paraglide/messages'
import type { MetodeBayar } from '#/types/kasir'
import { METODE_BAYAR } from '#/validations/transaksi'

const IKON = {
  TUNAI: Banknote,
  QRIS: QrCode,
  TRANSFER: Landmark,
  KARTU: CreditCard,
  EWALLET: Wallet,
} as const
const LABEL = {
  TUNAI: () => m.pay_cash(),
  QRIS: () => m.pay_qris(),
  TRANSFER: () => m.pay_transfer(),
  KARTU: () => m.pay_card(),
  EWALLET: () => m.pay_ewallet(),
} as const

export default function MetodeBayar({
  nilai,
  onPilih,
}: {
  nilai: MetodeBayar
  onPilih: (m: MetodeBayar) => void
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {METODE_BAYAR.map((md) => {
        const Ikon = IKON[md]
        const aktif = nilai === md
        return (
          <Button
            key={md}
            type="button"
            variant={aktif ? 'default' : 'outline'}
            className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px]"
            onClick={() => {
              onPilih(md)
            }}
          >
            <Ikon className="size-5" />
            {LABEL[md]()}
          </Button>
        )
      })}
    </div>
  )
}
