import { prisma } from '#/db'

// Batas tampilan antrean & riwayat review di dashboard owner.
export const MAKS_DRAFT_MENUNGGU = 100
export const MAKS_RIWAYAT_REVIEW = 50

// ─── Antrean draft menunggu (owner) ───
// Semua draft lintas kasir yang belum diputus, terlama lebih dulu agar
// tidak ada yang tertahan.
export async function daftarDraftMenunggu() {
  const rows = await prisma.draftTransaksi.findMany({
    where: { status: 'MENUNGGU' },
    orderBy: { createdAt: 'asc' },
    take: MAKS_DRAFT_MENUNGGU,
    select: {
      id: true,
      nomor: true,
      status: true,
      subtotal: true,
      total: true,
      metodeBayar: true,
      dibuatOffline: true,
      createdAt: true,
      kasir: { select: { id: true, name: true, email: true } },
    },
  })

  return rows.map((r) => ({
    id: r.id,
    nomor: r.nomor,
    status: r.status,
    subtotal: r.subtotal.toNumber(),
    total: r.total.toNumber(),
    metodeBayar: r.metodeBayar,
    dibuatOffline: r.dibuatOffline,
    createdAt: r.createdAt,
    kasirId: r.kasir.id,
    kasirNama: r.kasir.name || r.kasir.email,
  }))
}

// ─── Riwayat keputusan review ───
// Termasuk draft yang ditolak (transaksiId null) supaya jejak keputusan utuh.
export async function riwayatReviewTransaksi(take = MAKS_RIWAYAT_REVIEW) {
  const batas = Math.min(Math.max(Math.trunc(take), 1), MAKS_RIWAYAT_REVIEW)
  const rows = await prisma.transaksiReviewAudit.findMany({
    orderBy: { createdAt: 'desc' },
    take: batas,
    include: {
      kasir: { select: { name: true, email: true } },
      draft: { select: { nomor: true } },
      transaksi: { select: { nomor: true } },
    },
  })

  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    catatan: r.catatan,
    createdAt: r.createdAt,
    peninjauId: r.kasirId,
    peninjauNama: r.kasir.name || r.kasir.email,
    draftNomor: r.draft?.nomor ?? null,
    transaksiNomor: r.transaksi?.nomor ?? null,
  }))
}
