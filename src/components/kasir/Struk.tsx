import { CheckCircle, Copy, Download } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { m } from '#/paraglide/messages'
import { useIdentitasApp } from '#/lib/identitas'
import { dukunganSerial, cetakEscpos } from '#/lib/printer'
import { useLogoUrl } from '#/lib/logo'
import { segarkanNotifikasi } from '#/lib/notifikasi'
import { pengaturanDataFn } from '#/server/pengaturanFn'
import type { Struk } from '#/types/kasir'
import type { StrukOtomatis } from '#/validations/pengaturan'

import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Separator } from '#/components/ui/separator'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

export default function Struk({
  struk,
  onBaru,
}: {
  struk: Struk
  onBaru: () => void
}) {
  const [printerAktif, setPrinterAktif] = useState(false)
  const [cetakPending, setCetakPending] = useState(false)
  const [modeOtomatis, setModeOtomatis] = useState<StrukOtomatis>('nonaktif')
  const sudahOtomatis = useRef<string | null>(null)
  const logoUrl = useLogoUrl()
  const identitas = useIdentitasApp()
  // Label pajak menyertakan jenisnya (PB1 restoran/cafe atau PPN retail) bila ada.
  const labelPajak = struk.pajakJenis
    ? `${m.kasir_tax()} ${struk.pajakJenis}`
    : m.kasir_tax()

  useEffect(() => {
    segarkanNotifikasi()
  }, [struk.transaksiId])

  useEffect(() => {
    let montir = true
    pengaturanDataFn()
      .then((p) => {
        if (!montir) return
        setPrinterAktif(p.semua.printer_escpos === 'true')
        setModeOtomatis(p.strukOtomatis)
      })
      .catch(() => {
        // printer opsiional — gagal baca flag tidak memengaruhi struk
      })
    return () => {
      montir = false
    }
  }, [])

  const unduhPdf = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/v1/transaksi/struk/${struk.transaksiId}/pdf`,
      )
      if (!res.ok) throw new Error(m.struk_pdf_gagal())
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const tautan = document.createElement('a')
      tautan.href = url
      tautan.download = `struk-${struk.nomor.replace(/[^\w.-]+/g, '-')}.pdf`
      document.body.appendChild(tautan)
      tautan.click()
      tautan.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : m.struk_pdf_gagal())
    }
  }, [struk.transaksiId, struk.nomor])

  useEffect(() => {
    if (modeOtomatis === 'nonaktif') return
    const jeda = window.setTimeout(() => {
      if (sudahOtomatis.current === struk.transaksiId) return
      sudahOtomatis.current = struk.transaksiId
      if (modeOtomatis === 'cetak') window.print()
      else void unduhPdf()
    }, 400)
    return () => window.clearTimeout(jeda)
  }, [modeOtomatis, struk.transaksiId, unduhPdf])

  const cetakEscposStruk = async () => {
    const baris = [
      identitas.judul,
      struk.nomor,
      struk.tanggal.slice(0, 16).replace('T', ' '),
      ...(struk.memberNama
        ? [
            `${m.kasir_member()}: ${struk.memberNama}${struk.memberTier ? ` (${struk.memberTier})` : ''}`,
          ]
        : []),
      '----------------------------',
      ...struk.items.map(
        (it) => `${it.nama} x${it.qty} Rp${rupiah(it.harga * it.qty)}`,
      ),
      '----------------------------',
      `${m.kasir_subtotal()}: Rp${rupiah(struk.subtotal)}`,
      ...(struk.diskon > 0
        ? [`${m.kasir_discount()}: -Rp${rupiah(struk.diskon)}`]
        : []),
      ...(struk.diskonMember > 0
        ? [`  ${m.struk_diskon_member()}: Rp${rupiah(struk.diskonMember)}`]
        : []),
      ...(struk.pajak > 0 ? [`${labelPajak}: Rp${rupiah(struk.pajak)}`] : []),
      ...(struk.ongkir > 0
        ? [`${m.kasir_shipping()}: Rp${rupiah(struk.ongkir)}`]
        : []),
      `${m.kasir_total()}: Rp${rupiah(struk.total)}`,
      `${m.struk_metode()}: ${struk.metodeBayar}`,
      '',
      `Owner: ${struk.cetakOwner} | Kasir: ${struk.cetakKasir}`,
      m.struk_terimakasih(),
    ]
    setCetakPending(true)
    try {
      await cetakEscpos(baris)
      await fetch(`/api/v1/transaksi/cetak/${struk.transaksiId}`, {
        method: 'POST',
      })
      toast.success(m.struk_escpos_berhasil())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : m.struk_escpos_gagal())
    } finally {
      setCetakPending(false)
    }
  }

  return (
    <Card className="border-green-600/30 dark:border-green-400/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="size-5 text-green-600 dark:text-green-400" />
          <span>
            {m.kasir_success()} — {m.kasir_receipt_no()}: {struk.nomor}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">
          {struk.itemCount} item · <strong>Rp{rupiah(struk.total)}</strong> ·{' '}
          {struk.jurnalNomor}
        </p>
        {struk.memberNama && (
          <p className="text-sm">
            {m.kasir_member()}: <strong>{struk.memberNama}</strong>
            {struk.memberTier ? ` · ${struk.memberTier}` : ''}
            {struk.diskonMember > 0
              ? ` · ${m.struk_diskon_member()} Rp${rupiah(struk.diskonMember)}`
              : ''}
          </p>
        )}
        {struk.kembalian != null && struk.kembalian > 0 && (
          <p className="text-sm">
            {m.kasir_change()}: <strong>Rp{rupiah(struk.kembalian)}</strong>
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(struk.nomor)
              toast.success(m.kasir_receipt_no(), {
                description: m.kasir_copy_receipt(),
              })
            }}
          >
            <Copy className="size-3 mr-1" />
            {m.kasir_copy_receipt()}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.print()
            }}
          >
            {m.struk_cetak()}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void unduhPdf()}>
            <Download className="size-3 mr-1" />
            {m.struk_unduh_pdf()}
          </Button>
          {printerAktif && dukunganSerial() && (
            <Button
              variant="outline"
              size="sm"
              disabled={cetakPending}
              onClick={cetakEscposStruk}
            >
              {cetakPending
                ? m.struk_escpos_mengirim()
                : m.struk_cetak_escpos()}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onBaru}>
            {m.kasir_new_sale()}
          </Button>
        </div>
      </CardContent>
      {/* Area cetak: disembunyikan di layar, hanya keluar di printer */}
      <div id="struk-cetak" className="hidden print:block">
        <div className="font-mono text-xs">
          <p className="text-center">
            <img src={logoUrl} alt="" className="size-10" />
          </p>
          <p className="text-center font-bold">{identitas.judul}</p>
          <p className="text-center">
            {m.kasir_receipt_no()}: {struk.nomor}
          </p>
          <p className="text-center">
            {struk.tanggal.slice(0, 16).replace('T', ' ')}
          </p>
          {struk.memberNama && (
            <p className="text-center">
              {m.kasir_member()}: {struk.memberNama}
              {struk.memberTier ? ` (${struk.memberTier})` : ''}
            </p>
          )}
          <Separator className="my-1 print:block" />
          {struk.items.map((it, i) => (
            <div key={i} className="flex justify-between">
              <p>
                {it.nama} x{it.qty}
              </p>
              <p className="text-right">Rp{rupiah(it.harga * it.qty)}</p>
            </div>
          ))}
          <Separator className="my-1" />
          <p>
            {m.kasir_subtotal()}: Rp{rupiah(struk.subtotal)}
          </p>
          {struk.diskon > 0 && (
            <p>
              {m.kasir_discount()}: -Rp{rupiah(struk.diskon)}
            </p>
          )}
          {struk.diskonMember > 0 && (
            <p className="pl-2">
              {m.struk_diskon_member()}: Rp{rupiah(struk.diskonMember)}
            </p>
          )}
          {struk.pajak > 0 && (
            <p>
              {labelPajak}: Rp{rupiah(struk.pajak)}
            </p>
          )}
          {struk.ongkir > 0 && (
            <p>
              {m.kasir_shipping()}: Rp{rupiah(struk.ongkir)}
            </p>
          )}
          <p className="font-bold">
            {m.kasir_total()}: Rp{rupiah(struk.total)}
          </p>
          {struk.pembayaran.length > 1 ? (
            struk.pembayaran.map((p, i) => (
              <p key={i}>
                {m.struk_metode()}: {p.metode} Rp{rupiah(p.jumlah)}
              </p>
            ))
          ) : (
            <p>
              {m.struk_metode()}: {struk.metodeBayar}
            </p>
          )}
          {struk.uangDiterima != null && (
            <p>
              {m.kasir_cash_received()}: Rp{rupiah(struk.uangDiterima)}
            </p>
          )}
          {struk.kembalian != null && struk.kembalian > 0 && (
            <p>
              {m.kasir_change()}: Rp{rupiah(struk.kembalian)}
            </p>
          )}
          <p className="text-center">{m.struk_terimakasih()}</p>
          <p className="text-center text-xs">
            {m.struk_cetak_owner()}: {struk.cetakOwner} |{' '}
            {m.struk_cetak_kasir()}: {struk.cetakKasir}
          </p>
        </div>
      </div>
    </Card>
  )
}
