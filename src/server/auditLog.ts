import { prisma } from '#/db'
import { normalisasiJson } from './audit.js'
import { AuditLogQuerySchema } from '#/validations/audit'
import type { AuditLogQueryInput } from '#/validations/audit'
import type { AuditLogHasil, AuditLogRow, JsonNilai } from '#/types/audit'

// Query audit log dengan filter (entitas, aksi, aktor, rentang tanggal) +
// paginasi. Dipakai halaman /audit-log dan REST GET /api/v1/audit-log.
export async function auditLogData(
  input: AuditLogQueryInput = {},
): Promise<AuditLogHasil> {
  const data = AuditLogQuerySchema.parse(input)

  const where = {
    ...(data.entitas && { entity: data.entitas }),
    ...(data.aksi && { action: data.aksi }),
    ...(data.aktorId && { userId: data.aktorId }),
    ...(data.dari && { timestamp: { gte: new Date(`${data.dari}T00:00:00`) } }),
    ...(data.sampai && {
      timestamp: { lte: new Date(`${data.sampai}T23:59:59.999`) },
    }),
  }

  const take = data.take ?? 50
  const skip = data.skip ?? 0

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take,
      skip,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        userId: true,
        before: true,
        after: true,
        timestamp: true,
        user: { select: { name: true } },
      },
    }),
  ])

  const rows: AuditLogRow[] = logs.map((l) => ({
    id: l.id,
    aksi: l.action,
    entitas: l.entity,
    entitasId: l.entityId,
    aktorId: l.userId,
    aktorNama: l.user?.name ?? null,
    sebelum: normalisasiJson(l.before) as JsonNilai,
    sesudah: normalisasiJson(l.after) as JsonNilai,
    waktu: l.timestamp.toISOString(),
  }))

  return { rows, total }
}
