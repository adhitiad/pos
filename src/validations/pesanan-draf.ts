import { z } from 'zod'

// Draft item sederhana untuk dine-in: hanya produkId + qty + modifier.
// Modifier disimpan dengan qty + catatan optional (nama/harga diturunkan
// server saat finalisasi).
export const DraftItemSchema = z.object({
  produkId: z.string().min(1).max(64),
  qty: z.number().int().positive().max(9_999),
  modifiers: z
    .array(
      z.object({
        modifierId: z.string().min(1).max(64),
        qty: z.number().int().positive().max(9_999).default(1),
        catatan: z.string().max(200).optional(),
      }),
    )
    .max(20)
    .optional(),
})

export const MAKS_ITEM_DRAFT = 100
const MAKS_NAMA = 100
const MAKS_TELEPON = 20
const MAKS_CATATAN = 500

// Schema untuk membuat draft dine-in (publik — dikirim customer).
// hanya field aman yang diterima; tidak ada memberId/diskon/pajak dari klien.
// Dine-in selalu butuh token QR bertanda tangan; mejaId mentah ditolak.
export const BuatPesananDrafSchema = z.object({
  mejaToken: z.string().min(1).max(512),
  telepon: z.string().min(1).max(MAKS_TELEPON).optional(),
  nama: z.string().trim().min(1).max(MAKS_NAMA).optional(),
  catatan: z.string().trim().min(1).max(MAKS_CATATAN).optional(),
  items: z.array(DraftItemSchema).min(1, 'Minimal 1 item').max(MAKS_ITEM_DRAFT),
})

export type BuatPesananDrafInput = z.infer<typeof BuatPesananDrafSchema>

// Schema untuk kasir memodifikasi draft (tambah/kurangi item).
export const UpdateItemDraftSchema = z.object({
  produkId: z.string().min(1).max(64),
  qty: z.number().int().nonnegative().max(9_999),
  modifiers: z
    .array(
      z.object({
        modifierId: z.string().min(1).max(64),
        qty: z.number().int().positive().max(9_999).default(1),
        catatan: z.string().max(200).optional(),
      }),
    )
    .max(20)
    .optional(),
})

export const UpdatePesananDrafSchema = z.object({
  id: z.string().min(1).max(64),
  items: z.array(UpdateItemDraftSchema).max(MAKS_ITEM_DRAFT).default([]),
  catatan: z.string().trim().min(1).max(MAKS_CATATAN).optional(),
})

export type UpdatePesananDrafInput = z.infer<typeof UpdatePesananDrafSchema>

// Schema untuk finalisasi draft oleh kasir. `mejaId` opsional: kasir/owner
// boleh memilihkan meja bila meja belum punya QR/token. Publik tidak pernah
// memakai schema ini (route finalisasi ber-guard staf).
export const FinalisasiPesananDrafSchema = z.object({
  id: z.string().min(1).max(64),
  mejaId: z.string().min(1).max(64).optional(),
})

export type FinalisasiPesananDrafInput = z.infer<
  typeof FinalisasiPesananDrafSchema
>

// Schema untuk membatalkan draft.
export const BatalPesananDrafSchema = z.object({
  id: z.string().min(1).max(64),
})

export type BatalPesananDrafInput = z.infer<typeof BatalPesananDrafSchema>
