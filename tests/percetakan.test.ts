import { afterAll, describe, expect, it } from 'vitest'

import { prisma } from '#/db'
import {
  ambilPrintJob,
  buatPrintJob,
  createPrinter,
  daftarPrintJob,
  daftarPrinterPerangkat,
  daftarkanPrinterPerangkat,
  gagalPrintJob,
  hapusPrinter,
  printerDefault,
  selesaiPrintJob,
  updatePrinter,
} from '#/server/percetakan'
import { postingTransaksi } from '#/server/transaksi'
import { eksporStrukPdf } from '#/server/strukPdf'

const printerIds: string[] = []
const produkIds: string[] = []
const transaksiIds: string[] = []
const jobIds: string[] = []

afterAll(async () => {
  await prisma.printJob.deleteMany({ where: { id: { in: jobIds } } })
  await prisma.jurnal.deleteMany({
    where: { transaksiId: { in: transaksiIds } },
  })
  await prisma.transaksiItem.deleteMany({
    where: { transaksiId: { in: transaksiIds } },
  })
  await prisma.pembayaran.deleteMany({
    where: { transaksiId: { in: transaksiIds } },
  })
  await prisma.transaksi.deleteMany({ where: { id: { in: transaksiIds } } })
  await prisma.produk.deleteMany({ where: { id: { in: produkIds } } })
  await prisma.printer.deleteMany({ where: { id: { in: printerIds } } })
  await prisma.$disconnect()
})

