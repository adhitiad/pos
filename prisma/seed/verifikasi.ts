import { prisma } from './dasar.js'

const WAJIB: Record<string, number> = {
  kategori: 2,
  bahan: 24,
  produk: 25,
  produkBahan: 1,
  member: 1,
  delivery: 2,
  meja: 3,
  modifierGrup: 3,
  modifier: 7,
  akun: 7,
  pengaturan: 11,
  supplier: 2,
  printer: 2,
  user: 2,
  shift: 1,
  transaksi: 5,
  transaksiItem: 5,
  pembayaran: 5,
  jurnal: 5,
  jurnalDetail: 10,
  pembelianBahan: 3,
  pembayaranHutang: 1,
  retur: 1,
  returItem: 1,
  stokOpname: 2,
  stokOpnameItem: 2,
  printJob: 3,
  auditLog: 3,
  pageVisit: 6,
  deviceVisit: 3,
}

// Cek setelah seed: jangan pernah melaporkan "selesai" bila ada tabel demo
// yang kosong atau jurnal tidak berimbang. Ini yang membuat `db:seed` aman
// dipakai berulang sebelum tes manual/pentest.
export async function verifikasiSeed() {
  const jumlah = {
    kategori: await prisma.kategori.count(),
    bahan: await prisma.bahan.count(),
    produk: await prisma.produk.count(),
    produkBahan: await prisma.produkBahan.count(),
    member: await prisma.member.count(),
    delivery: await prisma.delivery.count(),
    meja: await prisma.meja.count(),
    modifierGrup: await prisma.modifierGrup.count(),
    modifier: await prisma.modifier.count(),
    akun: await prisma.akun.count(),
    pengaturan: await prisma.pengaturan.count(),
    supplier: await prisma.supplier.count(),
    printer: await prisma.printer.count(),
    user: await prisma.user.count(),
    shift: await prisma.shift.count(),
    transaksi: await prisma.transaksi.count(),
    transaksiItem: await prisma.transaksiItem.count(),
    pembayaran: await prisma.pembayaran.count(),
    jurnal: await prisma.jurnal.count(),
    jurnalDetail: await prisma.jurnalDetail.count(),
    pembelianBahan: await prisma.pembelianBahan.count(),
    pembayaranHutang: await prisma.pembayaranHutang.count(),
    retur: await prisma.retur.count(),
    returItem: await prisma.returItem.count(),
    stokOpname: await prisma.stokOpname.count(),
    stokOpnameItem: await prisma.stokOpnameItem.count(),
    printJob: await prisma.printJob.count(),
    auditLog: await prisma.auditLog.count(),
    pageVisit: await prisma.pageVisit.count(),
    deviceVisit: await prisma.deviceVisit.count(),
  }

  const kurang = Object.entries(WAJIB).filter(
    ([nama, minimal]) => jumlah[nama as keyof typeof jumlah] < minimal,
  )
  if (kurang.length > 0) {
    const rincian = kurang
      .map(
        ([nama, minimal]) =>
          `${nama}: ${jumlah[nama as keyof typeof jumlah]}/${minimal}`,
      )
      .join(', ')
    throw new Error(`Seed belum lengkap → ${rincian}`)
  }

  const produkNegatif = await prisma.produk.count({
    where: { stok: { lt: 0 } },
  })
  const bahanNegatif = await prisma.bahan.count({ where: { stok: { lt: 0 } } })
  if (produkNegatif > 0 || bahanNegatif > 0) {
    throw new Error(
      `Seed menghasilkan stok negatif (produk ${produkNegatif}, bahan ${bahanNegatif})`,
    )
  }

  const jurnal = await prisma.jurnal.findMany({
    include: { entri: { select: { debit: true, kredit: true } } },
  })
  for (const j of jurnal) {
    const debit = j.entri.reduce((total, e) => total + e.debit.toNumber(), 0)
    const kredit = j.entri.reduce((total, e) => total + e.kredit.toNumber(), 0)
    if (debit !== kredit) {
      throw new Error(
        `Jurnal ${j.nomor} tidak berimbang (${debit} vs ${kredit})`,
      )
    }
  }

  const produkAktif = await prisma.produk.count({ where: { aktif: true } })
  console.log('📦 Ringkasan seed:')
  console.table({
    produk: jumlah.produk,
    produkAktif,
    bahan: jumlah.bahan,
    member: jumlah.member,
    transaksi: jumlah.transaksi,
    itemTransaksi: jumlah.transaksiItem,
    pembayaran: jumlah.pembayaran,
    jurnal: jumlah.jurnal,
    pembelian: jumlah.pembelianBahan,
    retur: jumlah.retur,
    opname: jumlah.stokOpname,
    printJob: jumlah.printJob,
    auditLog: jumlah.auditLog,
    user: jumlah.user,
    shift: jumlah.shift,
  })
  console.log('✅ Semua tabel demo terisi dan seluruh jurnal berimbang.')
}
