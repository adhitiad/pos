import { UserRoleSchema } from '#/validations/user'
import type { UserRoleInput } from '#/validations/user'

import { prisma } from '#/db'
import { logger } from '#/lib/logger'
import { catatAudit } from './audit.js'
import { GalatDomain } from './galat.js'

// Sensor id untuk log audit (hindari menulis id utuh/PII ke log).
function sensor(id: string) {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id
}

export async function userData() {
  const users = await prisma.user.findMany({
    orderBy: { email: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      roleManual: true,
    },
  })
  return users
}

// Ubah peran user. `aktorId` = id pemanggil (dari requireOwner) agar owner tidak
// bisa mengubah perannya sendiri maupun menurunkan OWNER terakhir (OW-01).
export async function updateUserRole(input: UserRoleInput, aktorId?: string) {
  const data = UserRoleSchema.parse(input)
  const target = await prisma.user.findUnique({
    where: { id: data.id },
    select: { id: true, email: true, role: true },
  })
  if (!target) throw new GalatDomain('User tidak ditemukan')
  if (aktorId && aktorId === target.id) {
    throw new GalatDomain('Tidak dapat mengubah peran akun sendiri')
  }
  if (target.role === 'OWNER' && data.role !== 'OWNER') {
    const sisaOwner = await prisma.user.count({
      where: { role: 'OWNER', id: { not: target.id } },
    })
    if (sisaOwner === 0) {
      throw new GalatDomain('Harus tersisa minimal satu OWNER')
    }
  }
  // Peran manual = pilihan owner di /user; otomatis env tak boleh menimpanya
  // lagi. Ditandai walau perannya sama (owner tetap memilih peran itu).
  const berubah = target.role !== data.role
  await prisma.user.update({
    where: { id: data.id },
    data: { role: data.role, roleManual: true },
  })
  if (berubah) {
    // Jejak permanen di tabel AuditLog (bukan hanya log server): siapa mengubah
    // peran siapa, dari role apa ke role apa. Email sengaja tak disimpan (PII).
    await catatAudit({
      aktorId,
      aksi: 'user.role.ubah',
      entitas: 'User',
      entitasId: target.id,
      sebelum: { role: target.role },
      sesudah: { role: data.role },
    })
    if (process.env.NODE_ENV !== 'development') {
      logger.info({
        kind: 'audit',
        event: 'user.role.changed',
        aktor: aktorId ? sensor(aktorId) : '-',
        target: sensor(target.id),
        dari: target.role,
        ke: data.role,
      })
    }
  }
  return { id: target.id, email: target.email, role: data.role }
}
