import { prisma } from '#/db'

import { BuatDraftTransaksiSchema } from '#/validations/draft-transaksi'
import { GalatDomain } from './galat.js'

const hariIni = () => new Date().toISOString().slice(0, 10).replace(/-/g, '')

const nomorDraft = () =>
  `DRAFT-${hariIni()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`

// ─── Buat Draft Transaksi (kasir) ───
// Kasir menyusun transaksi sebagai draft; stok & jurnal BELUM dipotong.
// Draft tersimpan hingga kasir review menyetujui (reviewTransaksi).
export async function buatDraftTransaksi(input: unknown, kasirId: string) {
  const data = BuatDraftTransaksiSchema.parse(input)

  const draft = await prisma.draftTransaksi.create({
    data: {
      nomor: nomorDraft(),
      kasirId,
      payloadJson: data,
      subtotal: data.subtotal,
      total: data.total,
      metodeBayar: data.metodeBayar,
      catatan: data.catatan ?? null,
      waktuKlien: data.waktuKlien ?? null,
      dibuatOffline: data.dibuatOffline,
      idempotencyKey: data.idempotencyKey ?? null,
    },
  })

  return draft
}

// ─── Daftar Draft (kasir) ───
// Kasir melihat draft yang masih MENUNGGU (belum ditinjau).
export async function daftarDraftTransaksi(kasirId: string) {
  return prisma.draftTransaksi.findMany({
    where: { kasirId, status: 'MENUNGGU' },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      nomor: true,
      status: true,
      subtotal: true,
      total: true,
      metodeBayar: true,
      dibuatOffline: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

// ─── Ambil satu draft (untuk ditinjau) ───
export async function getDraftTransaksi(draftId: string) {
  const draft = await prisma.draftTransaksi.findUnique({
    where: { id: draftId },
  })
  if (!draft) throw new GalatDomain('Draft tidak ditemukan')
  return draft
}

// ─── Batalkan draft (kasir sendiri) ───
export async function batalDraftTransaksi(draftId: string, kasirId: string) {
  const draft = await getDraftTransaksi(draftId)
  if (draft.kasirId !== kasirId)
    throw new GalatDomain('Hanya pembuat draft yang dapat membatalkan')
  if (draft.status !== 'MENUNGGU') throw new GalatDomain('Draft sudah ditinjau')

  await prisma.draftTransaksi.update({
    where: { id: draftId },
    data: { status: 'DITOLAK' },
  })

  return draft
}
