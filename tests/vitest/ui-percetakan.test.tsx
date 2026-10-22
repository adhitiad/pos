import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { m } from '#/paraglide/messages'
import TabelPrinter from '#/components/printer/TabelPrinter'
import TabelPrintJob from '#/components/percetakan/TabelPrintJob'
import type { PrintJobRow, PrinterRow } from '#/types/percetakan'

// Render komponen UI ke HTML statis: menangkap error runtime (mis. akses
// undefined) yang tak terlihat oleh typecheck.
const printer: PrinterRow = {
  id: 'printer-1',
  userId: null,
  nama: 'Printer Kasir 1',
  tipe: 'ESC_POS',
  lokasi: 'Kasir 1',
  perangkat: 'AA:BB:CC',
  koneksi: 'USB',
  vendorId: null,
  vendorName: null,
  serialNumber: null,
  productName: null,
  dipindaiPada: null,
  terakhirDipakai: null,
  default: true,
  defaultPengguna: false,
  aktif: true,
}

const job: PrintJobRow = {
  id: 'job-1',
  printerId: 'printer-1',
  printerNama: 'Printer Kasir 1',
  transaksiId: 'trx-1',
  tipe: 'STRUK',
  status: 'MENUNGGU',
  percobaan: 0,
  pesanGalat: null,
  dicetakPada: null,
  diambilPada: null,
  createdAt: '2026-10-20T08:00:00.000Z',
  payload: {
    nomor: 'POS-20261020-0001',
    tanggal: '2026-10-20T08:00:00.000Z',
    items: [
      {
        nama: 'Kopi Susu Gula Aren',
        qty: 2,
        harga: 15000,
        subtotal: 30000,
        modifier: [{ nama: 'Less Sugar', qty: 1, tambahan: 0, catatan: null }],
      },
    ],
    subtotal: 30000,
    diskon: 0,
    pajak: 0,
    pajakJenis: null,
    ongkir: 0,
    total: 30000,
    metodeBayar: 'TUNAI',
    pembayaran: [{ metode: 'TUNAI', jumlah: 30000 }],
    uangDiterima: 30000,
    kembalian: 0,
    memberNama: null,
    catatan: null,
  },
}

describe('UI printer & antrean cetak', () => {
  it('TabelPrinter merender data printer', () => {
    const html = renderToStaticMarkup(
      <TabelPrinter baris={[printer]} onEdit={() => {}} onHapus={() => {}} />,
    )
    expect(html).toContain('Printer Kasir 1')
    expect(html).toContain('ESC_POS')
    expect(html).toContain('AA:BB:CC')
  })

  it('TabelPrinter menampilkan pesan kosong saat tak ada printer', () => {
    const html = renderToStaticMarkup(
      <TabelPrinter baris={[]} onEdit={() => {}} onHapus={() => {}} />,
    )
    expect(html.length).toBeGreaterThan(0)
  })

  it('TabelPrintJob merender job beserta statusnya', () => {
    const html = renderToStaticMarkup(
      <TabelPrintJob
        daftar={[job]}
        onAmbil={() => {}}
        onSelesai={() => {}}
        onGagal={() => {}}
        onLihat={() => {}}
      />,
    )
    expect(html).toContain('Printer Kasir 1')
    expect(html).toContain(m.percetakan_menunggu())
  })

  it('TabelPrintJob menampilkan alasan kegagalan', () => {
    const gagal: PrintJobRow = {
      ...job,
      status: 'GAGAL',
      pesanGalat: 'Paper habis',
    }
    const html = renderToStaticMarkup(
      <TabelPrintJob
        daftar={[gagal]}
        onAmbil={() => {}}
        onSelesai={() => {}}
        onGagal={() => {}}
        onLihat={() => {}}
      />,
    )
    expect(html).toContain('Paper habis')
    expect(html).toContain(m.percetakan_gagal())
  })
})
