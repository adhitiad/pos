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
  hapusPrinterPerangkat,
  printerDefault,
  selesaiPrintJob,
  setDefaultPrinterPerangkat,
  updatePrinter,
} from '#/server/percetakan'
import { postingTransaksi } from '#/server/transaksi'
import { eksporStrukPdf } from '#/server/strukPdf'
import {
  PrinterDeviceInputSchema,
  PrinterInputSchema,
} from '#/validations/percetakan'

const printerIds: string[] = []
const produkIds: string[] = []
const transaksiIds: string[] = []
const jobIds: string[] = []
const userIds: string[] = []

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
  await prisma.auditLog.deleteMany({
    where: { entity: 'Printer', entityId: { in: printerIds } },
  })
  await prisma.printer.deleteMany({ where: { id: { in: printerIds } } })
  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
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

async function buatPenggunaUji(penanda: string) {
  const user = await prisma.user.create({
    data: {
      id: `uji-printer-${penanda}`,
      name: 'Pengguna Uji Printer',
      email: `uji-printer-${penanda}@example.test`,
      emailVerified: true,
      role: 'KASIR',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
  userIds.push(user.id)
  return user
}

describe('printer — validasi teks', () => {
  it('menolak karakter kontrol pada nama dan metadata', () => {
    expect(() => PrinterInputSchema.parse({ nama: 'Printer\nLihat' })).toThrow(
      /karakter kontrol/,
    )
    expect(() =>
      PrinterDeviceInputSchema.parse({
        nama: 'Printer',
        perangkat: 'usb-1',
        koneksi: 'USB',
        serialNumber: 'SN\u0007',
      }),
    ).toThrow(/karakter kontrol/)
    expect(() =>
      PrinterDeviceInputSchema.parse({
        nama: 'Printer',
        perangkat: 'usb-1',
        koneksi: 'USB',
        vendorName: 'Vendor\u001b',
      }),
    ).toThrow(/karakter kontrol/)
  })
})

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

    // Kembalikan status default printer sebelumnya.
    if (defaultLama) {
      await prisma.printer.update({
        where: { id: defaultLama.id },
        data: { default: true },
      })
    }
  })

  it('perangkat hasil pindai disimpan per pengguna dan tidak duplikat', async () => {
    const penanda = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const user = await prisma.user.create({
      data: {
        id: `uji-perangkat-${penanda}`,
        name: 'Pengguna Uji Perangkat',
        email: `uji-perangkat-${penanda}@example.test`,
        emailVerified: true,
        role: 'KASIR',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    userIds.push(user.id)
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
      user.id,
    )
    printerIds.push(pertama.id)

    expect(pertama.userId).toBe(user.id)
    expect(pertama.koneksi).toBe('BLUETOOTH')

    const kedua = await daftarkanPrinterPerangkat(
      {
        nama: 'Printer BT Uji 2',
        perangkat,
        koneksi: 'BLUETOOTH',
      },
      user.id,
    )
    expect(kedua.id).toBe(pertama.id)
    expect(kedua.nama).toBe('Printer BT Uji 2')
    expect(kedua.vendorName).toBe('Vendor Uji')
    expect(kedua.serialNumber).toBe('SN-UJI-1')

    const daftar = await daftarPrinterPerangkat(user.id)
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
  })

  it('membatasi 20 perangkat per pengguna, update perangkat lama tetap boleh', async () => {
    const penanda = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const user = await buatPenggunaUji(penanda)
    const perangkatAwal = Array.from(
      { length: 20 },
      (_, i) => `batas-${penanda}-${i}`,
    )
    await prisma.printer.createMany({
      data: perangkatAwal.map((perangkat, i) => ({
        userId: user.id,
        nama: `Perangkat Uji ${i}`,
        perangkat,
        koneksi: 'BLUETOOTH',
        default: false,
        aktif: i !== 0,
      })),
    })
    const semua = await prisma.printer.findMany({
      where: { userId: user.id },
      select: { id: true, perangkat: true },
    })
    printerIds.push(...semua.map((p) => p.id))
    const lama = semua.find((p) => p.perangkat === perangkatAwal[0])
    expect(lama).toBeTruthy()

    await expect(
      daftarkanPrinterPerangkat(
        {
          nama: 'Perangkat Baru',
          perangkat: `batas-${penanda}-baru`,
          koneksi: 'BLUETOOTH',
        },
        user.id,
      ),
    ).rejects.toMatchObject({ kode: 'LIMIT_PERANGKAT' })
    expect(await prisma.printer.count({ where: { userId: user.id } })).toBe(20)

    const diperbarui = await daftarkanPrinterPerangkat(
      {
        nama: 'Perangkat Lama Diperbarui',
        perangkat: perangkatAwal[0],
        koneksi: 'BLUETOOTH',
      },
      user.id,
    )
    expect(diperbarui.id).toBe(lama!.id)
    expect(diperbarui.aktif).toBe(true)
  })

  it('pendaftaran paralel tidak melewati batas perangkat', async () => {
    const penanda = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const user = await buatPenggunaUji(penanda)
    await prisma.printer.createMany({
      data: Array.from({ length: 19 }, (_, i) => ({
        userId: user.id,
        nama: `Perangkat Awal ${i}`,
        perangkat: `paralel-${penanda}-${i}`,
        koneksi: 'WIFI',
      })),
    })
    const semua = await prisma.printer.findMany({
      where: { userId: user.id },
      select: { id: true },
    })
    printerIds.push(...semua.map((p) => p.id))

    const hasil = await Promise.allSettled([
      daftarkanPrinterPerangkat(
        {
          nama: 'Perangkat Paralel A',
          perangkat: `paralel-${penanda}-a`,
          koneksi: 'WIFI',
        },
        user.id,
      ),
      daftarkanPrinterPerangkat(
        {
          nama: 'Perangkat Paralel B',
          perangkat: `paralel-${penanda}-b`,
          koneksi: 'WIFI',
        },
        user.id,
      ),
    ])

    expect(hasil.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    const ditolak = hasil.find((r) => r.status === 'rejected')
    expect(ditolak).toMatchObject({
      status: 'rejected',
      reason: { kode: 'LIMIT_PERANGKAT' },
    })
    expect(await prisma.printer.count({ where: { userId: user.id } })).toBe(20)
    const akhir = await prisma.printer.findMany({
      where: { userId: user.id },
      select: { id: true },
    })
    printerIds.push(
      ...akhir.map((p) => p.id).filter((id) => !printerIds.includes(id)),
    )
  })

  it('10 pendaftaran paralel perangkat yang sama tetap satu baris', async () => {
    const penanda = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const user = await buatPenggunaUji(penanda)
    const perangkat = `paralel-sama-${penanda}`

    const hasil = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        daftarkanPrinterPerangkat(
          {
            nama: `Perangkat Paralel ${i}`,
            perangkat,
            koneksi: 'WIFI',
          },
          user.id,
          user.id,
        ),
      ),
    )

    expect(new Set(hasil.map((p) => p.id)).size).toBe(1)
    expect(
      await prisma.printer.count({ where: { userId: user.id, perangkat } }),
    ).toBe(1)
    printerIds.push(hasil[0].id)
  })

  it('scan berulang <5 menit tidak menulis ulang dipindaiPada', async () => {
    const penanda = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const user = await buatPenggunaUji(penanda)
    const awal = await daftarkanPrinterPerangkat(
      {
        nama: 'Perangkat Scan',
        perangkat: `scan-${penanda}`,
        koneksi: 'WIFI',
      },
      user.id,
      user.id,
    )
    printerIds.push(awal.id)

    const kedua = await daftarkanPrinterPerangkat(
      {
        nama: 'Perangkat Scan',
        perangkat: `scan-${penanda}`,
        koneksi: 'WIFI',
      },
      user.id,
      user.id,
    )
    expect(kedua.dipindaiPada).toBe(awal.dipindaiPada)

    const ubahMetadata = await daftarkanPrinterPerangkat(
      {
        nama: 'Perangkat Scan Baru',
        perangkat: `scan-${penanda}`,
        koneksi: 'WIFI',
      },
      user.id,
      user.id,
    )
    expect(ubahMetadata.nama).toBe('Perangkat Scan Baru')
    expect(ubahMetadata.dipindaiPada).toBe(awal.dipindaiPada)

    await prisma.printer.update({
      where: { id: awal.id },
      data: { dipindaiPada: new Date(Date.now() - 6 * 60_000) },
    })
    const setelahJeda = await daftarkanPrinterPerangkat(
      {
        nama: 'Perangkat Scan Baru',
        perangkat: `scan-${penanda}`,
        koneksi: 'WIFI',
      },
      user.id,
      user.id,
    )
    expect(setelahJeda.dipindaiPada).not.toBe(awal.dipindaiPada)
  })

  it('default perangkat per user terisolasi dan fallback ke global', async () => {
    const penanda = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const userA = await buatPenggunaUji(`${penanda}-a`)
    const userB = await buatPenggunaUji(`${penanda}-b`)
    const a = await daftarkanPrinterPerangkat(
      {
        nama: 'Default A',
        perangkat: `user-default-a-${penanda}`,
        koneksi: 'WIFI',
      },
      userA.id,
      userA.id,
    )
    const b = await daftarkanPrinterPerangkat(
      {
        nama: 'Default B',
        perangkat: `user-default-b-${penanda}`,
        koneksi: 'WIFI',
      },
      userB.id,
      userB.id,
    )
    printerIds.push(a.id, b.id)

    await setDefaultPrinterPerangkat({ id: a.id }, userA.id, userA.id)
    await setDefaultPrinterPerangkat({ id: b.id }, userB.id, userB.id)
    expect((await printerDefault(userA.id))?.id).toBe(a.id)
    expect((await printerDefault(userB.id))?.id).toBe(b.id)

    const transaksiId = await buatTransaksi()
    const job = await buatPrintJob({ transaksiId }, userA.id)
    jobIds.push(job.id)
    expect(job.printerId).toBe(a.id)

    await expect(
      setDefaultPrinterPerangkat({ id: a.id }, userB.id, userB.id),
    ).rejects.toThrow('Perangkat tidak ditemukan')

    await hapusPrinterPerangkat({ id: a.id }, userA.id, userA.id)
    expect((await printerDefault(userA.id))?.id).not.toBe(a.id)
    expect((await printerDefault(userB.id))?.id).toBe(b.id)
  })

  it('mencatat audit mutasi tanpa membocorkan metadata perangkat', async () => {
    const penanda = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const user = await buatPenggunaUji(penanda)
    const master = await createPrinter(
      {
        nama: 'Printer Audit',
        tipe: 'ESC_POS',
        perangkat: `audit-${penanda}`,
        serialNumber: 'SN-RAHASIA',
        vendorName: 'Vendor Rahasia',
        default: false,
        aktif: true,
      },
      user.id,
      user.id,
    )
    printerIds.push(master.id)

    const auditBuat = await prisma.auditLog.findFirst({
      where: { action: 'printer.buat', entityId: master.id },
      orderBy: { timestamp: 'desc' },
    })
    expect(auditBuat?.userId).toBe(user.id)
    expect(auditBuat?.after).toMatchObject({
      nama: 'Printer Audit',
      metadataBerubah: true,
    })
    expect(JSON.stringify(auditBuat?.after)).not.toContain('SN-RAHASIA')
    expect(JSON.stringify(auditBuat?.after)).not.toContain('Vendor Rahasia')

    await updatePrinter(
      {
        id: master.id,
        nama: 'Printer Audit Diubah',
        tipe: 'ESC_POS',
        perangkat: `audit-${penanda}`,
        default: false,
        aktif: true,
      },
      user.id,
    )
    const auditUbah = await prisma.auditLog.findFirst({
      where: { action: 'printer.ubah', entityId: master.id },
      orderBy: { timestamp: 'desc' },
    })
    expect(auditUbah?.before).toMatchObject({ nama: 'Printer Audit' })
    expect(auditUbah?.after).toMatchObject({ nama: 'Printer Audit Diubah' })

    const perangkat = await daftarkanPrinterPerangkat(
      {
        nama: 'Perangkat Audit',
        perangkat: `audit-perangkat-${penanda}`,
        koneksi: 'BLUETOOTH',
        serialNumber: 'SN-PERANGKAT',
      },
      user.id,
      user.id,
    )
    printerIds.push(perangkat.id)
    const jumlahAwal = await prisma.auditLog.count({
      where: { entityId: perangkat.id },
    })
    expect(jumlahAwal).toBe(1)
    expect(
      JSON.stringify(
        (
          await prisma.auditLog.findFirst({
            where: { entityId: perangkat.id },
          })
        )?.after,
      ),
    ).not.toContain('SN-PERANGKAT')

    await daftarkanPrinterPerangkat(
      {
        nama: 'Perangkat Audit',
        perangkat: `audit-perangkat-${penanda}`,
        koneksi: 'BLUETOOTH',
        serialNumber: 'SN-PERANGKAT',
      },
      user.id,
      user.id,
    )
    expect(
      await prisma.auditLog.count({ where: { entityId: perangkat.id } }),
    ).toBe(1)

    await daftarkanPrinterPerangkat(
      {
        nama: 'Perangkat Audit Diubah',
        perangkat: `audit-perangkat-${penanda}`,
        koneksi: 'BLUETOOTH',
        serialNumber: 'SN-PERANGKAT',
      },
      user.id,
      user.id,
    )
    expect(
      await prisma.auditLog.count({ where: { entityId: perangkat.id } }),
    ).toBe(2)

    await hapusPrinter({ id: master.id }, user.id)
    const auditHapus = await prisma.auditLog.findFirst({
      where: { action: 'printer.hapus', entityId: master.id },
      orderBy: { timestamp: 'desc' },
    })
    expect(auditHapus?.before).toMatchObject({ nama: 'Printer Audit Diubah' })
  })

  it('perangkat hanya bisa dinonaktifkan pemilik; permanen ditolak bila berjob', async () => {
    const penanda = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const userA = await buatPenggunaUji(`${penanda}-a`)
    const userB = await buatPenggunaUji(`${penanda}-b`)
    const perangkatA = await daftarkanPrinterPerangkat(
      {
        nama: 'Perangkat A',
        perangkat: `hapus-${penanda}-a`,
        koneksi: 'WIFI',
      },
      userA.id,
      userA.id,
    )
    const perangkatB = await daftarkanPrinterPerangkat(
      {
        nama: 'Perangkat B',
        perangkat: `hapus-${penanda}-b`,
        koneksi: 'WIFI',
      },
      userB.id,
      userB.id,
    )
    printerIds.push(perangkatA.id, perangkatB.id)

    await expect(
      hapusPrinterPerangkat({ id: perangkatA.id }, userB.id, userB.id),
    ).rejects.toThrow('Perangkat tidak ditemukan')
    expect(
      (await prisma.printer.findUnique({ where: { id: perangkatA.id } }))
        ?.aktif,
    ).toBe(true)

    const nonaktif = await hapusPrinterPerangkat(
      { id: perangkatA.id },
      userA.id,
      userA.id,
    )
    expect(nonaktif.dihapus).toBe(false)
    expect(
      (await prisma.printer.findUnique({ where: { id: perangkatA.id } }))
        ?.aktif,
    ).toBe(false)
    expect(
      (await daftarPrinterPerangkat(userA.id)).some(
        (p) => p.id === perangkatA.id,
      ),
    ).toBe(false)

    const job = await prisma.printJob.create({
      data: { printerId: perangkatB.id, tipe: 'STRUK', status: 'MENUNGGU' },
    })
    jobIds.push(job.id)
    await expect(
      hapusPrinterPerangkat(
        { id: perangkatB.id, permanen: true },
        userB.id,
        userB.id,
      ),
    ).rejects.toMatchObject({ kode: 'PERANGKAT_BERJOB' })
    expect(
      await prisma.printer.findUnique({ where: { id: perangkatB.id } }),
    ).not.toBeNull()

    await prisma.printJob.deleteMany({ where: { printerId: perangkatB.id } })
    const permanen = await hapusPrinterPerangkat(
      { id: perangkatA.id, permanen: true },
      userA.id,
      userA.id,
    )
    expect(permanen.dihapus).toBe(true)
    expect(
      await prisma.printer.findUnique({ where: { id: perangkatA.id } }),
    ).toBeNull()

    const auditNonaktif = await prisma.auditLog.findFirst({
      where: { action: 'printer.perangkat.nonaktif', entityId: perangkatA.id },
    })
    expect(auditNonaktif?.before).toMatchObject({ aktif: true })
    expect(auditNonaktif?.after).toMatchObject({ aktif: false })
  })

  it('default printer tetap tunggal saat dua request bersamaan', async () => {
    const penanda = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const user = await buatPenggunaUji(penanda)
    const defaultLama = await prisma.printer.findFirst({
      where: { default: true, aktif: true },
      select: { id: true },
    })
    const a = await createPrinter(
      {
        nama: `Default A ${penanda}`,
        tipe: 'ESC_POS',
        perangkat: `default-a-${penanda}`,
        default: false,
        aktif: true,
      },
      user.id,
      user.id,
    )
    const b = await createPrinter(
      {
        nama: `Default B ${penanda}`,
        tipe: 'ESC_POS',
        perangkat: `default-b-${penanda}`,
        default: false,
        aktif: true,
      },
      user.id,
      user.id,
    )
    printerIds.push(a.id, b.id)

    const hasil = await Promise.allSettled([
      updatePrinter(
        {
          id: a.id,
          nama: `Default A ${penanda}`,
          tipe: 'ESC_POS',
          perangkat: `default-a-${penanda}`,
          default: true,
          aktif: true,
        },
        user.id,
      ),
      updatePrinter(
        {
          id: b.id,
          nama: `Default B ${penanda}`,
          tipe: 'ESC_POS',
          perangkat: `default-b-${penanda}`,
          default: true,
          aktif: true,
        },
        user.id,
      ),
    ])
    expect(hasil.every((r) => r.status === 'fulfilled')).toBe(true)
    const aktifDefault = await prisma.printer.findMany({
      where: { default: true, aktif: true },
      select: { id: true },
    })
    expect(aktifDefault).toHaveLength(1)
    expect([a.id, b.id]).toContain(aktifDefault[0]?.id)

    await prisma.printer.deleteMany({ where: { id: { in: [a.id, b.id] } } })
    if (defaultLama) {
      await prisma.printer.update({
        where: { id: defaultLama.id },
        data: { default: true },
      })
    }
  })

  it('gagal membuat default tidak menghapus default lama', async () => {
    const penanda = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const user = await buatPenggunaUji(penanda)
    const defaultLama = await prisma.printer.findFirst({
      where: { default: true, aktif: true },
      select: { id: true },
    })
    const pertama = await createPrinter(
      {
        nama: `Rollback ${penanda}`,
        tipe: 'ESC_POS',
        perangkat: `rollback-${penanda}`,
        default: true,
        aktif: true,
      },
      user.id,
      user.id,
    )
    printerIds.push(pertama.id)

    await expect(
      createPrinter(
        {
          nama: `Rollback Duplikat ${penanda}`,
          tipe: 'ESC_POS',
          perangkat: `rollback-${penanda}`,
          default: true,
          aktif: true,
        },
        user.id,
        user.id,
      ),
    ).rejects.toMatchObject({ code: 'P2002' })
    expect(
      (await prisma.printer.findUnique({ where: { id: pertama.id } }))?.default,
    ).toBe(true)

    await prisma.printer.delete({ where: { id: pertama.id } })
    if (defaultLama) {
      await prisma.printer.update({
        where: { id: defaultLama.id },
        data: { default: true },
      })
    }
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

    const dipakai = await prisma.printer.findUnique({
      where: { id: printer.id },
      select: { terakhirDipakai: true },
    })
    expect(dipakai?.terakhirDipakai).toBeInstanceOf(Date)

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
