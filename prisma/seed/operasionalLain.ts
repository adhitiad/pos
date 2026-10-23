import { prisma } from './dasar.js'
import { kodeDokumen } from './transaksi.js'
import { hariIni, hariLalu } from './waktu.js'

export async function seedRetur(transaksiId: string, kasirId: string) {
  const item = await prisma.transaksiItem.findFirst({
    where: { transaksiId, namaProduk: 'Pisang Goreng' },
  })
  if (!item)
    throw new Error('Item Pisang Goreng untuk seed retur tidak ditemukan')
  const tanggal = hariLalu(1, 11, 0)
  const retur = await prisma.retur.create({
    data: {
      nomor: kodeDokumen('RT', tanggal, 9001),
      tanggal,
      transaksiId,
      kasirId,
      alasan: 'Pelanggan membatalkan satu item',
      totalRetur: item.harga.toNumber(),
      items: {
        create: [
          {
            produkId: item.produkId,
            namaProduk: item.namaProduk,
            qty: 1,
            hargaSatuan: item.harga,
            subtotal: item.harga,
          },
        ],
      },
    },
  })
  if (item.produkId) {
    await prisma.produk.update({
      where: { id: item.produkId },
      data: { stok: { increment: 1 } },
    })
  }
  const akun = await prisma.akun.findMany({
    where: { kode: { in: ['1100', '4100'] } },
  })
  const idAkun = new Map(akun.map((a) => [a.kode, a.id]))
  await prisma.jurnal.create({
    data: {
      nomor: kodeDokumen('JU', tanggal, 9006),
      tanggal,
      keterangan: `Pembalik retur ${retur.nomor}`,
      entri: {
        create: [
          { akunId: idAkun.get('1100')!, debit: item.harga, kredit: 0 },
          { akunId: idAkun.get('4100')!, debit: 0, kredit: item.harga },
        ],
      },
    },
  })
}

export async function seedHutang() {
  const supplier = await prisma.supplier.findFirst({
    where: { nama: 'Toko Grosir Sumber Makmur' },
  })
  const bahanKopi = await prisma.bahan.findFirst({
    where: { nama: 'Biji Kopi' },
  })
  const bahanGula = await prisma.bahan.findFirst({
    where: { nama: 'Gula Aren' },
  })
  if (!supplier || !bahanKopi || !bahanGula) {
    throw new Error('Supplier atau bahan untuk seed hutang tidak ditemukan')
  }

  await prisma.pembelianBahan.create({
    data: {
      bahanId: bahanKopi.id,
      supplierId: supplier.id,
      jumlah: 1_000,
      hargaSatuan: 1_100,
      totalHarga: 1_100_000,
      tanggal: hariLalu(5, 9, 0),
      catatan: 'Restok biji kopi',
      belumDibayar: 0,
      sumberBelanja: 'SUPPLIER',
    },
  })
  const hutang = await prisma.pembelianBahan.create({
    data: {
      bahanId: bahanGula.id,
      supplierId: supplier.id,
      jumlah: 3_000,
      hargaSatuan: 28,
      totalHarga: 84_000,
      tanggal: hariLalu(2, 10, 0),
      catatan: 'Restok gula aren tempo 7 hari',
      belumDibayar: 84_000,
      sumberBelanja: 'SUPPLIER',
    },
  })
  await prisma.pembayaranHutang.create({
    data: {
      supplierId: supplier.id,
      pembelianBahanId: hutang.id,
      jumlah: 50_000,
      tanggal: hariLalu(1, 13, 0),
      catatan: 'Pembayaran sebagian',
    },
  })
  await prisma.pembelianBahan.update({
    where: { id: hutang.id },
    data: { belumDibayar: 34_000 },
  })
  await prisma.pembelianBahan.create({
    data: {
      bahanId: bahanKopi.id,
      jumlah: 500,
      hargaSatuan: 1_150,
      totalHarga: 575_000,
      tanggal: hariLalu(1, 16, 0),
      catatan: 'Belanja pasar',
      belumDibayar: 0,
      sumberBelanja: 'PASAR_OFFLINE',
      tempatBelanja: 'Pasar Kebayoran',
    },
  })
}

export async function seedOpname(kasirId: string) {
  const produk = await prisma.produk.findFirst({ where: { sku: 'MNM-002' } })
  const bahan = await prisma.bahan.findFirst({ where: { nama: 'Biji Kopi' } })
  if (!produk || !bahan) {
    throw new Error('Produk atau bahan untuk seed opname tidak ditemukan')
  }

  const tanggal = hariIni(13, 0)
  const stokProduk = produk.stok
  const stokFisikProduk = Math.max(0, stokProduk - 1)
  await prisma.produk.update({
    where: { id: produk.id },
    data: { stok: stokFisikProduk },
  })
  await prisma.stokOpname.create({
    data: {
      nomor: kodeDokumen('OP', tanggal, 9001),
      tanggal,
      kasirId,
      jenis: 'PRODUK',
      catatan: 'Hitung fisik produk jadi',
      items: {
        create: [
          {
            produkId: produk.id,
            stokTercatat: stokProduk,
            stokFisik: stokFisikProduk,
            selisih: stokFisikProduk - stokProduk,
          },
        ],
      },
    },
  })

  const stokBahan = bahan.stok
  const stokFisikBahan = Math.max(0, stokBahan.toNumber() - 50)
  await prisma.bahan.update({
    where: { id: bahan.id },
    data: { stok: stokFisikBahan },
  })
  await prisma.stokOpname.create({
    data: {
      nomor: kodeDokumen('OP', tanggal, 9002),
      tanggal,
      kasirId,
      jenis: 'BAHAN',
      catatan: 'Hitung fisik bahan baku',
      items: {
        create: [
          {
            bahanId: bahan.id,
            stokTercatat: stokBahan,
            stokFisik: stokFisikBahan,
            selisih: stokFisikBahan - stokBahan.toNumber(),
          },
        ],
      },
    },
  })
}
