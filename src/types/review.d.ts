import type { Role } from '#/generated/prisma/enums.js'

// Bentuk data antrean review yang dikirim server function ke UI owner.

export interface DraftMenunggu {
  id: string
  nomor: string
  status: string
  subtotal: number
  total: number
  metodeBayar: string
  dibuatOffline: boolean
  createdAt: string | Date
  kasirId: string
  kasirNama: string
}

export interface RiwayatReview {
  id: string
  status: string
  catatan: string | null
  createdAt: string | Date
  peninjauId: string
  peninjauNama: string
  draftNomor: string | null
  transaksiNomor: string | null
}

// Kebijakan review dua-fasa (A1). `kasir` = self-approve (default toko tunggal),
// `owner` = draft wajib diputus owner sebelum diposting.
export type ModeReviewTransaksi = 'kasir' | 'owner'

export type KodeKebijakan =
  'MENUNGGU_OWNER' | 'BUKAN_PEMILIK' | 'PERAN_TIDAK_VALID'

export interface KonteksReview {
  mode: ModeReviewTransaksi
  peran: Role
  peninjauId: string
  pembuatDraftId: string
}

export interface HasilKebijakan {
  boleh: boolean
  kode?: KodeKebijakan
  alasan?: string
}
