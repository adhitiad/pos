import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, gagal, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import {
  memberData,
  createMember,
  hapusMember,
  updateMember,
} from '#/server/member'
import { MemberInputSchema, UpdateMemberSchema } from '#/validations/member'
import { PaginationSchema } from '#/validations/pagination'

export const Route = createFileRoute('/api/v1/member/')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          const q = new URL(request.url).searchParams
          const p = PaginationSchema.parse({
            take: q.get('take'),
            skip: q.get('skip'),
          })
          return ok(await memberData({ take: p.take, skip: p.skip }))
        } catch (e) {
          return apiError(e)
        }
      },
      POST: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          return ok(
            await createMember(MemberInputSchema.parse(await request.json())),
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
            await updateMember(UpdateMemberSchema.parse(await request.json())),
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
          return ok(await hapusMember({ id }))
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})
