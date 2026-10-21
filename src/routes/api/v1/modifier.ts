import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, gagal, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import {
  modifierData,
  createModifier,
  hapusModifier,
  updateModifier,
} from '#/server/modifier'
import {
  ModifierInputSchema,
  UpdateModifierSchema,
} from '#/validations/modifier'
import { GrupIdQuerySchema, IdQuerySchema } from '#/validations/id'

export const Route = createFileRoute('/api/v1/modifier')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          const grupId =
            new URL(request.url).searchParams.get('grupId') ?? undefined
          const parsed = GrupIdQuerySchema.safeParse({ grupId })
          if (!parsed.success) {
            return gagal('BAD_REQUEST', 'Query ?grupId= harus cuid', 400)
          }
          return ok(await modifierData(parsed.data.grupId))
        } catch (e) {
          return apiError(e)
        }
      },
      POST: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          return ok(
            await createModifier(
              ModifierInputSchema.parse(await request.json()),
            ),
            201,
          )
        } catch (e) {
          return apiError(e)
        }
      },
      PUT: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          return ok(
            await updateModifier(
              UpdateModifierSchema.parse(await request.json()),
            ),
          )
        } catch (e) {
          return apiError(e)
        }
      },
      DELETE: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          const id = new URL(request.url).searchParams.get('id') ?? undefined
          const parsed = IdQuerySchema.safeParse({ id })
          if (!parsed.success) {
            return gagal('BAD_REQUEST', 'Query ?id= wajib & harus cuid', 400)
          }
          return ok(await hapusModifier(parsed.data))
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})