async function buatTransaksi() {
  const produk = await prisma.produk.create({
    data: {
      nama: `Produk-Struk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      harga: 2500,
      stok: 20,
      aktif: true,
    },
  })
  produkIds.push(produk.id)
  const hasil = await postingTransaksi({
    items: [{ produkId: produk.id, qty: 3 }],
    metodeBayar: 'TUNAI',
    uangDiterima: 10000,
  })
  transaksiIds.push(hasil.transaksi.id)
  return hasil.transaksi.id
}

describe('printer — master', () => {
  it('create → default → update → hapus', async () => {
    // Simpan printer default lama agar dikembalikan setelah uji.
    const defaultLama = await prisma.printer.findFirst({
      where: { default: true },
      select: { id: true },
    })
    const namaPrinter = `Printer-Uji-${Date.now()}`
    const { id } = await createPrinter({
      nama: namaPrinter,
      tipe: 'ESC_POS',
      lokasi: 'Kasir 1',
      perangkat: 'AA:BB:CC',
      default: true,
      aktif: true,
    })
    printerIds.push(id)

    const def = await printerDefault()
    expect(def?.id).toBe(id)

    await updatePrinter({
      id,
      nama: 'Printer Uji 2',
      tipe: 'ESC_POS',
      lokasi: 'Kasir 2',
      perangkat: 'AA:BB:CC',
      default: true,
      aktif: true,
    })
    expect((await printerDefault())?.nama).toBe('Printer Uji 2')

    await hapusPrinter({ id })
    printerIds.splice(printerIds.indexOf(id), 1)

    // Kembalikan status default printer sebelumnya.
    if (defaultLama) {
      await prisma.printer.update({
        where: { id: defaultLama.id },
        data: { default: true },
      })
    }
  })

  it('perangkat hasil pindai disimpan per pengguna dan tidak duplikat', async () => {
    const user = await prisma.user.findFirst({ select: { id: true } })
    expect(user).not.toBeNull()
    const perangkat = `uji-perangkat-${Date.now()}`
    const pertama = await daftarkanPrinterPerangkat(
      {
        nama: 'Printer BT Uji',
        perangkat,
        koneksi: 'BLUETOOTH',
        vendorName: 'Vendor Uji',
        serialNumber: 'SN-UJI-1',
        productName: 'TM-Uji',
      },
      user!.id,
    )
    printerIds.push(pertama.id)

    expect(pertama.userId).toBe(user!.id)
    expect(pertama.koneksi).toBe('BLUETOOTH')

    const kedua = await daftarkanPrinterPerangkat(
      {
        nama: 'Printer BT Uji 2',
        perangkat,
        koneksi: 'BLUETOOTH',
      },
      user!.id,
    )
    expect(kedua.id).toBe(pertama.id)
    expect(kedua.nama).toBe('Printer BT Uji 2')
    expect(kedua.vendorName).toBe('Vendor Uji')
    expect(kedua.serialNumber).toBe('SN-UJI-1')

    const daftar = await daftarPrinterPerangkat(user!.id)
    expect(daftar.some((p) => p.id === pertama.id)).toBe(true)

    await updatePrinter({
      id: pertama.id,
      nama: 'Printer BT Uji 2',
      tipe: 'ESC_POS',
      perangkat,
      default: false,
      aktif: true,
    })
    const tersimpan = await prisma.printer.findUnique({
      where: { id: pertama.id },
    })
    expect(tersimpan?.koneksi).toBe('BLUETOOTH')
    expect(tersimpan?.serialNumber).toBe('SN-UJI-1')
  })

  it('printer tanpa riwayat bisa dihapus, printer berjob ditolak', async () => {
    const { id } = await createPrinter({
      nama: `Printer-Hapus-${Date.now()}`,
      tipe: 'RAW',
      default: false,
      aktif: true,
    })
    printerIds.push(id)
    await hapusPrinter({ id })
    printerIds.splice(printerIds.indexOf(id), 1)
  })
})

describe('percetakan — antrean job', () => {
  it('buat job → ambil → selesai', async () => {
    const namaPrinter = `Printer-Job-${Date.now()}`
    const printer = await createPrinter({
      nama: namaPrinter,
      tipe: 'ESC_POS',
      default: true,
      aktif: true,
    })
    printerIds.push(printer.id)
    const transaksiId = await buatTransaksi()

    const job = await buatPrintJob({
      printerId: printer.id,
      transaksiId,
      tipe: 'STRUK',
    })
    jobIds.push(job.id)

    expect(job.status).toBe('MENUNGGU')
    expect(job.printerNama).toBe(namaPrinter)
    expect(job.payload?.nomor).toBeTruthy()
    expect(job.payload?.items).toHaveLength(1)
    expect(job.payload?.items[0]?.qty).toBe(3)
    expect(job.payload?.total).toBe(7500)

    const diambil = await ambilPrintJob(job.id)
    expect(diambil.status).toBe('DIPROSES')
    expect(diambil.percobaan).toBe(1)
    expect(diambil.diambilPada).not.toBeNull()

    // Job hanya bisa diambil satu kali.
    await expect(ambilPrintJob(job.id)).rejects.toThrow('sudah diambil')

    const selesai = await selesaiPrintJob(job.id)
    expect(selesai.status).toBe('DICETAK')
    expect(selesai.dicetakPada).not.toBeNull()

    // Printer dengan riwayat cetak tak boleh dihapus.
    await expect(hapusPrinter({ id: printer.id })).rejects.toThrow(
      'riwayat cetak',
    )
  })

  it('idempotencyKey sama → job yang sama (retry tak menghasilkan job ganda)', async () => {
    const transaksiId = await buatTransaksi()
    const key = `job-offline-${Date.now()}`

    const pertama = await buatPrintJob({ transaksiId, idempotencyKey: key })
    const kedua = await buatPrintJob({ transaksiId, idempotencyKey: key })
    jobIds.push(pertama.id)

    expect(kedua.id).toBe(pertama.id)
    const jumlah = await prisma.printJob.count({
      where: { idempotencyKey: key },
    })
    expect(jumlah).toBe(1)
  })

  it('gagal cetak → status GAGAL + pesan', async () => {
    const transaksiId = await buatTransaksi()
    const job = await buatPrintJob({ transaksiId })
    jobIds.push(job.id)

    const gagal = await gagalPrintJob(job.id, 'Paper habis')
    expect(gagal.status).toBe('GAGAL')
    expect(gagal.pesanGalat).toBe('Paper habis')
  })

  it('daftar job bisa difilter status', async () => {
    const transaksiId = await buatTransaksi()
    const job = await buatPrintJob({ transaksiId })
    jobIds.push(job.id)

    const menunggu = await daftarPrintJob({ status: 'MENUNGGU' })
    expect(menunggu.some((j) => j.id === job.id)).toBe(true)

    const dicetak = await daftarPrintJob({ status: 'DICETAK' })
    expect(dicetak.some((j) => j.id === job.id)).toBe(false)
  })

  it('transaksi tak ada → job ditolak', async () => {
    await expect(
      buatPrintJob({ transaksiId: 'transaksi-tidak-ada' }),
    ).rejects.toThrow('Transaksi tidak ditemukan')
  })

  it('ekspor struk PDF memakai snapshot transaksi', async () => {
    const transaksiId = await buatTransaksi()
    const hasil = await eksporStrukPdf(transaksiId)

    expect(hasil.tipe).toBe('application/pdf')
    expect(hasil.nama).toMatch(/^struk-.+\.pdf$/)
    expect(Buffer.from(hasil.isi).subarray(0, 5).toString('ascii')).toBe(
      '%PDF-',
    )
  })
})
