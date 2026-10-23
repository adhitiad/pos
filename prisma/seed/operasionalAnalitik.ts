import { Prisma } from '../../src/generated/prisma/client.js'
import { prisma } from './dasar.js'
import type { PenggunaSeed } from './pengguna.js'
import { hariIni, hariLalu } from './waktu.js'

export async function seedCetak(transaksiIds: string[]) {
  const printer = await prisma.printer.findFirst({
    where: { default: true },
    select: { id: true },
  })
  if (!printer)
    throw new Error('Printer default untuk seed cetak tidak ditemukan')
  const transaksi = await prisma.transaksi.findMany({
    where: { id: { in: transaksiIds } },
    select: {
      id: true,
      nomor: true,
      tanggal: true,
      subtotal: true,
      diskon: true,
      pajak: true,
      pajakJenis: true,
      ongkir: true,
      total: true,
      metodeBayar: true,
      uangDiterima: true,
      kembalian: true,
      catatan: true,
      member: { select: { nama: true } },
      items: {
        select: {
          namaProduk: true,
          qty: true,
          harga: true,
          subtotal: true,
          modifiers: {
            select: {
              qty: true,
              hargaTambahan: true,
              catatan: true,
              modifier: { select: { nama: true } },
            },
          },
        },
      },
      pembayaran: { select: { metode: true, jumlah: true } },
    },
    orderBy: { tanggal: 'asc' },
  })
  if (transaksi.length !== 3) {
    throw new Error(
      `Seed cetak memerlukan 3 transaksi, ditemukan ${transaksi.length}`,
    )
  }
  const [transaksiSelesai, transaksiMenunggu, transaksiGagal] = transaksi
  const struk = (t: (typeof transaksi)[number]) => ({
    nomor: t.nomor,
    tanggal: t.tanggal.toISOString(),
    items: t.items.map((item) => ({
      nama: item.namaProduk,
      qty: item.qty,
      harga: item.harga.toNumber(),
      subtotal: item.subtotal.toNumber(),
      modifier: item.modifiers.map((mod) => ({
        nama: mod.modifier.nama,
        qty: mod.qty,
        tambahan: mod.hargaTambahan.toNumber(),
        catatan: mod.catatan,
      })),
    })),
    subtotal: t.subtotal.toNumber(),
    diskon: t.diskon.toNumber(),
    pajak: t.pajak.toNumber(),
    pajakJenis: t.pajakJenis,
    ongkir: t.ongkir.toNumber(),
    total: t.total.toNumber(),
    metodeBayar: t.metodeBayar,
    pembayaran: t.pembayaran.map((bayar) => ({
      metode: bayar.metode,
      jumlah: bayar.jumlah.toNumber(),
    })),
    uangDiterima: t.uangDiterima?.toNumber() ?? null,
    kembalian: t.kembalian?.toNumber() ?? null,
    memberNama: t.member?.nama ?? null,
    catatan: t.catatan,
  })
  await prisma.printJob.createMany({
    data: [
      {
        printerId: printer.id,
        transaksiId: transaksiSelesai.id,
        tipe: 'STRUK',
        status: 'DICETAK',
        idempotencyKey: 'seed-print-1',
        payload: struk(transaksiSelesai),
        percobaan: 1,
        diambilPada: hariLalu(1, 10, 16),
        dicetakPada: hariLalu(1, 10, 16),
      },
      {
        printerId: printer.id,
        transaksiId: transaksiMenunggu.id,
        tipe: 'STRUK',
        status: 'MENUNGGU',
        idempotencyKey: 'seed-print-2',
        payload: struk(transaksiMenunggu),
      },
      {
        printerId: printer.id,
        transaksiId: transaksiGagal.id,
        tipe: 'STRUK',
        status: 'GAGAL',
        idempotencyKey: 'seed-print-3',
        payload: struk(transaksiGagal),
        percobaan: 2,
        pesanGalat: 'Kertas habis',
      },
    ],
  })
  await prisma.printer.update({
    where: { id: printer.id },
    data: { terakhirDipakai: hariLalu(1, 10, 16) },
  })
}

