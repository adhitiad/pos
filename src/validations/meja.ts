import { z } from 'zod'

export const MejaInputSchema = z.object({
  nomor: z.string().trim().min(1, 'Nomor meja wajib diisi').max(20),
  nama: z.string().trim().max(100).optional().or(z.literal('')),
  aktif: z.boolean().default(true),
})

export const UpdateMejaSchema = MejaInputSchema.extend({
  id: z.string().min(1),
})

export const HapusMejaSchema = z.object({
  id: z.string().min(1),
})

export const ToggleMejaSchema = z.object({
  id: z.string().min(1),
  aktif: z.boolean(),
})

export const QrMejaSchema = z.object({
  id: z.string().min(1).max(64),
})

export const GenerateMejaSchema = z.object({
  dari: z.coerce.number().int().min(1).max(9999),
  sampai: z.coerce.number().int().min(1).max(9999),
  aktif: z.boolean().default(true),
})

export type MejaInput = z.infer<typeof MejaInputSchema>
export type UpdateMejaInput = z.infer<typeof UpdateMejaSchema>
export type GenerateMejaInput = z.infer<typeof GenerateMejaSchema>
