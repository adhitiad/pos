import { prisma } from '#/db'

import type { Role } from '#/generated/prisma/enums.js'
import type { PostingTransaksiInput } from '#/validations/transaksi'
import { catatAudit } from './audit.js'
import { GalatDomain } from './galat.js'
import { modeReviewTransaksi } from './pengaturan.js'
import { bolehReviewTransaksi } from './reviewPolicy.js'
import { postingTransaksi, ringkasHasil } from './transaksi.js'

// ─── Review Draft Transaksi (kasir self-approve atau owner) ───
// Peninjau menyetujui atau menolak draft. Jika disetujui, draft diposting
// atomik ke Transaksi (stok & jurnal terpotong), lalu dicatat ke
// TransaksiReviewAudit (audit terpisah dari AuditLog) dan AuditLog.
// Kebijakan `review_transaksi_mode` menentukan siapa yang berwenang:
// `kasir` (default, self-approve) atau `owner` (wajib persetujuan owner).
export async function reviewTransaksi(
  draftId: string,
  keputusan: 'DISETUJUI' | 'DITOLAK',
  catatan: string | undefined,
  peninjauId: string,
  peran: Role,
) {
  const draft = await prisma.draftTransaksi.findUnique({
    where: { id: draftId },
  })
  if (!draft) throw new GalatDomain('Draft tidak ditemukan')
  if (draft.status !== 'MENUNGGU') throw new GalatDomain('Draft sudah ditinjau')

  const mode = await modeReviewTransaksi()
  const kebijakan = bolehReviewTransaksi({
    mode,
    peran,
    peninjauId,
    pembuatDraftId: draft.kasirId,
  })
  if (!kebijakan.boleh) {
    // Mode owner: kasir tidak memposting, tetapi draft tetap MENUNGGU dan
    // masuk antrean owner — bukan kegagalan.
    if (kebijakan.kode === 'MENUNGGU_OWNER') {
      return {
        draftId,
        keputusan: 'MENUNGGU' as const,
        transaksiId: null,
        hasil: null,
      }
    }
    throw new GalatDomain(
      kebijakan.alasan ?? 'Tidak berwenang meninjau draft ini',
    )
  }

  // DITOLAK: tidak ada posting; catat keputusan + ubah status draft atomik.
  if (keputusan === 'DITOLAK') {
    await prisma.$transaction(async (tx) => {
      await tx.transaksiReviewAudit.create({
        data: {
          draftId,
          transaksiId: null,
          kasirId: peninjauId,
          status: 'DITOLAK',
          catatan: catatan ?? null,
        },
      })
      await tx.draftTransaksi.update({
        where: { id: draftId },
        data: {
          status: 'DITOLAK',
          reviewedById: peninjauId,
          reviewedAt: new Date(),
        },
      })
    })

    await catatAudit({
      aktorId: peninjauId,
      aksi: 'transaksi.review.tolak',
      entitas: 'DraftTransaksi',
      entitasId: draftId,
      catatan: catatan ?? null,
      sebelum: { status: 'MENUNGGU' },
      sesudah: { status: 'DITOLAK', peninjauId },
    })

    return { draftId, keputusan: 'DITOLAK', transaksiId: null, hasil: null }
  }

  // DISETUJUI: posting atomik. Pemilik transaksi tetap kasir pembuat draft;
  // `aktor` memakai peninjau agar kebijakan diskon mengikuti perannya.
  const posting = await prisma.$transaction(async (tx) => {
    const input = draft.payloadJson as unknown as PostingTransaksiInput
    const result = await postingTransaksi(input, draft.kasirId, {
      sumber: 'POS',
      aktor: { id: peninjauId, peran },
      tx,
    })

    await tx.transaksiReviewAudit.create({
      data: {
        draftId,
        transaksiId: result.transaksi.id,
        kasirId: peninjauId,
        status: 'DISETUJUI',
        catatan: catatan ?? null,
      },
    })

    await tx.draftTransaksi.update({
      where: { id: draftId },
      data: {
        status: 'DISETUJUI',
        reviewedById: peninjauId,
        reviewedAt: new Date(),
        transaksiId: result.transaksi.id,
      },
    })

    return result
  })

  await catatAudit({
    aktorId: peninjauId,
    aksi: 'transaksi.review.setujui',
    entitas: 'DraftTransaksi',
    entitasId: draftId,
    catatan: catatan ?? null,
    sebelum: { status: 'MENUNGGU' },
    sesudah: { status: 'DISETUJUI', peninjauId },
  })

  return {
    draftId,
    keputusan: 'DISETUJUI',
    transaksiId: posting.transaksi.id,
    hasil: ringkasHasil(posting),
  }
}
