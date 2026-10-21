import { createElement as h } from 'react'
import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer'
import * as XLSX from 'xlsx'

import type { EksporHasil } from '#/types/laporan-ekspor'

import { labelSumberBelanja } from './laporanBelanja.js'
import type { LaporanBelanjaOutput } from './laporanBelanja.js'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n)

const namaFile = (dari: string, sampai: string, ext: string) =>
  `laporan-belanja_${dari}_${sampai}.${ext}`

// ─── CSV ───

export function eksporCsvBelanja(l: LaporanBelanjaOutput): EksporHasil {
  const rows: (string | number)[][] = [
    ['Laporan Belanja Bahan'],
    ['Dari', l.dari, 'Sampai', l.sampai],
    [
      'Total Belanja',
      l.totalBelanja,
      'Jumlah Pembelian',
      l.jumlahPembelian,
      'Sisa Hutang',
      l.totalHutang,
    ],
    [],
    ['Rekap per Sumber Belanja'],
    ['Sumber', 'Jenis', 'Pembelian', 'Total Belanja', 'Sisa Hutang'],
    ...l.perSumber.map((s) => [
      s.nama,
      s.sumberBelanja,
      s.jumlah,
      s.total,
      s.hutang,
    ]),
    [],
    ['Rekap per Bulan'],
    ['Periode', 'Total Belanja'],
    ...l.perBulan.map((b) => [b.periode, b.total]),
    [],
    ['Detail Pembelian'],
    [
      'Tanggal',
      'Sumber',
      'Tempat',
      'Bahan',
      'Jumlah',
      'Harga Satuan',
      'Total',
      'Sisa Hutang',
      'Catatan',
    ],
    ...l.detail.map((d) => [
      d.tanggal.slice(0, 10),
      labelSumberBelanja(d.sumberBelanja, d.supplierNama),
      d.tempatBelanja ?? '',
      d.bahanNama,
      d.jumlah,
      d.hargaSatuan,
      d.totalHarga,
      d.belumDibayar,
      d.catatan ?? '',
    ]),
  ]
  return {
    nama: namaFile(l.dari, l.sampai, 'csv'),
    tipe: 'text/csv; charset=utf-8',
    isi: Buffer.from(
      '\uFEFF' + rows.map((row) => row.map(String).join(',')).join('\r\n'),
      'utf8',
    ),
  }
}

// ─── XLSX ───

export function eksporXlsxBelanja(l: LaporanBelanjaOutput): EksporHasil {
  const wb = XLSX.utils.book_new()

  const wsRingkasan = XLSX.utils.aoa_to_sheet([
    ['Laporan Belanja Bahan'],
    ['Dari', l.dari, 'Sampai', l.sampai],
    [],
    ['Total Belanja', l.totalBelanja],
    ['Jumlah Pembelian', l.jumlahPembelian],
    ['Sisa Hutang', l.totalHutang],
    [],
    ['Rekap per Sumber Belanja'],
    ['Sumber', 'Jenis', 'Pembelian', 'Total Belanja', 'Sisa Hutang'],
    ...l.perSumber.map((s) => [
      s.nama,
      s.sumberBelanja,
      s.jumlah,
      s.total,
      s.hutang,
    ]),
  ])
  XLSX.utils.book_append_sheet(wb, wsRingkasan, 'Ringkasan')

  const wsDetail = XLSX.utils.aoa_to_sheet([
    [
      'Tanggal',
      'Sumber',
      'Tempat',
      'Bahan',
      'Jumlah',
      'Harga Satuan',
      'Total',
      'Sisa Hutang',
      'Catatan',
    ],
    ...l.detail.map((d) => [
      d.tanggal.slice(0, 10),
      labelSumberBelanja(d.sumberBelanja, d.supplierNama),
      d.tempatBelanja ?? '',
      d.bahanNama,
      d.jumlah,
      d.hargaSatuan,
      d.totalHarga,
      d.belumDibayar,
      d.catatan ?? '',
    ]),
  ])
  XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return {
    nama: namaFile(l.dari, l.sampai, 'xlsx'),
    tipe: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    isi: buf,
  }
}

// ─── PDF ───

const gaya = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: 'Helvetica' },
  h1: { fontSize: 15, marginBottom: 4 },
  sub: { fontSize: 8, color: '#555', marginBottom: 10 },
  h2: { fontSize: 11, marginTop: 12, marginBottom: 4 },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: '#ddd',
    paddingVertical: 3,
  },
  head: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#333',
    paddingBottom: 3,
  },
  cell: { flex: 1 },
  cellNarrow: { flex: 1, textAlign: 'right' },
  bold: { fontFamily: 'Helvetica-Bold' },
})

function baris(
  sel: { teks: string; rata?: boolean; tebal?: boolean }[],
  head = false,
) {
  return h(
    View,
    { style: head ? gaya.head : gaya.row, key: Math.random().toString(36) },
    ...sel.map((s, i) =>
      h(
        Text,
        {
          key: i,
          style: [
            s.rata ? gaya.cellNarrow : gaya.cell,
            s.tebal ? gaya.bold : {},
          ],
        },
        s.teks,
      ),
    ),
  )
}

export async function eksporPdfBelanja(
  l: LaporanBelanjaOutput,
): Promise<EksporHasil> {
  const doc = h(
    Document,
    {},
    h(
      Page,
      { size: 'A4', style: gaya.page },
      h(Text, { style: gaya.h1 }, 'Laporan Belanja Bahan'),
      h(
        Text,
        { style: gaya.sub },
        `Periode ${l.dari} s/d ${l.sampai} — total ${rupiah(l.totalBelanja)}`,
      ),

      h(Text, { style: gaya.h2 }, 'Rekap per Sumber Belanja'),
      baris(
        [
          { teks: 'Sumber', tebal: true },
          { teks: 'Pembelian', rata: true, tebal: true },
          { teks: 'Total', rata: true, tebal: true },
          { teks: 'Sisa Hutang', rata: true, tebal: true },
        ],
        true,
      ),
      ...l.perSumber.map((s) =>
        baris([
          { teks: s.nama },
          { teks: String(s.jumlah), rata: true },
          { teks: rupiah(s.total), rata: true },
          { teks: rupiah(s.hutang), rata: true },
        ]),
      ),

      h(Text, { style: gaya.h2 }, 'Detail Pembelian'),
      baris(
        [
          { teks: 'Tanggal', tebal: true },
          { teks: 'Sumber', tebal: true },
          { teks: 'Bahan', tebal: true },
          { teks: 'Jumlah', rata: true, tebal: true },
          { teks: 'Total', rata: true, tebal: true },
        ],
        true,
      ),
      ...l.detail.map((d) =>
        baris([
          { teks: d.tanggal.slice(0, 10) },
          { teks: labelSumberBelanja(d.sumberBelanja, d.supplierNama) },
          { teks: d.bahanNama },
          { teks: String(d.jumlah), rata: true },
          { teks: rupiah(d.totalHarga), rata: true },
        ]),
      ),
    ),
  )

  const buf = await renderToBuffer(doc)
  return {
    nama: namaFile(l.dari, l.sampai, 'pdf'),
    tipe: 'application/pdf',
    isi: buf,
  }
}
