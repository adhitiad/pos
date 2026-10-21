import { z } from 'zod'

export const ModifierGrupInputSchema = z.object({
  nama: z.string().trim().min(1, 'Nama grup wajib diisi').max(100),
  wajib: z.boolean().default(false),
  min: z.number().int().nonnegative().default(0),
  max: z.number().int().nonnegative().default(99),
  aktif: z.boolean().default(true),
})

export const UpdateModifierGrupSchema = ModifierGrupInputSchema.extend({
  id: z.string().min(1),
})

export const ModifierInputSchema = z.object({
  grupId: z.string().min(1, 'Grup wajib dipilih'),
  nama: z.string().trim().min(1, 'Nama modifier wajib diisi').max(100),
  hargaTambahan: z.number().nonnegative().default(0),
  aktif: z.boolean().default(true),
})

export const UpdateModifierSchema = ModifierInputSchema.extend({
  id: z.string().min(1),
})

export type ModifierGrupInput = z.infer<typeof ModifierGrupInputSchema>
export type UpdateModifierGrupInput = z.infer<typeof UpdateModifierGrupSchema>
export type ModifierInput = z.infer<typeof ModifierInputSchema>
export type UpdateModifierInput = z.infer<typeof UpdateModifierSchema>

export const ModifierGrupIdSchema = z.object({ id: z.string().min(1) })

export const ModifierIdSchema = z.object({ id: z.string().min(1) })

export const ToggleModifierGrupSchema = z.object({
  id: z.string().min(1),
  aktif: z.boolean(),
})

export const ToggleModifierSchema = z.object({
  id: z.string().min(1),
  aktif: z.boolean(),
})
