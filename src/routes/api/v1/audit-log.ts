import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { auditLogData } from '#/server/auditLog'
import { AuditLogQuerySchema } from '#/validations/audit'

export const Route = createFileRoute('/api/v1/audit-log')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna
          const q = new URL(request.url).searchParams
          const data = AuditLogQuerySchema.parse({
            entitas: q.get('entitas') ?? undefined,
            aksi: q.get('aksi') ?? undefined,
            aktorId: q.get('aktorId') ?? undefined,
            dari: q.get('dari') ?? undefined,
            sampai: q.get('sampai') ?? undefined,
            take: q.get('take') ?? undefined,
            skip: q.get('skip') ?? undefined,
          })
          return ok(await auditLogData(data))
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})
