import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { toast } from 'sonner'

import { cartClear } from '#/lib/kasir-store'
import { hitungTotal } from '#/lib/kasir-total'
import { m } from '#/paraglide/messages'
import { postingTransaksiFn } from '#/server/transaksiFn'
import type {
  BarisBayar,
  BarisKeranjang,
  DataKasir,
  MetodeBayar,
  Struk,
} from '#/types/kasir'
import type { PostingTransaksiInput } from '#/validations/transaksi'

const barisAwal = (): BarisBayar[] => [
  { key: 'awal', metode: 'TUNAI', jumlah: 0 },
]

// Form checkout kasir: state pembayaran (split, uang diterima, baris bayar),
// validasi total, submit daring + fallback antrean offline.
export function useFormKasir({
  data,
  isiCart,
  subtotal,
  simpanAntrean,
  saatReset,
}: {
  data: DataKasir
  isiCart: BarisKeranjang[]
  subtotal: number
  simpanAntrean: (payload: PostingTransaksiInput) => Promise<void>
  saatReset: () => void
}) {
  const router = useRouter()
  const [struk, setStruk] = useState<Struk | null>(null)
  const [pending, setPending] = useState(false)
  const [split, setSplit] = useState(false)
  const [uangDiterima, setUangDiterima] = useState(0)
  const [baris, setBaris] = useState<BarisBayar[]>(barisAwal)

  const resetBayar = () => {
    setSplit(false)
    setUangDiterima(0)
    setBaris(barisAwal())
  }

  const form = useForm({
    defaultValues: {
      memberId: '',
      deliveryId: '',
      diskon: 0,
      tukarPoin: 0,
      metodeBayar: 'TUNAI' as MetodeBayar,
      mejaId: '',
      catatan: '',
    },
    onSubmit: async ({ value }) => {
      if (isiCart.length === 0) return
      const member = data.member.find((x) => x.id === value.memberId)
      const kurir = data.delivery.find((x) => x.id === value.deliveryId)
      const { total } = hitungTotal({
        subtotal,
        diskon: Number(value.diskon) || 0,
        pajakPersen: data.pajakPersen,
        tukarPoin: Number(value.tukarPoin) || 0,
        memberPoin: member?.poin ?? 0,
        tarif: kurir?.tarif ?? 0,
      })
      const bayarSplit = baris
        .filter((b) => (Number(b.jumlah) || 0) > 0)
        .map((b) => ({ metode: b.metode, jumlah: Number(b.jumlah) || 0 }))
      if (split) {
        const jumlahBayar = bayarSplit.reduce((s, b) => s + b.jumlah, 0)
        if (jumlahBayar !== total) {
          toast.error(m.kasir_payment_mismatch())
          return
        }
      }
      const payload: PostingTransaksiInput = {
        items: isiCart.map((b) => ({
          produkId: b.produk.id,
          qty: b.qty,
          modifiers: b.modifiers,
        })),
        memberId: value.memberId || undefined,
        deliveryId: value.deliveryId || undefined,
        diskon: Number(value.diskon) || 0,
        tukarPoin: Number(value.tukarPoin) || 0,
        metodeBayar:
          split && bayarSplit.length > 0
            ? bayarSplit[0].metode
            : value.metodeBayar,
        uangDiterima:
          !split && value.metodeBayar === 'TUNAI' && uangDiterima > 0
            ? uangDiterima
            : undefined,
        pembayaran: split ? bayarSplit : undefined,
        mejaId: value.mejaId || undefined,
        catatan: value.catatan || undefined,
      }
      const setelahSukses = () => {
        cartClear()
        form.reset()
        saatReset()
        resetBayar()
      }
      const simpanOffline = async () => {
        try {
          await simpanAntrean(payload)
          toast.info(m.kasir_tersimpan())
          setelahSukses()
        } catch {
          toast.error('Gagal menyimpan antrean offline')
        }
      }
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await simpanOffline()
        return
      }
      setPending(true)
      try {
        const hasil = await postingTransaksiFn({ data: payload })
        setStruk({
          nomor: hasil.nomor,
          tanggal: hasil.tanggal,
          subtotal: hasil.subtotal,
          diskon: hasil.diskon,
          diskonMember: hasil.diskonMember,
          pajak: hasil.pajak,
          pajakJenis: hasil.pajakJenis,
          ongkir: hasil.ongkir,
          total: hasil.total,
          metodeBayar: hasil.metodeBayar,
          uangDiterima: hasil.uangDiterima,
          kembalian: hasil.kembalian,
          pembayaran: hasil.pembayaran,
          itemCount: hasil.itemCount,
          items: hasil.items,
          jurnalNomor: hasil.jurnalNomor,
          memberNama: hasil.memberNama,
          memberTier: hasil.memberTier,
          cetakOwner: hasil.cetakOwner,
          cetakKasir: hasil.cetakKasir,
          transaksiId: hasil.transaksiId,
        })
        setelahSukses()
        toast.success(m.kasir_success())
        await router.invalidate()
      } catch (e) {
        if (
          e instanceof TypeError ||
          (typeof navigator !== 'undefined' && !navigator.onLine)
        ) {
          await simpanOffline()
          return
        }
        toast.error(
          e instanceof Error ? e.message : 'Gagal memposting transaksi',
        )
      } finally {
        setPending(false)
      }
    },
  })

  return {
    form,
    struk,
    setStruk,
    pending,
    split,
    setSplit,
    uangDiterima,
    setUangDiterima,
    baris,
    setBaris,
  }
}
