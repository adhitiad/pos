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
import type { LaporanPenjualan } from '#/types/laporan-penjualan'
import { keCsv } from './csv.js'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n)

const namaFile = (l: LaporanPenjualan, ext: string) =>
  `laporan-penjualan_${l.dari}_${l.sampai}.${ext}`

// ─── CSV ───

export function eksporCsv(l: LaporanPenjualan): EksporHasil {
  const rows: (string | number)[][] = [
    ['Laporan Penjualan'],
    ['Dari', l.dari, 'Sampai', l.sampai, 'Kelompok', l.grup],
    l.dimensi ? ['Dimensi', l.dimensi] : [],
    [],
    ['Ringkasan'],
    ['Jumlah transaksi', l.ringkasan.jumlahTransaksi],
    ['Qty terjual', l.ringkasan.qtyTerjual],
    ['Omzet (subtotal - diskon)', l.ringkasan.omzet],
    ['HPP', l.ringkasan.hpp],
    ['Laba kotor', l.ringkasan.labaKotor],
    ['Total dibayar', l.ringkasan.total],
    ['Diskon', l.ringkasan.diskon],
    ['Pajak', l.ringkasan.pajak],
    ['Ongkir', l.ringkasan.ongkir],
    [],
    ['Rekap per periode'],
    ['Periode', 'Transaksi', 'Omzet', 'HPP', 'Laba kotor', 'Total'],
    ...l.rekap.map((r) => [
      r.periode,
      r.jumlahTransaksi,
      r.omzet,
      r.hpp,
      r.labaKotor,
      r.total,
    ]),
  ]

  if (l.rekapDimensi) {
    rows.push([], [`Rekap per ${l.dimensi}`])
    rows.push(['Dimensi', 'Label', 'Transaksi', 'Omzet', 'Total'])
    for (const r of l.rekapDimensi) {
      rows.push([r.kunci, r.label, r.jumlahTransaksi, r.omzet, r.total])
    }
  }

  rows.push(
    [],
    ['Produk terlaris'],
    ['Produk', 'Qty', 'Omzet'],
    ...l.produkTerlaris.map((p) => [p.nama, p.qty, p.omzet]),
    [],
    ['Performa kasir'],
    ['Kasir', 'Transaksi', 'Omzet'],
    ...l.performaKasir.map((k) => [k.nama, k.jumlahTransaksi, k.omzet]),
  )
  return {
    nama: namaFile(l, 'csv'),
    tipe: 'text/csv; charset=utf-8',
    isi: Buffer.from('\uFEFF' + keCsv(rows), 'utf8'),
  }
}

// ─── XLSX ───

