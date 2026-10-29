import { prisma } from './dasar.js'

const WAJIB: Record<string, number> = {
  kategori: 2,
  bahan: 24,
  produk: 25,
  produkBahan: 25,
  member: 1,
  delivery: 2,
  meja: 3,
  modifierGrup: 3,
  modifier: 7,
  akun: 7,
  pengaturan: 13,
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

  const [produkAktif, produkTanpaKategori, resepTidakValid] = await Promise.all(
    [
      prisma.produk.count({ where: { aktif: true } }),
      prisma.produk.count({ where: { kategoriId: null } }),
      prisma.produkBahan.count({ where: { jumlah: { lte: 0 } } }),
    ],
  )
  if (produkAktif < 25) {
    throw new Error(`Seed hanya membuat ${produkAktif}/25 produk aktif`)
  }
  if (produkTanpaKategori > 0) {
    throw new Error(
      `Seed menghasilkan ${produkTanpaKategori} produk tanpa kategori`,
    )
  }
  if (resepTidakValid > 0) {
    throw new Error(
      `Seed menghasilkan ${resepTidakValid} baris resep tidak valid`,
    )
  }

  const penggunaPeran = await prisma.user.groupBy({
    by: ['role'],
    _count: { _all: true },
  })
  if (!penggunaPeran.some((baris) => baris.role === 'OWNER')) {
    throw new Error('Seed tidak menghasilkan pengguna OWNER untuk tes')
  }
  if (!penggunaPeran.some((baris) => baris.role === 'MEMBER')) {
    throw new Error('Seed tidak menghasilkan pengguna MEMBER untuk tes')
  }
  if (!penggunaPeran.some((baris) => baris.role === 'KASIR')) {
    throw new Error('Seed tidak menghasilkan pengguna KASIR untuk tes')
  }
  const ukuranKertas = await prisma.pengaturan.findUnique({
    where: { kunci: 'ukuran_kertas_termal' },
    select: { nilai: true },
  })
  if (ukuranKertas?.nilai !== '58x40') {
    throw new Error('Seed belum mengisi default ukuran kertas thermal')
  }

  const jobsCetak = await prisma.printJob.findMany({
    select: { payload: true },
  })
  const jobTidakLengkap = jobsCetak.filter((job) => {
    if (
      !job.payload ||
      typeof job.payload !== 'object' ||
      Array.isArray(job.payload)
    ) {
      return true
    }
    const payload = job.payload
    return (
      typeof payload.nomor !== 'string' ||
      !Array.isArray(payload.items) ||
      payload.items.length === 0
    )
  })
  if (jobTidakLengkap.length > 0) {
    throw new Error(
      `Seed menghasilkan ${jobTidakLengkap.length} payload cetak tidak lengkap`,
    )
  }

  console.log('📦 Ringkasan seed:')
  console.table({
    kategori: jumlah.kategori,
    produk: jumlah.produk,
    produkAktif,
    produkBahan: jumlah.produkBahan,
    bahan: jumlah.bahan,
    meja: jumlah.meja,
    modifierGrup: jumlah.modifierGrup,
    modifier: jumlah.modifier,
    supplier: jumlah.supplier,
    printer: jumlah.printer,
    akun: jumlah.akun,
    member: jumlah.member,
    delivery: jumlah.delivery,
    pengaturan: jumlah.pengaturan,
    user: jumlah.user,
    shift: jumlah.shift,
    transaksi: jumlah.transaksi,
    transaksiItem: jumlah.transaksiItem,
    pembayaran: jumlah.pembayaran,
    jurnal: jumlah.jurnal,
    jurnalDetail: jumlah.jurnalDetail,
    pembelianBahan: jumlah.pembelianBahan,
    pembayaranHutang: jumlah.pembayaranHutang,
    retur: jumlah.retur,
    returItem: jumlah.returItem,
    stokOpname: jumlah.stokOpname,
    stokOpnameItem: jumlah.stokOpnameItem,
    printJob: jumlah.printJob,
    auditLog: jumlah.auditLog,
    pageVisit: jumlah.pageVisit,
    deviceVisit: jumlah.deviceVisit,
  })
  console.log('✅ Semua tabel demo terisi dan seluruh jurnal berimbang.')
}
