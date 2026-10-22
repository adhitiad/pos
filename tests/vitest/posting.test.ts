import { describe, expect, it, afterAll, beforeAll, beforeEach } from 'vitest'

import { prisma } from '../../src/db.js'
import {
  POIN_NILAI_RUPIAH,
  RUPIAH_PER_POIN,
  hitungRedeem,
  postingTransaksi,
  ringkasHasil,
} from '#/server/transaksi'
import { PostingTransaksiSchema } from '#/validations/transaksi'

async function buatBahan(nama: string, stok: number, hargaSatuan: number) {
  return prisma.bahan.create({
    data: { nama, satuan: 'gr', stok, stokMinimum: 100, hargaSatuan },
  })
}

async function buatProduk(
  nama: string,
  sku: string,
  harga: number,
  stok: number,
  resep: { bahanId: string; jumlah: number }[],
) {
  const kategori = await prisma.kategori.create({
    data: { nama: 'Kategori Test', deskripsi: 'Test' },
  })
  return prisma.produk.create({
    data: {
      nama,
      sku,
      harga,
      stok,
      aktif: true,
      kategoriId: kategori.id,
      resep: {
        create: resep.map((r) => ({ bahanId: r.bahanId, jumlah: r.jumlah })),
      },
    },
  })
}

async function buatMember(nama: string, telepon: string, poin: number) {
  return prisma.member.create({
    data: { nama, telepon, alamat: 'Jl. Test', poin },
  })
}

async function buatGrupModifier(
  nama: string,
  wajib: boolean,
  min: number,
  max: number,
) {
  return prisma.modifierGrup.create({
    data: { nama, wajib, min, max, aktif: true },
  })
}

async function buatModifier(
  grupId: string,
  nama: string,
  hargaTambahan: number,
) {
  return prisma.modifier.create({
    data: { grupId, nama, hargaTambahan, aktif: true },
  })
}

async function bersihkan() {
  await prisma.nomorHarian.deleteMany()
  await prisma.jurnalDetail.deleteMany()
  await prisma.jurnal.deleteMany()
  await prisma.transaksiItem.deleteMany()
  await prisma.retur.deleteMany()
  await prisma.stokOpname.deleteMany()
  await prisma.transaksi.deleteMany()
  await prisma.produkBahan.deleteMany()
  await prisma.produk.deleteMany()
  await prisma.kategori.deleteMany()
  await prisma.bahan.deleteMany()
  await prisma.member.deleteMany()
}

