import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { prisma } from '#/db'
import {
  buatPengajuan,
  daftarPengajuan,
  setujuiPengajuan,
  tolakPengajuan,
} from '#/server/pengajuan'

const unik = Date.now()
const KASIR = { id: `test-kasir-${unik}`, nama: 'Kasir Test' }
const OWNER = { id: `test-owner-${unik}`, nama: 'Owner Test' }

async function buatPengguna(id: string, nama: string, role: 'KASIR' | 'OWNER') {
  const sekarang = new Date()
  return await prisma.user.create({
    data: {
      id,
      name: `${nama} ${unik}`,
      email: `${id}@test.local`,
      emailVerified: true,
      role,
      createdAt: sekarang,
      updatedAt: sekarang,
    },
  })
}

async function bersihkan() {
  await prisma.pengajuanPengeluaran.deleteMany({
    where: { kasirId: KASIR.id },
  })
  await prisma.notifikasi.deleteMany({
    where: { userId: { in: [KASIR.id, OWNER.id] } },
  })
  await prisma.jurnalDetail.deleteMany()
  await prisma.jurnal.deleteMany()
  await prisma.nomorHarian.deleteMany()
}

async function entriJurnal(jurnalId: string) {
  return await prisma.jurnalDetail.findMany({
    where: { jurnalId },
    include: { akun: true },
  })
}

beforeAll(async () => {
  await buatPengguna(KASIR.id, KASIR.nama, 'KASIR')
  await buatPengguna(OWNER.id, OWNER.nama, 'OWNER')
})

beforeEach(async () => {
  await bersihkan()
})

afterAll(async () => {
  await bersihkan()
  await prisma.user.deleteMany({
    where: { id: { in: [KASIR.id, OWNER.id] } },
  })
})

describe('buatPengajuan', () => {
  it('menyimpan ajuan PENDING tanpa menyentuh jurnal', async () => {
    const jumlahJurnalSebelum = await prisma.jurnal.count()

    const pengajuan = await buatPengajuan(KASIR.id, {
      nominal: 75_000,
      jenis: 'operasional_kasir',
      keterangan: 'Bensin antar',
    })

    expect(pengajuan.status).toBe('PENDING')
    expect(pengajuan.nominal).toBe(75_000)
    expect(pengajuan.kasirNama).toContain(KASIR.nama)
    expect(await prisma.jurnal.count()).toBe(jumlahJurnalSebelum)
  })

  it('memberi tahu owner beserta nominal ajuan', async () => {
    const pengajuan = await buatPengajuan(KASIR.id, {
      nominal: 75_000,
      jenis: 'operasional_kasir',
      keterangan: '',
    })

    const notifikasi = await prisma.notifikasi.findFirst({
      where: { userId: OWNER.id, entitasId: pengajuan.id },
    })

    expect(notifikasi?.tipe).toBe('PENGAJUAN')
    expect(notifikasi?.pesan).toContain('75.000')
  })
})

