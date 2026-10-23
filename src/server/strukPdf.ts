import { createElement as h } from 'react'
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer'

import type { EksporHasil } from '#/types/laporan-ekspor'
import type { StrukPayload } from '#/types/percetakan'
import { ukuranKertasDari, ukuranKertasPoin } from '#/lib/ukuran-kertas'
import { GalatDomain } from './galat.js'
import { pengaturanData } from './pengaturan.js'
import { muatPayloadStruk } from './percetakan.js'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

const waktu = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const gaya = StyleSheet.create({
  page: { padding: 12, fontSize: 8, fontFamily: 'Helvetica' },
  toko: { fontSize: 11, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  tengah: { textAlign: 'center', marginBottom: 1 },
  garis: {
    borderBottomWidth: 0.5,
    borderColor: '#999',
    marginVertical: 5,
  },
  baris: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  kanan: { textAlign: 'right' },
  tebal: { fontFamily: 'Helvetica-Bold' },
  itemNama: { flex: 1, paddingRight: 4 },
  itemQty: { fontSize: 7, color: '#444', marginBottom: 2 },
  kecil: { fontSize: 7, color: '#444' },
  catatan: { marginTop: 4, fontSize: 7, color: '#444' },
  kaki: { marginTop: 6, textAlign: 'center', fontSize: 7 },
})

function baris(teks: string, nilai: string, tebal = false) {
  return h(
    View,
    { style: gaya.baris },
    h(Text, { style: tebal ? gaya.tebal : {} }, teks),
    h(Text, { style: [gaya.kanan, tebal ? gaya.tebal : {}] }, nilai),
  )
}

function isiStruk(
  payload: StrukPayload,
  namaToko: string,
  ukuranKertas: string,
) {
  const ukuran = ukuranKertasPoin(ukuranKertasDari(ukuranKertas))
  return h(
    Document,
    {},
    h(
      Page,
      { size: ukuran, style: gaya.page },
      h(Text, { style: gaya.toko }, namaToko),
      h(Text, { style: gaya.tengah }, 'STRUK PEMBAYARAN'),
      h(Text, { style: gaya.tengah }, payload.nomor),
      h(Text, { style: [gaya.tengah, gaya.kecil] }, waktu(payload.tanggal)),
      payload.memberNama
        ? h(
            Text,
            { style: [gaya.tengah, gaya.kecil] },
            `Member: ${payload.memberNama}`,
          )
        : null,
      h(View, { style: gaya.garis }),

      ...payload.items.flatMap((it, i) => [
        h(
          View,
          { style: gaya.baris, key: `n${i}` },
          h(Text, { style: gaya.itemNama }, it.nama),
          h(Text, { style: gaya.kanan }, `Rp${rupiah(it.subtotal)}`),
        ),
        h(
          Text,
          { style: gaya.itemQty, key: `q${i}` },
          `  ${it.qty} x Rp${rupiah(it.harga)}`,
        ),
        ...it.modifier.map((md, j) =>
          h(
            Text,
            { style: gaya.kecil, key: `m${i}-${j}` },
            `  + ${md.nama}${md.qty > 1 ? ` x${md.qty}` : ''}${
              md.tambahan > 0 ? ` (Rp${rupiah(md.tambahan)})` : ''
            }`,
          ),
        ),
      ]),

      h(View, { style: gaya.garis }),
      baris('Subtotal', `Rp${rupiah(payload.subtotal)}`),
      payload.diskon > 0
        ? baris('Diskon', `-Rp${rupiah(payload.diskon)}`)
        : null,
      payload.pajak > 0
        ? baris(
            `Pajak${payload.pajakJenis ? ` ${payload.pajakJenis}` : ''}`,
            `Rp${rupiah(payload.pajak)}`,
          )
        : null,
      payload.ongkir > 0
        ? baris('Ongkir', `Rp${rupiah(payload.ongkir)}`)
        : null,
      baris('Total', `Rp${rupiah(payload.total)}`, true),

      h(View, { style: gaya.garis }),
      ...(payload.pembayaran.length > 0
        ? payload.pembayaran.map((p, i) =>
            h(
              View,
              { style: gaya.baris, key: `p${i}` },
              h(Text, {}, `Bayar (${p.metode})`),
              h(Text, { style: gaya.kanan }, `Rp${rupiah(p.jumlah)}`),
            ),
          )
        : [baris('Metode', payload.metodeBayar)]),
      payload.uangDiterima != null
        ? baris('Tunai diterima', `Rp${rupiah(payload.uangDiterima)}`)
        : null,
      payload.kembalian != null && payload.kembalian > 0
        ? baris('Kembalian', `Rp${rupiah(payload.kembalian)}`)
        : null,
      payload.catatan
        ? h(Text, { style: gaya.catatan }, `Catatan: ${payload.catatan}`)
        : null,
      h(Text, { style: gaya.kaki }, 'Terima kasih telah berbelanja'),
    ),
  )
}

function namaFile(nomor: string): string {
  const aman = nomor.replace(/[^a-zA-Z0-9._-]+/g, '-')
  return `struk-${aman}.pdf`
}

export async function eksporStrukPdf(
  transaksiId: string,
): Promise<EksporHasil> {
  const payload = await muatPayloadStruk(transaksiId)
  if (!payload) throw new GalatDomain('Transaksi tidak ditemukan')
  const { namaToko, ukuranKertasTermal } = await pengaturanData()
  const isi = await renderToBuffer(
    isiStruk(payload, namaToko, ukuranKertasTermal),
  )
  return { nama: namaFile(payload.nomor), tipe: 'application/pdf', isi }
}
