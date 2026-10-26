import { afterAll, describe, expect, it } from 'vitest'

import { prisma } from '#/db'
import { postingTransaksi, ringkasHasil } from '#/server/transaksi'
import { PostingTransaksiSchema } from '#/validations/transaksi'

const produkIds: string[] = []
const transaksiIds: string[] = []
const idempotencyKeys: string[] = []

afterAll(async () => {
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
  await prisma.$disconnect()
})

async function buatProduk(stok = 10) {
  const produk = await prisma.produk.create({
    data: {
      nama: `Produk-Idempotensi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      harga: 1000,
      stok,
      aktif: true,
    },
  })
  produkIds.push(produk.id)
  return produk
}

describe('idempotensi offline', () => {
  it('kunci sama → transaksi sama, stok tak terpotong dua kali', async () => {
    const produk = await buatProduk(10)
    const key = `uji-offline-${Date.now()}`
    idempotencyKeys.push(key)

    const payload = {
      items: [{ produkId: produk.id, qty: 2 }],
      metodeBayar: 'TUNAI' as const,
      idempotencyKey: key,
      dibuatOffline: true,
      waktuKlien: new Date().toISOString(),
    }

    const pertama = ringkasHasil(await postingTransaksi(payload))
    transaksiIds.push(pertama.transaksiId)

    // Retry (respons hilang → antrean offline dikirim ulang).
    const kedua = ringkasHasil(await postingTransaksi(payload))

    expect(kedua.transaksiId).toBe(pertama.transaksiId)
    expect(kedua.nomor).toBe(pertama.nomor)
    expect(kedua.total).toBe(pertama.total)
    expect(kedua.itemCount).toBe(pertama.itemCount)

    const produkSetelah = await prisma.produk.findUniqueOrThrow({
      where: { id: produk.id },
    })
    expect(produkSetelah.stok).toBe(8) // 10 - 2 (satu kali, bukan dua)

    const jumlahTransaksi = await prisma.transaksi.count({
      where: { idempotencyKey: key },
    })
    expect(jumlahTransaksi).toBe(1)
  })

  it('menyimpan jejak offline (dibuatOffline, waktuKlien, hpp, diskonMember)', async () => {
    const produk = await buatProduk(5)
    const key = `uji-jejak-${Date.now()}`
    idempotencyKeys.push(key)
    const waktuKlien = new Date(Date.now() - 60_000).toISOString()

    const hasil = ringkasHasil(
      await postingTransaksi({
        items: [{ produkId: produk.id, qty: 1 }],
        metodeBayar: 'TUNAI',
        idempotencyKey: key,
        dibuatOffline: true,
        waktuKlien,
      }),
    )
    transaksiIds.push(hasil.transaksiId)

    const baris = await prisma.transaksi.findUniqueOrThrow({
      where: { id: hasil.transaksiId },
    })
    expect(baris.dibuatOffline).toBe(true)
    expect(baris.waktuKlien?.toISOString()).toBe(waktuKlien)
    expect(baris.hpp.toNumber()).toBe(0)
    expect(baris.diskonMember.toNumber()).toBe(0)
    // Waktu terima server dicatat eksplisit; bukan berasal dari waktuKlien.
    expect(baris.diterimaPada).toBeInstanceOf(Date)
    expect(Math.abs(baris.diterimaPada.getTime() - Date.now())).toBeLessThan(
      10_000,
    )
    expect(baris.tanggal.getTime()).toBeGreaterThanOrEqual(
      baris.diterimaPada.getTime() - 2_000,
    )
  })

  it('menolak waktuKlien ekstrem dan offline tanpa idempotencyKey', () => {
    const dasar = { items: [{ produkId: 'produk-uji', qty: 1 }] }
    const sekarang = Date.now()

    expect(() =>
      PostingTransaksiSchema.parse({
        ...dasar,
        waktuKlien: new Date(sekarang + 25 * 60 * 60 * 1_000).toISOString(),
      }),
    ).toThrow(/di luar batas/)

    expect(() =>
      PostingTransaksiSchema.parse({
        ...dasar,
        waktuKlien: new Date(sekarang - 25 * 60 * 60 * 1_000).toISOString(),
      }),
    ).toThrow(/di luar batas/)

    expect(() =>
      PostingTransaksiSchema.parse({
        ...dasar,
        dibuatOffline: true,
      }),
    ).toThrow(/idempotencyKey/)
  })

  it('kunci berbeda → transaksi terpisah', async () => {
    const produk = await buatProduk(10)
    const satu = ringkasHasil(
      await postingTransaksi({
        items: [{ produkId: produk.id, qty: 1 }],
        metodeBayar: 'TUNAI',
        idempotencyKey: `beda-a-${Date.now()}`,
      }),
    )
    const dua = ringkasHasil(
      await postingTransaksi({
        items: [{ produkId: produk.id, qty: 1 }],
        metodeBayar: 'TUNAI',
        idempotencyKey: `beda-b-${Date.now()}`,
      }),
    )
    transaksiIds.push(satu.transaksiId, dua.transaksiId)

    expect(satu.transaksiId).not.toBe(dua.transaksiId)
    const produkSetelah = await prisma.produk.findUniqueOrThrow({
      where: { id: produk.id },
    })
    expect(produkSetelah.stok).toBe(8)
  })
})