export async function seedKunjungan(memberId: string) {
  const kunjungan = [
    { path: '/', userType: 'non-member', userId: null },
    { path: '/menu', userType: 'non-member', userId: null },
    { path: '/saya', userType: 'member', userId: memberId },
    { path: '/pesanan', userType: 'member', userId: memberId },
    { path: '/', userType: 'member', userId: memberId },
    { path: '/menu', userType: 'non-member', userId: null },
  ]
  await prisma.pageVisit.createMany({
    data: kunjungan.map((k, index) => ({
      ...k,
      ipAddress: index % 2 === 0 ? '10.0.0.12' : null,
      userAgent: 'Seed Demo Browser',
      createdAt: hariLalu(1 + (index % 4), 8 + index, 0),
    })),
  })
  await prisma.deviceVisit.createMany({
    data: [
      {
        deviceId: 'seed-device-member',
        deviceName: 'iPhone 15',
        os: 'ios',
        ipv4: '10.0.0.12',
        lokasi: 'Jakarta',
        klasifikasi: 'hp',
        userId: memberId,
        userType: 'member',
        createdAt: hariLalu(1, 8, 30),
      },
      {
        deviceId: 'seed-device-tablet',
        deviceName: 'iPad Kasir',
        os: 'ios',
        ipv4: '10.0.0.20',
        lokasi: 'Toko',
        klasifikasi: 'tablet',
        userType: 'non-member',
        createdAt: hariLalu(2, 10, 0),
      },
      {
        deviceId: 'seed-device-laptop',
        deviceName: 'Laptop Admin',
        os: 'windows',
        ipv4: '10.0.0.30',
        lokasi: 'Toko',
        klasifikasi: 'laptop',
        userType: 'non-member',
        createdAt: hariLalu(3, 9, 0),
      },
    ],
  })
}

export async function seedAudit(
  pengguna: PenggunaSeed,
  transaksiIds: string[],
  splitId: string,
  dapurId: string,
) {
  const owner = pengguna.owner[0]
  const produk = await prisma.produk.findFirst({
    where: { sku: 'MNM-001' },
    select: { id: true, nama: true, harga: true },
  })
  const bahan = await prisma.bahan.findFirst({
    where: { nama: 'Biji Kopi' },
    select: { id: true, nama: true, hargaSatuan: true },
  })
  const log: Prisma.AuditLogCreateManyInput[] = []
  if (produk) {
    log.push({
      userId: owner.id,
      action: 'produk.ubah',
      entity: 'Produk',
      entityId: produk.id,
      before: { nama: produk.nama, harga: produk.harga.toNumber() - 1_000 },
      after: { nama: produk.nama, harga: produk.harga.toNumber() },
      timestamp: hariLalu(1, 9, 0),
    })
  }
  if (bahan) {
    log.push({
      userId: owner.id,
      action: 'bahan.ubah',
      entity: 'Bahan',
      entityId: bahan.id,
      before: { nama: bahan.nama, hargaSatuan: bahan.hargaSatuan.toNumber() },
      after: {
        nama: bahan.nama,
        hargaSatuan: bahan.hargaSatuan.toNumber() + 0.05,
      },
      timestamp: hariLalu(2, 11, 0),
    })
  }
  log.push(
    {
      userId: owner.id,
      action: 'pengaturan.ubah',
      entity: 'Pengaturan',
      entityId: 'nama_toko',
      before: { nilai: 'POS Lama' },
      after: { nilai: 'POS Demo' },
      timestamp: hariLalu(3, 9, 30),
    },
    {
      userId: owner.id,
      action: 'user.role.ubah',
      entity: 'User',
      entityId: pengguna.kasir[0]?.id ?? owner.id,
      before: { role: 'MEMBER' },
      after: { role: 'KASIR' },
      timestamp: hariLalu(4, 14, 0),
    },
    {
      userId: null,
      action: 'transaksi.posting',
      entity: 'Transaksi',
      entityId: splitId,
      before: Prisma.JsonNull,
      after: { status: 'LUNAS', sumber: 'seed' },
      timestamp: hariIni(12, 10),
    },
    {
      userId: null,
      action: 'pesanan.dapur',
      entity: 'Transaksi',
      entityId: dapurId,
      before: { status: 'MENUNGGU' },
      after: { status: 'DIPROSES' },
      timestamp: hariIni(11, 5),
    },
    ...transaksiIds.map((id, index) => ({
      userId: owner.id,
      action: 'transaksi.posting',
      entity: 'Transaksi',
      entityId: id,
      before: Prisma.JsonNull,
      after: { status: 'LUNAS', urutan: index + 1 },
      timestamp: hariLalu(1, 10 + index, 0),
    })),
  )
  await prisma.auditLog.createMany({ data: log })
}

export async function sinkronkanShift(shiftIds: string[]) {
  const transaksi = await prisma.transaksi.findMany({
    where: { shiftId: { in: shiftIds } },
    select: {
      shiftId: true,
      pembayaran: { select: { metode: true, jumlah: true } },
    },
  })
  const kas = new Map<string, number>()
  for (const t of transaksi) {
    if (!t.shiftId) continue
    const tunai = t.pembayaran
      .filter((p) => p.metode === 'TUNAI')
      .reduce((jumlah, p) => jumlah + p.jumlah.toNumber(), 0)
    kas.set(t.shiftId, (kas.get(t.shiftId) ?? 0) + tunai)
  }
  for (const [id, tunai] of kas) {
    const shift = await prisma.shift.findUnique({ where: { id } })
    if (!shift || shift.waktuTutup === null) continue
    const seharusnya = shift.kasAwal.toNumber() + tunai
    const selisih = id === shiftIds[0] ? -2_000 : 0
    await prisma.shift.update({
      where: { id },
      data: { kasAkhir: seharusnya + selisih, selisih },
    })
  }
}
