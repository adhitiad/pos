import { getRequestHeaders } from '@tanstack/react-start/server'

import { prisma } from '#/db'
import { auth } from '#/lib/auth'
import { AKSES } from './peran.js'
import type { Role } from '#/generated/prisma/enums.js'
import type { Pengguna } from '#/types/auth'

// Sesi Google saat ini, atau null bila belum login
export async function getPengguna(): Promise<Pengguna | null> {
  const session = await auth.api.getSession({ headers: getRequestHeaders() })
  if (!session?.user) return null
  // Sumber kebenaran role: baca langsung dari DB (role bisa diubah setelah pembuatan akun)
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })
  const role: Role = dbUser?.role ?? 'MEMBER'
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
    role,
  }
}

// Satu peran tertentu
async function requirePeran(daftar: ReadonlyArray<Role>): Promise<Pengguna> {
  const pengguna = await getPengguna()
  if (!pengguna) throw new Error('UNAUTHORIZED')
  if (!daftar.includes(pengguna.role)) throw new Error('FORBIDDEN')
  return pengguna
}

export const requireKasir = () => requirePeran(AKSES.operasional)
export const requireOwner = () => requirePeran(AKSES.manajerial)
export const requireSemua = () => requirePeran(AKSES.semua)
