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

export type MejaInput = z.infer<typeof MejaInputSchema>
export type UpdateMejaInput = z.infer<typeof UpdateMejaSchema>
