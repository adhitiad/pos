import { z } from 'zod'

const TANGGAL = /^\d{4}-\d{2}-\d{2}$/

// Buka shift: kas awal = uang fisik di drawer saat mulai (integer rupiah).
export const BukaShiftSchema = z.object({
  kasAwal: z.number().int().nonnegative().max(1_000_000_000),
})

export type BukaShiftInput = z.input<typeof BukaShiftSchema>

// Tutup shift: kas akhir = hasil hitung fisik saat tutup + catatan opsional.
export const TutupShiftSchema = z.object({
  kasAkhir: z.number().int().nonnegative().max(1_000_000_000),
  catatan: z.string().max(500).optional(),
})

export type TutupShiftInput = z.input<typeof TutupShiftSchema>

// Filter riwayat shift (default: bulan berjalan sampai hari ini).
export const ShiftDataSchema = z.object({
  dari: z.string().regex(TANGGAL).optional(),
  sampai: z.string().regex(TANGGAL).optional(),
})

export type ShiftDataInput = z.input<typeof ShiftDataSchema>

// Aksi POST /api/v1/shift (web memakai server fn, Expo memakai ini).
export const AksiShiftSchema = z.discriminatedUnion('aksi', [
  z.object({ aksi: z.literal('buka'), kasAwal: BukaShiftSchema.shape.kasAwal }),
  z.object({ aksi: z.literal('tutup'), ...TutupShiftSchema.shape }),
])
