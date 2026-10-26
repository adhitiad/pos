import { getRequestHeaders } from '@tanstack/react-start/server'

import { prisma } from '#/db'
import { auth } from '#/lib/auth'
import { AKSES } from './peran.js'
import type { Role } from '#/generated/prisma/enums.js'
import type { Pengguna } from '#/types/auth'

// Cache sesi per request: loader + beberapa server function dalam satu
// navigasi memakai objek Headers yang sama, jadi sesi + role hanya dibaca
// sekali dari Better Auth/DB. WeakMap tidak menahan request lama di memori.
const cacheSesi = new WeakMap<Headers, Promise<Pengguna | null>>()

async function muatPengguna(headers: Headers): Promise<Pengguna | null> {
  const session = await auth.api.getSession({ headers })
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

// Sesi Google saat ini, atau null bila belum login
export function getPengguna(): Promise<Pengguna | null> {
  const headers = getRequestHeaders()
  const tersimpan = cacheSesi.get(headers)
  if (tersimpan) return tersimpan
  const hasil = muatPengguna(headers)
  cacheSesi.set(headers, hasil)
  return hasil
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
// Hanya kasir (bukan owner) — dipakai untuk pengajuan pengeluaran yang
// menunggu persetujuan owner.
export const requireHanyaKasir = () => requirePeran(AKSES.kasir)
export const requireSemua = () => requirePeran(AKSES.semua)
