import { describe, expect, it, afterAll, beforeAll, beforeEach } from 'vitest'

import { prisma } from '../../src/db.js'
import { catatPengeluaran } from '#/server/pengeluaran.js'

const TANGGAL = '2026-10-22'

async function bersihkan() {
  await prisma.jurnalDetail.deleteMany()
  await prisma.jurnal.deleteMany()
  await prisma.nomorHarian.deleteMany()
}

async function ambilEntriJurnal(jurnalId: string) {
  const rows = await prisma.jurnalDetail.findMany({
    where: { jurnalId },
    include: { akun: true },
    orderBy: { akun: { kode: 'asc' } },
  })
  return rows.map((e) => ({
    id: e.id,
    akunId: e.akunId,
    akunKode: e.akun.kode,
    akunNama: e.akun.nama,
    debit: e.debit.toNumber(),
    kredit: e.kredit.toNumber(),
    keterangan: e.keterangan,
  }))
}

describe('catatPengeluaran', () => {
  beforeAll(async () => {
    await bersihkan()
  })
  beforeEach(async () => {
    await bersihkan()
  })
  afterAll(async () => {
    await bersihkan()
  })

  describe('tiap jenis akun', () => {
    it.each([
      ['belanja', '5200'] as const,
      ['operasional_kasir', '5300'] as const,
      ['ambil_owner', '3100'] as const,
      ['pembayaran_utang', '2200'] as const,
      ['operasional_toko', '5400'] as const,
      ['lainnya', '5900'] as const,
    ])('jenis %s → debit akun %s, kredit Kas 1100', async (jenis, kodeAkun) => {
      const hasil = await catatPengeluaran({
        tanggal: TANGGAL,
        nominal: 100_000,
        jenis,
        keterangan: 'Test pengeluaran',
      })

      expect(hasil.jurnal.nomor).toMatch(/^JU-\d{8}-\d{4}$/)
      expect(hasil.jurnal.keterangan).toContain('Test pengeluaran')

      const entri = await ambilEntriJurnal(hasil.jurnal.id)
      expect(entri).toHaveLength(2)

      const debit = entri.find((e) => e.akunKode === kodeAkun)
      const kredit = entri.find((e) => e.akunKode === '1100')

      expect(debit).toBeDefined()
      expect(debit?.debit).toBe(100_000)
      expect(debit?.kredit).toBe(0)

      expect(kredit).toBeDefined()
      expect(kredit?.debit).toBe(0)
      expect(kredit?.kredit).toBe(100_000)
    })
  })

  describe('validasi', () => {
    it('menolak nominal nol', async () => {
      await expect(
        catatPengeluaran({
          tanggal: TANGGAL,
          nominal: 0,
          jenis: 'belanja',
          keterangan: '',
        }),
      ).rejects.toThrow()
    })

    it('menolak nominal negatif', async () => {
      await expect(
        catatPengeluaran({
          tanggal: TANGGAL,
          nominal: -50_000,
          jenis: 'belanja',
          keterangan: '',
        }),
      ).rejects.toThrow()
    })

    it('menolak jenis tidak dikenal', async () => {
      await expect(
        catatPengeluaran({
          tanggal: TANGGAL,
          nominal: 50_000,
          jenis: 'jenis_tidak_ada' as any,
          keterangan: '',
        }),
      ).rejects.toThrow('Jenis akun pengeluaran tidak valid')
    })

    it('menolak akun tujuan tidak ada di CoA', async () => {
      // Hapus akun 5200 lalu coba belanja, kembalikan setelah uji
      await prisma.akun.delete({ where: { kode: '5200' } })
      try {
        await expect(
          catatPengeluaran({
            tanggal: TANGGAL,
            nominal: 50_000,
            jenis: 'belanja',
            keterangan: '',
          }),
        ).rejects.toThrow('Akun 5200 tidak ditemukan')
      } finally {
        await prisma.akun.create({
          data: { kode: '5200', nama: 'Beban Belanja', tipe: 'BEBAN' },
        })
      }
    })

    it('jurnal selalu berimbang (debit = kredit)', async () => {
      const hasil = await catatPengeluaran({
        tanggal: TANGGAL,
        nominal: 250_000,
        jenis: 'operasional_toko',
        keterangan: '',
      })

      const entri = await ambilEntriJurnal(hasil.jurnal.id)
      const totalDebit = entri.reduce((s, e) => s + e.debit, 0)
      const totalKredit = entri.reduce((s, e) => s + e.kredit, 0)
      expect(totalDebit).toBe(totalKredit)
      expect(totalDebit).toBe(250_000)
    })
  })
})
