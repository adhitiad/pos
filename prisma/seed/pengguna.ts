import { createHash } from 'node:crypto'

import { prisma } from './dasar.js'

// Akun demo dibuat dari daftar email di `.env.local` agar login Google
// langsung memakai peran yang benar. `User` tidak dihapus oleh seed, jadi
// fungsi ini harus idempoten: akun yang sudah ada tidak diduplikasi.
export interface PenggunaSeed {
  owner: { id: string; email: string }[]
  kasir: { id: string; email: string }[]
  member: { id: string; email: string }
}

const pecahEmail = (nilai: string | undefined) =>
  (nilai ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)

const idDariEmail = (email: string) =>
  `seed-${createHash('sha1').update(email).digest('hex').slice(0, 20)}`

const namaDariEmail = (email: string) => {
  const lokal = email.split('@')[0] ?? 'Pengguna'
  return lokal
    .split(/[._-]+/)
    .filter(Boolean)
    .map((bagian) => bagian.charAt(0).toUpperCase() + bagian.slice(1))
    .join(' ')
}

async function pastikanPengguna(input: {
  email: string
  nama: string
  role: 'OWNER' | 'KASIR' | 'MEMBER'
}) {
  const ada = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, email: true, role: true, roleManual: true },
  })
  if (ada) {
    // Hormati perubahan manual dari halaman /user. Tanpa roleManual, seed
    // boleh memperbaiki akun yang masih MEMBER agar bisa dipakai tes.
    const perluNaik =
      !ada.roleManual &&
      ada.role !== input.role &&
      !(ada.role === 'OWNER' && input.role !== 'OWNER')
    if (perluNaik) {
      await prisma.user.update({
        where: { id: ada.id },
        data: { role: input.role, updatedAt: new Date() },
      })
    }
    return { id: ada.id, email: ada.email }
  }

  const sekarang = new Date()
  const dibuat = await prisma.user.create({
    data: {
      id: idDariEmail(input.email),
      name: input.nama,
      email: input.email,
      emailVerified: true,
      role: input.role,
      createdAt: sekarang,
      updatedAt: sekarang,
    },
    select: { id: true, email: true },
  })
  return dibuat
}

export async function seedPengguna(): Promise<PenggunaSeed> {
  const ownerEmail = pecahEmail(process.env.OWNER_EMAILS)
  const kasirEmail = pecahEmail(process.env.KASIR_EMAILS)
  const owner = ownerEmail.length > 0 ? ownerEmail : ['owner@pos.local']
  const semuaKasir = (
    kasirEmail.length > 0 ? kasirEmail : ['kasir@pos.local']
  ).filter((email) => !owner.includes(email))
  const memberEmail = 'budi@example.com'

  const ownerRows = []
  for (const email of owner) {
    ownerRows.push(
      await pastikanPengguna({
        email,
        nama: email === 'owner@pos.local' ? 'Owner Demo' : namaDariEmail(email),
        role: 'OWNER',
      }),
    )
  }

  const kasirRows = []
  for (const email of semuaKasir) {
    kasirRows.push(
      await pastikanPengguna({
        email,
        nama: namaDariEmail(email),
        role: 'KASIR',
      }),
    )
  }

  const member = await pastikanPengguna({
    email: memberEmail,
    nama: 'Budi Santoso',
    role: 'MEMBER',
  })

  return { owner: ownerRows, kasir: kasirRows, member }
}
