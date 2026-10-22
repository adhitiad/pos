import { prisma } from './dasar.js'
import {
  seedAudit,
  seedCetak,
  seedKunjungan,
  sinkronkanShift,
} from './operasionalAnalitik.js'
import { seedHutang, seedOpname, seedRetur } from './operasionalLain.js'
import type { PenggunaSeed } from './pengguna.js'
import { buatTransaksiDemo, kodeDokumen } from './transaksi.js'
import { hariIni, hariLalu } from './waktu.js'

const unik = <T extends { id: string }>(rows: T[]) => {
  const peta = new Map(rows.map((row) => [row.id, row]))
  return [...peta.values()]
}

export async function seedOperasional(pengguna: PenggunaSeed) {
  const staff = unik([...pengguna.owner, ...pengguna.kasir])
  const kasirUtama = pengguna.kasir[0] ?? pengguna.owner[0]
  const kasirKedua = pengguna.kasir[1] ?? kasirUtama

  const shiftTerbuka = new Map<string, string>()
  for (const [index, user] of staff.entries()) {
    const shift = await prisma.shift.create({
      data: {
        kasirId: user.id,
        waktuBuka: hariIni(8 + index, 0),
        kasAwal: 75_000 + index * 25_000,
        catatan: 'Shift demo seed',
      },
    })
    shiftTerbuka.set(user.id, shift.id)
  }

  const shiftKemarin = await prisma.shift.create({
    data: {
      kasirId: kasirUtama.id,
      waktuBuka: hariLalu(1, 8, 0),
      waktuTutup: hariLalu(1, 17, 0),
      kasAwal: 100_000,
      catatan: 'Shift demo kemarin',
    },
  })
  const shiftTigaHari = await prisma.shift.create({
    data: {
      kasirId: kasirKedua.id,
      waktuBuka: hariLalu(3, 18, 0),
      waktuTutup: hariLalu(3, 22, 0),
      kasAwal: 75_000,
      catatan: 'Shift demo akhir pekan',
    },
  })

  const memberBudi = await prisma.member.findFirst({
    where: { email: 'budi@example.com' },
    select: { id: true },
  })
  const memberSiti = await prisma.member.findFirst({
    where: { email: 'siti@example.com' },
    select: { id: true },
  })
  const delivery = await prisma.delivery.findFirst({
    where: { nama: 'GoSend' },
    select: { id: true },
  })
  const meja = await prisma.meja.findFirst({
    where: { nomor: '1' },
    select: { id: true },
  })

  const t1 = await buatTransaksiDemo({
    nomor: kodeDokumen('POS', hariLalu(1, 10, 15), 9001),
    nomorJurnal: kodeDokumen('JU', hariLalu(1, 10, 15), 9001),
    tanggal: hariLalu(1, 10, 15),
    kasirId: kasirUtama.id,
    shiftId: shiftKemarin.id,
    memberId: memberBudi?.id ?? null,
    metodeBayar: 'TUNAI',
    items: [
      {
        sku: 'MNM-001',
        qty: 2,
        modifier: [
          { grup: 'Tingkat Manis', nama: 'Normal' },
          { grup: 'Ukuran', nama: 'Large' },
        ],
      },
      { sku: 'MKN-001', qty: 1 },
    ],
    diskon: 2_000,
    catatan: 'Pelanggan: Budi Santoso',
    cetakOwner: 1,
    pembayaran: [{ metode: 'TUNAI', jumlah: 46_000, uangDiterima: 50_000 }],
  })
  const t2 = await buatTransaksiDemo({
    nomor: kodeDokumen('POS', hariLalu(1, 15, 40), 9002),
    nomorJurnal: kodeDokumen('JU', hariLalu(1, 15, 40), 9002),
    tanggal: hariLalu(1, 15, 40),
    kasirId: kasirUtama.id,
    shiftId: shiftKemarin.id,
    metodeBayar: 'QRIS',
    items: [
      { sku: 'MNM-002', qty: 3 },
      { sku: 'ML-0100', qty: 1 },
    ],
    cetakKasir: 1,
  })
  const t3 = await buatTransaksiDemo({
    nomor: kodeDokumen('POS', hariLalu(3, 19, 20), 9001),
    nomorJurnal: kodeDokumen('JU', hariLalu(3, 19, 20), 9001),
    tanggal: hariLalu(3, 19, 20),
    kasirId: kasirKedua.id,
    shiftId: shiftTigaHari.id,
    memberId: memberSiti?.id ?? null,
    deliveryId: delivery?.id ?? null,
    ongkir: 12_000,
    metodeBayar: 'TRANSFER',
    items: [
      { sku: 'ML-0100', qty: 2 },
      { sku: 'MNM-001', qty: 1 },
    ],
  })
  await buatTransaksiDemo({
    nomor: kodeDokumen('POS', hariIni(9, 15), 9001),
    nomorJurnal: kodeDokumen('JU', hariIni(9, 15), 9001),
    tanggal: hariIni(9, 15),
    kasirId: pengguna.owner[0].id,
    shiftId: shiftTerbuka.get(pengguna.owner[0].id) ?? null,
    metodeBayar: 'TUNAI',
    items: [{ sku: 'MNM-001', qty: 1 }],
    pembayaran: [{ metode: 'TUNAI', jumlah: 15_000, uangDiterima: 20_000 }],
    cetakOwner: 1,
  })
  await buatTransaksiDemo({
    nomor: kodeDokumen('POS', hariIni(10, 30), 9002),
    nomorJurnal: kodeDokumen('JU', hariIni(10, 30), 9002),
    tanggal: hariIni(10, 30),
    kasirId: kasirUtama.id,
    shiftId: shiftTerbuka.get(kasirUtama.id) ?? null,
    metodeBayar: 'QRIS',
    items: [{ sku: 'MKN-001', qty: 2 }],
  })
  const tDapur = await buatTransaksiDemo({
    nomor: kodeDokumen('POS', hariIni(11, 0), 9003),
    nomorJurnal: kodeDokumen('JU', hariIni(11, 0), 9003),
    tanggal: hariIni(11, 0),
    kasirId: null,
    mejaId: meja?.id ?? null,
    metodeBayar: 'TUNAI',
    statusPesanan: 'DIPROSES',
    catatan: 'Dine-in, tanpa bawang',
    items: [{ sku: 'ML-0100', qty: 2 }],
    pembayaran: [],
  })
  await buatTransaksiDemo({
    nomor: kodeDokumen('POS', hariIni(11, 15), 9004),
    nomorJurnal: kodeDokumen('JU', hariIni(11, 15), 9004),
    tanggal: hariIni(11, 15),
    kasirId: null,
    memberId: memberBudi?.id ?? null,
    deliveryId: delivery?.id ?? null,
    ongkir: 12_000,
    metodeBayar: 'EWALLET',
    statusPesanan: 'MENUNGGU',
    catatan: 'Pesanan online menunggu konfirmasi kasir',
    items: [{ sku: 'MKN-001', qty: 1 }],
    pembayaran: [],
  })
  const tSplit = await buatTransaksiDemo({
    nomor: kodeDokumen('POS', hariIni(12, 10), 9005),
    nomorJurnal: kodeDokumen('JU', hariIni(12, 10), 9005),
    tanggal: hariIni(12, 10),
    kasirId: kasirUtama.id,
    shiftId: shiftTerbuka.get(kasirUtama.id) ?? null,
    metodeBayar: 'TUNAI',
    items: [
      {
        sku: 'MNM-001',
        qty: 1,
        modifier: [{ grup: 'Ukuran', nama: 'Large' }],
      },
      { sku: 'ML-0100', qty: 1 },
    ],
    pembayaran: [
      { metode: 'TUNAI', jumlah: 20_000, uangDiterima: 20_000 },
      { metode: 'QRIS', jumlah: 21_334 },
    ],
  })

  await seedRetur(t1.id, kasirUtama.id)
  await seedHutang()
  await seedOpname(kasirUtama.id)
  await seedCetak([t1.id, t2.id, t3.id])
  await seedKunjungan(pengguna.member.id)
  await seedAudit(pengguna, [t1.id, t2.id], tSplit.id, tDapur.id)
  await sinkronkanShift([shiftKemarin.id, shiftTigaHari.id])
}