describe('postingTransaksi', () => {
  beforeAll(async () => {
    await bersihkan()
  })
  beforeEach(async () => {
    await bersihkan()
  })
  afterAll(async () => {
    await bersihkan()
  })

  describe('happy path', () => {
    it('berhasil posting: stok berkurang, jurnal dibuat, poin bertambah', async () => {
      const kopi = await buatBahan('Biji Kopi Test', 5000, 1.2)
      const susu = await buatBahan('Susu UHT Test', 20000, 0.02)
      const produk = await buatProduk(
        'Kopi Susu Test',
        'TEST-001',
        15000,
        100,
        [
          { bahanId: kopi.id, jumlah: 20 },
          { bahanId: susu.id, jumlah: 100 },
        ],
      )
      const member = await buatMember('Budi Test', '081234567890', 0)

      const hasil = ringkasHasil(
        await postingTransaksi({
          items: [{ produkId: produk.id, qty: 2 }],
          memberId: member.id,
          diskon: 0,
          pajak: 0,
          tukarPoin: 0,
          metodeBayar: 'TUNAI',
        }),
      )

      expect(hasil.transaksiId).toBeDefined()
      expect(hasil.nomor).toMatch(/^POS-\d{8}-\d{4}$/)
      expect(hasil.subtotal).toBe(30000)
      expect(hasil.diskon).toBe(0)
      expect(hasil.pajak).toBe(0)
      expect(hasil.ongkir).toBe(0)
      expect(hasil.total).toBe(30000)
      expect(hasil.jurnalId).toBeDefined()
      expect(hasil.itemCount).toBe(2)
      expect(hasil.items).toHaveLength(1)
      expect(hasil.items[0].nama).toBe('Kopi Susu Test')
      expect(hasil.items[0].qty).toBe(2)
      const entri = await prisma.jurnalDetail.findMany({
        where: { jurnalId: hasil.jurnalId },
      })
      const totalDebit = entri.reduce((sum, e) => sum + e.debit.toNumber(), 0)
      const totalKredit = entri.reduce((sum, e) => sum + e.kredit.toNumber(), 0)
      expect(totalDebit).toBe(totalKredit)
      expect(entri.some((e) => e.debit.toNumber() === 30000)).toBe(true)
    })

    it('hitung poin diskon pembulatan ke bawah kelipatan Rp100', () => {
      const { poinTerpakai, diskonPoin } = hitungRedeem(15550, 0, 200)
      expect(poinTerpakai).toBe(155)
      expect(diskonPoin).toBe(15500)
      expect(diskonPoin % POIN_NILAI_RUPIAH).toBe(0)
    })

    it('poin dapat = floor(total / 10000)', () => {
      expect(Math.floor(30000 / RUPIAH_PER_POIN)).toBe(3)
      expect(Math.floor(9999 / RUPIAH_PER_POIN)).toBe(0)
    })
  })

  describe('validasi gagal (rollback)', () => {
    it('produk tidak ditemukan → error', async () => {
      await expect(
        postingTransaksi({
          items: [{ produkId: 'tidak-ada', qty: 1 }],
          diskon: 0,
          pajak: 0,
          tukarPoin: 0,
          metodeBayar: 'TUNAI',
        }),
      ).rejects.toThrow(/Produk tidak ditemukan/)
    })

    it('produk nonaktif → error', async () => {
      const kategori = await prisma.kategori.create({
        data: { nama: 'Nonaktif Test', deskripsi: 'Test' },
      })
      const produk = await prisma.produk.create({
        data: {
          nama: 'Produk Nonaktif',
          sku: 'TEST-NONAKTIF',
          harga: 10000,
          stok: 10,
          aktif: false,
          kategoriId: kategori.id,
        },
      })
      await expect(
        postingTransaksi({
          items: [{ produkId: produk.id, qty: 1 }],
          diskon: 0,
          pajak: 0,
          tukarPoin: 0,
          metodeBayar: 'TUNAI',
        }),
      ).rejects.toThrow(/Produk tidak tersedia/)
      const p = await prisma.produk.findUnique({ where: { id: produk.id } })
      expect(p?.stok).toBe(10)
    })

    it('stok produk kurang → error dan stok tidak berubah', async () => {
      const produk = await buatProduk(
        'Stok Kurang Test',
        'TEST-STOK',
        10000,
        1,
        [],
      )
      const stokAwal = (await prisma.produk.findUnique({
        where: { id: produk.id },
      }))!.stok
      await expect(
        postingTransaksi({
          items: [{ produkId: produk.id, qty: 5 }],
          diskon: 0,
          pajak: 0,
          tukarPoin: 0,
          metodeBayar: 'TUNAI',
        }),
      ).rejects.toThrow(/Stok produk tidak mencukupi/)
      const p = await prisma.produk.findUnique({ where: { id: produk.id } })
      expect(p?.stok).toBe(stokAwal)
      const count = await prisma.transaksi.count()
      expect(count).toBe(0)
    })

    it('stok bahan kurang → rollback semua', async () => {
      const kopi = await buatBahan('Bahan Stok Kurang', 5, 1.2)
      const produk = await buatProduk(
        'Produk Bahan Kurang',
        'TEST-BAHAN',
        10000,
        100,
        [{ bahanId: kopi.id, jumlah: 20 }],
      )
      const stokProdukAwal = (await prisma.produk.findUnique({
        where: { id: produk.id },
      }))!.stok
      const stokBahanAwal = (await prisma.bahan.findUnique({
        where: { id: kopi.id },
      }))!.stok.toNumber()

      await expect(
        postingTransaksi({
          items: [{ produkId: produk.id, qty: 1 }],
          diskon: 0,
          pajak: 0,
          tukarPoin: 0,
          metodeBayar: 'TUNAI',
        }),
      ).rejects.toThrow(/Stok bahan baku tidak mencukupi/)

      const p = await prisma.produk.findUnique({ where: { id: produk.id } })
      expect(p?.stok).toBe(stokProdukAwal)
      const b = await prisma.bahan.findUnique({ where: { id: kopi.id } })
      expect(b?.stok.toNumber()).toBe(stokBahanAwal)
    })

    it('stok gabungan dari item ganda ditolak (anti oversell OW-09)', async () => {
      const produk = await buatProduk(
        'Oversell Test',
        'TEST-OVERSELL',
        10000,
        5,
        [],
      )
      await expect(
        postingTransaksi({
          items: [
            { produkId: produk.id, qty: 3 },
            { produkId: produk.id, qty: 3 },
          ],
          diskon: 0,
          pajak: 0,
          tukarPoin: 0,
          metodeBayar: 'TUNAI',
        }),
      ).rejects.toThrow(/Stok produk tidak mencukupi/)
      const p = await prisma.produk.findUnique({ where: { id: produk.id } })
      expect(p?.stok).toBe(5)
      expect(await prisma.transaksi.count()).toBe(0)
    })

    it('diskon melebihi subtotal → error (tidak boleh total negatif)', async () => {
      const produk = await buatProduk(
        'Diskon Lebih Test',
        'TEST-DISKON',
        10000,
        100,
        [],
      )
      const member = await buatMember('Diskon Member Test', '081234567893', 100)
      await prisma.member.update({
        where: { id: member.id },
        data: { diskonPersen: 50 },
      })
      await expect(
        postingTransaksi({
          items: [{ produkId: produk.id, qty: 1 }],
          memberId: member.id,
          diskon: 0,
          pajak: 0,
          tukarPoin: 100,
          metodeBayar: 'TUNAI',
        }),
      ).rejects.toThrow(/Diskon melebihi subtotal/)
      expect(await prisma.transaksi.count()).toBe(0)
    })

    it('pajak dari klien diabaikan, dihitung server (OW-10)', async () => {
      const produk = await buatProduk(
        'Pajak Test',
        'TEST-PAJAK',
        10000,
        100,
        [],
      )
      const hasil = ringkasHasil(
        await postingTransaksi({
          items: [{ produkId: produk.id, qty: 1 }],
          diskon: 0,
          pajak: 500000,
          tukarPoin: 0,
          metodeBayar: 'TUNAI',
        }),
      )
      expect(hasil.pajak).toBe(0)
      expect(hasil.total).toBe(10000)
    })

    it('modifier bukan milik produk ditolak (OW-12)', async () => {
      const produkA = await buatProduk('Mod A', 'TEST-MODA', 10000, 10, [])
      const produkB = await buatProduk('Mod B', 'TEST-MODB', 10000, 10, [])
      const grup = await buatGrupModifier('Saus', false, 0, 99)
      const mod = await buatModifier(grup.id, 'Pedas', 0)
      await prisma.produkModifierGrup.create({
        data: { produkId: produkA.id, grupId: grup.id },
      })
      await expect(
        postingTransaksi({
          items: [
            {
              produkId: produkB.id,
              qty: 1,
              modifiers: [{ modifierId: mod.id, qty: 1 }],
            },
          ],
          diskon: 0,
          pajak: 0,
          tukarPoin: 0,
          metodeBayar: 'TUNAI',
        }),
      ).rejects.toThrow(/Modifier tidak sesuai produk/)
    })

    it('modifier melebihi max ditolak (OW-12)', async () => {
      const produk = await buatProduk('Mod Max', 'TEST-MODMAX', 10000, 10, [])
      const grup = await buatGrupModifier('Topping', false, 0, 1)
      const m1 = await buatModifier(grup.id, 'Keju', 1000)
      const m2 = await buatModifier(grup.id, 'Bacon', 1000)
      await prisma.produkModifierGrup.create({
        data: { produkId: produk.id, grupId: grup.id },
      })
      await expect(
        postingTransaksi({
          items: [
            {
              produkId: produk.id,
              qty: 1,
              modifiers: [
                { modifierId: m1.id, qty: 1 },
                { modifierId: m2.id, qty: 1 },
              ],
            },
          ],
          diskon: 0,
          pajak: 0,
          tukarPoin: 0,
          metodeBayar: 'TUNAI',
        }),
      ).rejects.toThrow(/maksimal 1/)
    })

    it('grup modifier wajib belum dipilih ditolak (OW-12)', async () => {
      const produk = await buatProduk(
        'Mod Wajib',
        'TEST-MODWAJIB',
        10000,
        10,
        [],
      )
      const grup = await buatGrupModifier('Tingkat Manis', true, 1, 1)
      await buatModifier(grup.id, 'Manis', 0)
      await prisma.produkModifierGrup.create({
        data: { produkId: produk.id, grupId: grup.id },
      })
      await expect(
        postingTransaksi({
          items: [{ produkId: produk.id, qty: 1 }],
          diskon: 0,
          pajak: 0,
          tukarPoin: 0,
          metodeBayar: 'TUNAI',
        }),
      ).rejects.toThrow(/minimal 1/)
    })
  })

  describe('redeem poin', () => {
    it('tukar poin mengurangi saldo dan menambah diskon poin', async () => {
      const produk = await buatProduk(
        'Redeer Test',
        'TEST-REDEEM',
        15000,
        100,
        [],
      )
      const member = await buatMember('Redeem Member', '081234567892', 500)

      const hasil = ringkasHasil(
        await postingTransaksi({
          items: [{ produkId: produk.id, qty: 1 }],
          memberId: member.id,
          diskon: 0,
          pajak: 0,
          tukarPoin: 100,
          metodeBayar: 'TUNAI',
        }),
      )

      expect(hasil.diskon).toBe(10000)
      expect(hasil.total).toBe(5000)
      const m = await prisma.member.findUnique({ where: { id: member.id } })
      expect(m?.poin).toBe(400)
    })

    it('tukar poin dibatasi sisa setelah diskon nominal', async () => {
      const produk = await buatProduk(
        'Redeer Diskon',
        'TEST-REDEEM2',
        40000,
        100,
        [],
      )
      const member = await buatMember(
        'Redeem Diskon Member',
        '081234567893',
        500,
      )

      const hasil = ringkasHasil(
        await postingTransaksi({
          items: [{ produkId: produk.id, qty: 1 }],
          memberId: member.id,
          diskon: 2000,
          pajak: 0,
          tukarPoin: 500,
          metodeBayar: 'TUNAI',
        }),
      )

      expect(hasil.diskon).toBe(40000)
      expect(hasil.total).toBe(0)
      const m = await prisma.member.findUnique({ where: { id: member.id } })
      expect(m?.poin).toBe(120)
    })
  })

  describe('ongkir delivery', () => {
    it('ongkir delivery ditambahkan ke total', async () => {
      const kurir = await prisma.delivery.create({
        data: {
          nama: 'Kurir Test',
          tarif: 5000,
          estimasi: '30 menit',
          aktif: true,
        },
      })
      const produk = await buatProduk(
        'Ongkir Test',
        'TEST-ONGKIR',
        10000,
        100,
        [],
      )

      const hasil = ringkasHasil(
        await postingTransaksi({
          items: [{ produkId: produk.id, qty: 1 }],
          deliveryId: kurir.id,
          diskon: 0,
          pajak: 0,
          tukarPoin: 0,
          metodeBayar: 'TUNAI',
        }),
      )

      expect(hasil.ongkir).toBe(5000)
      expect(hasil.total).toBe(15000)
    })
  })

  describe('pembayaran', () => {
    it('tunai: uangDiterima & kembalian tersimpan', async () => {
      const produk = await buatProduk(
        'Bayar Tunai',
        'TEST-BAYAR-1',
        10000,
        10,
        [],
      )
      const hasil = ringkasHasil(
        await postingTransaksi({
          items: [{ produkId: produk.id, qty: 2 }],
          diskon: 0,
          pajak: 0,
          tukarPoin: 0,
          metodeBayar: 'TUNAI',
          uangDiterima: 25000,
        }),
      )
      expect(hasil.total).toBe(20000)
      expect(hasil.uangDiterima).toBe(25000)
      expect(hasil.kembalian).toBe(5000)
      expect(hasil.pembayaran).toHaveLength(1)
      expect(hasil.pembayaran[0].metode).toBe('TUNAI')
      expect(hasil.pembayaran[0].jumlah).toBe(20000)
    })

    it('tunai kurang dari total → error', async () => {
      const produk = await buatProduk(
        'Bayar Kurang',
        'TEST-BAYAR-2',
        10000,
        10,
        [],
      )
      await expect(
        postingTransaksi({
          items: [{ produkId: produk.id, qty: 2 }],
          diskon: 0,
          pajak: 0,
          tukarPoin: 0,
          metodeBayar: 'TUNAI',
          uangDiterima: 15000,
        }),
      ).rejects.toThrow(/kurang dari total/)
    })

    it('split: tiap metode jadi satu baris pembayaran', async () => {
      const produk = await buatProduk(
        'Bayar Split',
        'TEST-BAYAR-3',
        10000,
        10,
        [],
      )
      const hasil = ringkasHasil(
        await postingTransaksi({
          items: [{ produkId: produk.id, qty: 3 }],
          diskon: 0,
          pajak: 0,
          tukarPoin: 0,
          metodeBayar: 'TUNAI',
          pembayaran: [
            { metode: 'TUNAI', jumlah: 10000 },
            { metode: 'QRIS', jumlah: 20000 },
          ],
        }),
      )
      expect(hasil.total).toBe(30000)
      expect(hasil.pembayaran.map((p) => p.metode)).toEqual(['TUNAI', 'QRIS'])
      expect(hasil.uangDiterima).toBe(10000)
      expect(hasil.kembalian).toBe(0)
    })

    it('split: total tidak cocok → error', async () => {
      const produk = await buatProduk(
        'Bayar Split 2',
        'TEST-BAYAR-4',
        10000,
        10,
        [],
      )
      await expect(
        postingTransaksi({
          items: [{ produkId: produk.id, qty: 2 }],
          diskon: 0,
          pajak: 0,
          tukarPoin: 0,
          metodeBayar: 'TUNAI',
          pembayaran: [{ metode: 'QRIS', jumlah: 15000 }],
        }),
      ).rejects.toThrow(/tidak sama dengan total/)
    })

    it('menerima EWALLET sebagai metode', () => {
      const hasil = PostingTransaksiSchema.parse({
        items: [{ produkId: 'x', qty: 1 }],
        metodeBayar: 'EWALLET',
      })
      expect(hasil.metodeBayar).toBe('EWALLET')
    })
  })

  describe('total belanja & tier member (OW-21)', () => {
    it('menambah totalBelanja atomik lalu menghitung ulang tier', async () => {
      const produk = await buatProduk(
        'Belanja Test',
        'TEST-BELANJA',
        3000000,
        10,
        [],
      )
      const member = await buatMember('Belanja Member', '081234567894', 0)
      const baca = async () =>
        prisma.member.findUniqueOrThrow({ where: { id: member.id } })

      await postingTransaksi({
        items: [{ produkId: produk.id, qty: 1 }],
        memberId: member.id,
        diskon: 0,
        pajak: 0,
        tukarPoin: 0,
        metodeBayar: 'TUNAI',
      })
      let m = await baca()
      expect(m.totalBelanja.toNumber()).toBe(3000000)
      expect(m.tier).toBe('SILVER')

      await postingTransaksi({
        items: [{ produkId: produk.id, qty: 3 }],
        memberId: member.id,
        diskon: 0,
        pajak: 0,
        tukarPoin: 0,
        metodeBayar: 'TUNAI',
      })
      m = await baca()
      expect(m.totalBelanja.toNumber()).toBe(12000000)
      expect(m.tier).toBe('GOLD')
    })
  })

  describe('schema validasi', () => {
    it('menolak keranjang kosong', () => {
      expect(() => PostingTransaksiSchema.parse({ items: [] })).toThrow()
    })

    it('menolak qty nol', () => {
      expect(() =>
        PostingTransaksiSchema.parse({ items: [{ produkId: 'x', qty: 0 }] }),
      ).toThrow()
    })

    it('menerima input minimal valid', () => {
      const hasil = PostingTransaksiSchema.parse({
        items: [{ produkId: 'x', qty: 2 }],
      })
      expect(hasil.diskon).toBe(0)
      expect(hasil.pajak).toBe(0)
      expect(hasil.tukarPoin).toBe(0)
      expect(hasil.metodeBayar).toBe('TUNAI')
    })
  })
})

describe('RUPIAH_PER_POIN & POIN_NILAI_RUPIAH', () => {
  it('konstanta benar', () => {
    expect(RUPIAH_PER_POIN).toBe(10_000)
    expect(POIN_NILAI_RUPIAH).toBe(100)
  })
})