describe('setujuiPengajuan', () => {
  it('membuat jurnal berimbang dan mengabari kasir', async () => {
    const pengajuan = await buatPengajuan(KASIR.id, {
      nominal: 100_000,
      jenis: 'operasional_toko',
      keterangan: 'Beli보험',
    })

    const hasil = await setujuiPengajuan(OWNER.id, {
      id: pengajuan.id,
      nominal: 100_000,
    })

    expect(hasil.pengajuan.status).toBe('DISETUJUI')
    expect(hasil.pengajuan.nominalDisetujui).toBe(100_000)
    expect(hasil.pengajuan.jurnalNomor).toMatch(/^JU-\d{8}-\d{4}$/)

    const entri = await entriJurnal(hasil.jurnal.id)
    expect(entri).toHaveLength(2)

    const debit = entri.find((e) => e.akun.kode === '5400')
    const kredit = entri.find((e) => e.akun.kode === '1100')
    expect(debit?.debit.toNumber()).toBe(100_000)
    expect(kredit?.kredit.toNumber()).toBe(100_000)

    const notifikasi = await prisma.notifikasi.findFirst({
      where: { userId: KASIR.id, entitasId: pengajuan.id, tipe: 'SETUJUI' },
    })
    expect(notifikasi?.pesan).toContain('100.000')
  })

  it('owner boleh menyetujui nominal lebih kecil dari ajuan', async () => {
    const pengajuan = await buatPengajuan(KASIR.id, {
      nominal: 100_000,
      jenis: 'operasional_kasir',
      keterangan: '',
    })

    const hasil = await setujuiPengajuan(OWNER.id, {
      id: pengajuan.id,
      nominal: 60_000,
    })

    expect(hasil.pengajuan.nominalDisetujui).toBe(60_000)

    const entri = await entriJurnal(hasil.jurnal.id)
    const debit = entri.find((e) => e.akun.kode === '5300')
    expect(debit?.debit.toNumber()).toBe(60_000)

    const notifikasi = await prisma.notifikasi.findFirst({
      where: { userId: KASIR.id, entitasId: pengajuan.id, tipe: 'SETUJUI' },
    })
    expect(notifikasi?.pesan).toContain('60.000')
  })

  it('menolak nominal yang melebihi ajuan', async () => {
    const pengajuan = await buatPengajuan(KASIR.id, {
      nominal: 50_000,
      jenis: 'belanja',
      keterangan: '',
    })

    await expect(
      setujuiPengajuan(OWNER.id, { id: pengajuan.id, nominal: 60_000 }),
    ).rejects.toThrow('tidak boleh lebih besar dari ajuan')
  })

  it('menolak pengajuan yang sudah diproses', async () => {
    const pengajuan = await buatPengajuan(KASIR.id, {
      nominal: 50_000,
      jenis: 'belanja',
      keterangan: '',
    })
    await setujuiPengajuan(OWNER.id, { id: pengajuan.id })

    await expect(
      setujuiPengajuan(OWNER.id, { id: pengajuan.id }),
    ).rejects.toThrow('sudah diproses')
  })
})

describe('tolakPengajuan', () => {
  it('menyimpan alasan dan mengabari kasir', async () => {
    const pengajuan = await buatPengajuan(KASIR.id, {
      nominal: 30_000,
      jenis: 'operasional_kasir',
      keterangan: '',
    })

    const hasil = await tolakPengajuan(OWNER.id, {
      id: pengajuan.id,
      alasan: 'Anggaran bulan ini habis',
    })

    expect(hasil.status).toBe('DITOLAK')
    expect(hasil.alasanPenolakan).toBe('Anggaran bulan ini habis')
    expect(hasil.jurnalNomor).toBeNull()

    const notifikasi = await prisma.notifikasi.findFirst({
      where: { userId: KASIR.id, entitasId: pengajuan.id, tipe: 'TOLAK' },
    })
    expect(notifikasi?.pesan).toContain('Anggaran bulan ini habis')
  })
})

describe('daftarPengajuan', () => {
  it('kasir hanya melihat ajuannya sendiri, owner melihat semua', async () => {
    const pengajuan = await buatPengajuan(KASIR.id, {
      nominal: 20_000,
      jenis: 'lainnya',
      keterangan: '',
    })

    const milikKasir = await daftarPengajuan({
      id: KASIR.id,
      role: 'KASIR',
    })
    const milikOwner = await daftarPengajuan({
      id: OWNER.id,
      role: 'OWNER',
    })

    expect(milikKasir.map((p) => p.id)).toEqual([pengajuan.id])
    expect(milikOwner.map((p) => p.id)).toContain(pengajuan.id)
  })

  it('menaruh ajuan yang menunggu di paling atas', async () => {
    const lama = await buatPengajuan(KASIR.id, {
      nominal: 10_000,
      jenis: 'lainnya',
      keterangan: '',
    })
    await setujuiPengajuan(OWNER.id, { id: lama.id })

    const baru = await buatPengajuan(KASIR.id, {
      nominal: 20_000,
      jenis: 'lainnya',
      keterangan: '',
    })

    const daftar = await daftarPengajuan({ id: OWNER.id, role: 'OWNER' })
    expect(daftar[0]?.id).toBe(baru.id)
  })
})