export function eksporXlsx(l: LaporanPenjualan): EksporHasil {
  const wb = XLSX.utils.book_new()

  const wsRingkasan = XLSX.utils.aoa_to_sheet([
    ['Laporan Penjualan'],
    ['Dari', l.dari, 'Sampai', l.sampai, 'Kelompok', l.grup],
    l.dimensi ? ['Dimensi', l.dimensi] : [],
    [],
    ['Metrik', 'Nilai'],
    ['Jumlah transaksi', l.ringkasan.jumlahTransaksi],
    ['Qty terjual', l.ringkasan.qtyTerjual],
    ['Omzet (subtotal - diskon)', l.ringkasan.omzet],
    ['HPP', l.ringkasan.hpp],
    ['Laba kotor', l.ringkasan.labaKotor],
    ['Total dibayar', l.ringkasan.total],
    ['Diskon', l.ringkasan.diskon],
    ['Pajak', l.ringkasan.pajak],
    ['Ongkir', l.ringkasan.ongkir],
  ])
  XLSX.utils.book_append_sheet(wb, wsRingkasan, 'Ringkasan')

  const wsRekap = XLSX.utils.aoa_to_sheet([
    ['Periode', 'Transaksi', 'Omzet', 'HPP', 'Laba kotor', 'Total'],
    ...l.rekap.map((r) => [
      r.periode,
      r.jumlahTransaksi,
      r.omzet,
      r.hpp,
      r.labaKotor,
      r.total,
    ]),
  ])
  XLSX.utils.book_append_sheet(wb, wsRekap, 'Rekap')

  if (l.rekapDimensi) {
    const wsDimensi = XLSX.utils.aoa_to_sheet([
      ['Dimensi', 'Label', 'Transaksi', 'Omzet', 'Total'],
      ...l.rekapDimensi.map((r) => [
        r.kunci,
        r.label,
        r.jumlahTransaksi,
        r.omzet,
        r.total,
      ]),
    ])
    XLSX.utils.book_append_sheet(wb, wsDimensi, `Rekap ${l.dimensi}`)
  }

  const wsProduk = XLSX.utils.aoa_to_sheet([
    ['Produk', 'Qty', 'Omzet'],
    ...l.produkTerlaris.map((p) => [p.nama, p.qty, p.omzet]),
  ])
  XLSX.utils.book_append_sheet(wb, wsProduk, 'Produk Terlaris')

  const wsKasir = XLSX.utils.aoa_to_sheet([
    ['Kasir', 'Transaksi', 'Omzet'],
    ...l.performaKasir.map((k) => [k.nama, k.jumlahTransaksi, k.omzet]),
  ])
  XLSX.utils.book_append_sheet(wb, wsKasir, 'Performa Kasir')

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return {
    nama: namaFile(l, 'xlsx'),
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

export async function eksporPdf(l: LaporanPenjualan): Promise<EksporHasil> {
  const doc = h(
    Document,
    {},
    h(
      Page,
      { size: 'A4', style: gaya.page },
      h(Text, { style: gaya.h1 }, 'Laporan Penjualan'),
      h(
        Text,
        { style: gaya.sub },
        `Periode ${l.dari} s/d ${l.sampai} — kelompok ${l.grup}${
          l.dimensi ? ` — dimensi ${l.dimensi}` : ''
        }`,
      ),

      h(Text, { style: gaya.h2 }, 'Ringkasan'),
      baris([
        { teks: 'Jumlah transaksi' },
        { teks: String(l.ringkasan.jumlahTransaksi), rata: true },
      ]),
      baris([
        { teks: 'Qty terjual' },
        { teks: String(l.ringkasan.qtyTerjual), rata: true },
      ]),
      baris([
        { teks: 'Omzet (subtotal - diskon)' },
        { teks: rupiah(l.ringkasan.omzet), rata: true },
      ]),
      baris([{ teks: 'HPP' }, { teks: rupiah(l.ringkasan.hpp), rata: true }]),
      baris([
        { teks: 'Laba kotor' },
        { teks: rupiah(l.ringkasan.labaKotor), rata: true, tebal: true },
      ]),
      baris([
        { teks: 'Total dibayar' },
        { teks: rupiah(l.ringkasan.total), rata: true },
      ]),

      h(Text, { style: gaya.h2 }, 'Rekap per periode'),
      baris(
        [
          { teks: 'Periode', tebal: true },
          { teks: 'Trx', rata: true, tebal: true },
          { teks: 'Omzet', rata: true, tebal: true },
          { teks: 'HPP', rata: true, tebal: true },
          { teks: 'Laba kotor', rata: true, tebal: true },
        ],
        true,
      ),
      ...l.rekap.map((r) =>
        baris([
          { teks: r.periode },
          { teks: String(r.jumlahTransaksi), rata: true },
          { teks: rupiah(r.omzet), rata: true },
          { teks: rupiah(r.hpp), rata: true },
          { teks: rupiah(r.labaKotor), rata: true },
        ]),
      ),

      ...(l.rekapDimensi
        ? [
            h(Text, { style: gaya.h2 }, `Rekap per ${l.dimensi}`),
            baris(
              [
                { teks: 'Dimensi', tebal: true },
                { teks: 'Label', tebal: true },
                { teks: 'Trx', rata: true, tebal: true },
                { teks: 'Omzet', rata: true, tebal: true },
                { teks: 'Total', rata: true, tebal: true },
              ],
              true,
            ),
            ...l.rekapDimensi.map((r) =>
              baris([
                { teks: r.kunci },
                { teks: r.label },
                { teks: String(r.jumlahTransaksi), rata: true },
                { teks: rupiah(r.omzet), rata: true },
                { teks: rupiah(r.total), rata: true },
              ]),
            ),
          ]
        : []),

      h(Text, { style: gaya.h2 }, 'Produk terlaris'),
      baris(
        [
          { teks: 'Produk', tebal: true },
          { teks: 'Qty', rata: true, tebal: true },
          { teks: 'Omzet', rata: true, tebal: true },
        ],
        true,
      ),
      ...l.produkTerlaris.map((p) =>
        baris([
          { teks: p.nama },
          { teks: String(p.qty), rata: true },
          { teks: rupiah(p.omzet), rata: true },
        ]),
      ),

      h(Text, { style: gaya.h2 }, 'Performa kasir'),
      baris(
        [
          { teks: 'Kasir', tebal: true },
          { teks: 'Transaksi', rata: true, tebal: true },
          { teks: 'Omzet', rata: true, tebal: true },
        ],
        true,
      ),
      ...l.performaKasir.map((k) =>
        baris([
          { teks: k.nama },
          { teks: String(k.jumlahTransaksi), rata: true },
          { teks: rupiah(k.omzet), rata: true },
        ]),
      ),
    ),
  )

  const buf = await renderToBuffer(doc)
  return {
    nama: namaFile(l, 'pdf'),
    tipe: 'application/pdf',
    isi: buf,
  }
}
