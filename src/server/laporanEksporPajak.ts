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

import type { LaporanPajakOutput } from '#/server/laporanPajak'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n)

const namaFile = (dari: string, sampai: string, ext: string) =>
  `laporan-pajak_${dari}_${sampai}.${ext}`

// ─── CSV ───

export function eksporCsvPajak(l: LaporanPajakOutput): EksporHasil {
  const rows: (string | number)[][] = [
    ['Laporan Pajak (PB1/PPN)'],
    ['Dari', l.dari, 'Sampai', l.sampai, 'Kelompok', l.grup],
    [],
    ['Ringkasan per jenis pajak'],
    ['Jenis pajak', 'Transaksi', 'Subtotal', 'Pajak', 'Total'],
    ...l.totalPerJenis.map((j) => [
      j.jenis,
      j.jumlahTransaksi,
      j.subtotal,
      j.pajak,
      j.total,
    ]),
    [],
    ['Rekap per periode'],
    [
      'Periode',
      ...l.riwayat.flatMap((r) => r.jenis.map((j) => j.jenis)),
      'Total pajak',
    ],
    ...l.riwayat.map((r) => [
      r.periode,
      ...r.jenis.map((j) => j.pajak),
      r.jenis.reduce((s, j) => s + j.pajak, 0),
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

export function eksporXlsxPajak(l: LaporanPajakOutput): EksporHasil {
  const wb = XLSX.utils.book_new()

  const wsRingkasan = XLSX.utils.aoa_to_sheet([
    ['Laporan Pajak (PB1/PPN)'],
    ['Dari', l.dari, 'Sampai', l.sampai, 'Kelompok', l.grup],
    [],
    ['Ringkasan per jenis pajak'],
    ['Jenis pajak', 'Transaksi', 'Subtotal', 'Pajak', 'Total'],
    ...l.totalPerJenis.map((j) => [
      j.jenis,
      j.jumlahTransaksi,
      j.subtotal,
      j.pajak,
      j.total,
    ]),
  ])
  XLSX.utils.book_append_sheet(wb, wsRingkasan, 'Ringkasan')

  const wsRekap = XLSX.utils.aoa_to_sheet([
    [
      'Periode',
      ...l.riwayat.flatMap((r) => r.jenis.map((j) => j.jenis)),
      'Total pajak',
    ],
    ...l.riwayat.map((r) => [
      r.periode,
      ...r.jenis.map((j) => j.pajak),
      r.jenis.reduce((s, j) => s + j.pajak, 0),
    ]),
  ])
  XLSX.utils.book_append_sheet(wb, wsRekap, 'Rekap')

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
  sel: { teks: string; lebar?: number; rata?: boolean; tebal?: boolean }[],
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

export async function eksporPdfPajak(
  l: LaporanPajakOutput,
): Promise<EksporHasil> {
  const doc = h(
    Document,
    {},
    h(
      Page,
      { size: 'A4', style: gaya.page },
      h(Text, { style: gaya.h1 }, 'Laporan Pajak (PB1/PPN)'),
      h(
        Text,
        { style: gaya.sub },
        `Periode ${l.dari} s/d ${l.sampai} — kelompok ${l.grup}`,
      ),

      h(Text, { style: gaya.h2 }, 'Ringkasan per jenis pajak'),
      baris(
        [
          { teks: 'Jenis pajak', tebal: true },
          { teks: 'Trx', rata: true, tebal: true },
          { teks: 'Subtotal', rata: true, tebal: true },
          { teks: 'Pajak', rata: true, tebal: true },
          { teks: 'Total', rata: true, tebal: true },
        ],
        true,
      ),
      ...l.totalPerJenis.map((j) =>
        baris([
          { teks: j.jenis },
          { teks: String(j.jumlahTransaksi), rata: true },
          { teks: rupiah(j.subtotal), rata: true },
          { teks: rupiah(j.pajak), rata: true },
          { teks: rupiah(j.total), rata: true },
        ]),
      ),

      h(Text, { style: gaya.h2 }, 'Rekap per periode'),
      baris(
        [
          { teks: 'Periode', tebal: true },
          ...(l.riwayat[0]?.jenis.map((j) => ({
            teks: j.jenis,
            rata: true,
            tebal: true,
          })) ?? []),
          { teks: 'Total pajak', rata: true, tebal: true },
        ],
        true,
      ),
      ...l.riwayat.map((r) =>
        baris([
          { teks: r.periode },
          ...r.jenis.map((j) => ({ teks: rupiah(j.pajak), rata: true })),
          {
            teks: rupiah(r.jenis.reduce((s, j) => s + j.pajak, 0)),
            rata: true,
          },
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
