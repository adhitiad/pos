import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, gagal, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import {
  modifierGrupData,
  createModifierGrup,
  hapusModifierGrup,
  updateModifierGrup,
} from '#/server/modifier'
import {
  ModifierGrupInputSchema,
  UpdateModifierGrupSchema,
} from '#/validations/modifier'

export const Route = createFileRoute('/api/v1/modifier-grup')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          return ok(await modifierGrupData())
        } catch (e) {
          return apiError(e)
        }
      },
      POST: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          return ok(
            await createModifierGrup(
              ModifierGrupInputSchema.parse(await request.json()),
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
            await updateModifierGrup(
              UpdateModifierGrupSchema.parse(await request.json()),
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
          const id = new URL(request.url).searchParams.get('id')
          if (!id) return gagal('BAD_REQUEST', 'Query ?id= wajib', 400)
          return ok(await hapusModifierGrup({ id }))
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})
