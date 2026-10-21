import { prisma } from '#/db'
import { Prisma } from '#/generated/prisma/client.js'
import {
  MemberIdSchema,
  MemberInputSchema,
  UpdateMemberSchema,
} from '#/validations/member'
import type { MemberInput, UpdateMemberInput } from '#/validations/member'
import { pengaturanData } from './pengaturan.js'
import { GalatDomain } from './galat.js'

const kosongKeNull = (v: string | undefined) =>
  v === undefined || v.trim() === '' ? null : v.trim()

export async function memberIdDariEmail(email: string) {
  const member = await prisma.member.findFirst({
    where: { email: { equals: email.trim(), mode: 'insensitive' } },
    select: { id: true },
  })
  return member?.id ?? null
}

// Helper to get all member raw data with include (no pagination)
function getAllMemberRaw() {
  return prisma.member.findMany({
    orderBy: { nama: 'asc' },
    include: {
      _count: { select: { transaksi: true } },
      transaksi: {
        orderBy: { tanggal: 'desc' },
        take: 1,
        select: { tanggal: true, total: true },
      },
    },
  })
}

function pesanUnik(e: unknown, konteks: string): GalatDomain {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    return new GalatDomain(`${konteks} sudah dipakai member lain`)
  }
  throw e
}

export async function memberData(opts?: { take?: number; skip?: number }) {
  // Ambil semua member dari DB, lalu paginasi.
  const rawMembers = await getAllMemberRaw()

  const take = opts?.take ?? rawMembers.length
  const skip = opts?.skip ?? 0
  const sliced = rawMembers.slice(skip, skip + take)

  // Bentuk keluaran untuk UI.
  return sliced.map((m) => ({
    id: m.id,
    nama: m.nama,
    telepon: m.telepon,
    email: m.email,
    alamat: m.alamat,
    poin: m.poin,
    totalBelanja: m.totalBelanja.toNumber(),
    diskonPersen: m.diskonPersen?.toNumber() ?? null,
    tier: m.tier,
    jumlahTransaksi: m._count.transaksi,
    terakhir: m.transaksi[0]
      ? {
          tanggal: m.transaksi[0].tanggal.toISOString(),
          total: m.transaksi[0].total.toNumber(),
        }
      : null,
  }))
}

// Ambang total belanja untuk tiap tier (Rupiah).
const TIER_AMBANG = {
  SILVER: 3_000_000,
  GOLD: 10_000_000,
} as const

// Turunkan total belanja ke tier member. Pure function, diuji di tests/.
export function tierDariTotal(
  totalBelanja: number,
): 'BRONZE' | 'SILVER' | 'GOLD' {
  if (totalBelanja >= TIER_AMBANG.GOLD) return 'GOLD'
  if (totalBelanja >= TIER_AMBANG.SILVER) return 'SILVER'
  return 'BRONZE'
}

// Riwayat lengkap member (digunakan halaman detail & REST /api/v1/member/riwayat).
export async function memberRiwayat(id: string) {
  const { riwayatBelanja: riwayatAktif } = await pengaturanData()
  const member = await prisma.member.findUnique({
    where: { id },
    select: {
      id: true,
      nama: true,
      telepon: true,
      email: true,
      alamat: true,
      poin: true,
      totalBelanja: true,
      diskonPersen: true,
      tier: true,
    },
  })
  if (!member) throw new GalatDomain('Member tidak ditemukan')
  const transaksi = await prisma.transaksi.findMany({
    where: { memberId: id },
    orderBy: { tanggal: 'desc' },
    select: {
      id: true,
      nomor: true,
      tanggal: true,
      subtotal: true,
      diskon: true,
      pajak: true,
      total: true,
      metodeBayar: true,
      uangDiterima: true,
      kembalian: true,
      pembayaran: true,
      cetakOwner: true,
      cetakKasir: true,
      items: {
        select: {
          id: true,
          namaProduk: true,
          qty: true,
          harga: true,
          subtotal: true,
        },
      },
    },
  })
  return {
    member: {
      id: member.id,
      nama: member.nama,
      telepon: member.telepon,
      email: member.email,
      alamat: member.alamat,
      poin: member.poin,
      totalBelanja: member.totalBelanja.toNumber(),
      diskonPersen: member.diskonPersen?.toNumber() ?? null,
      tier: member.tier,
    },
    riwayatAktif,
    transaksi: riwayatAktif
      ? transaksi.map((t) => ({
          id: t.id,
          nomor: t.nomor,
          tanggal: t.tanggal.toISOString(),
          subtotal: t.subtotal.toNumber(),
          diskon: t.diskon.toNumber(),
          pajak: t.pajak.toNumber(),
          total: t.total.toNumber(),
          metodeBayar: t.metodeBayar,
          uangDiterima: t.uangDiterima?.toNumber() ?? null,
          kembalian: t.kembalian?.toNumber() ?? null,
          cetakOwner: t.cetakOwner,
          cetakKasir: t.cetakKasir,
          pembayaran: t.pembayaran.map((p) => ({
            metode: p.metode,
            jumlah: p.jumlah.toNumber(),
            uangDiterima: p.uangDiterima?.toNumber() ?? null,
          })),
          items: t.items.map((it) => ({
            id: it.id,
            nama: it.namaProduk,
            qty: it.qty,
            harga: it.harga.toNumber(),
            subtotal: it.subtotal.toNumber(),
          })),
        }))
      : [],
  }
}

export async function createMember(input: MemberInput) {
  const data = MemberInputSchema.parse(input)
  try {
    return await prisma.member.create({
      data: {
        nama: data.nama,
        telepon: kosongKeNull(data.telepon),
        email: kosongKeNull(data.email),
        alamat: kosongKeNull(data.alamat),
      },
      select: { id: true },
    })
  } catch (e) {
    throw pesanUnik(e, 'Nomor telepon')
  }
}

export async function updateMember(input: UpdateMemberInput) {
  const data = UpdateMemberSchema.parse(input)
  const lama = await prisma.member.findUnique({ where: { id: data.id } })
  if (!lama) throw new GalatDomain('Member tidak ditemukan')
  try {
    const ubah: {
      nama?: string
      telepon?: string | null
      email?: string | null
      alamat?: string | null
      tier?: 'BRONZE' | 'SILVER' | 'GOLD'
      diskonPersen?: number | null
    } = {}
    if (data.nama !== undefined) ubah.nama = data.nama
    if (data.telepon !== undefined) ubah.telepon = kosongKeNull(data.telepon)
    if (data.email !== undefined) ubah.email = kosongKeNull(data.email)
    if (data.alamat !== undefined) ubah.alamat = kosongKeNull(data.alamat)
    if (data.tier !== undefined) ubah.tier = data.tier
    if (data.diskonPersen !== undefined)
      ubah.diskonPersen = data.diskonPersen ?? null
    await prisma.member.update({
      where: { id: data.id },
      data: ubah,
    })
    return { id: data.id }
  } catch (e) {
    throw pesanUnik(e, 'Nomor telepon')
  }
}

export async function hapusMember(input: { id: string }) {
  const data = MemberIdSchema.parse(input)
  const lama = await prisma.member.findUnique({
    where: { id: data.id },
    include: { _count: { select: { transaksi: true } } },
  })
  if (!lama) throw new GalatDomain('Member tidak ditemukan')
  if (lama._count.transaksi > 0) {
    throw new GalatDomain(
      `Member punya ${lama._count.transaksi} riwayat transaksi — tidak bisa dihapus`,
    )
  }
  await prisma.member.delete({ where: { id: data.id } })
  return { id: data.id }
}
