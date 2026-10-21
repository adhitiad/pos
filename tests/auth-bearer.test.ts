import { afterAll, describe, expect, it } from 'vitest'

import { prisma } from '#/db'
import { auth } from '#/lib/auth'
import { profilSaya } from '#/server/saya'

const email = `mobile-uji-${Date.now()}@example.test`
const userId = `usr-bearer-${Date.now()}`
const memberId: string[] = []

afterAll(async () => {
  await prisma.session.deleteMany({ where: { userId } })
  await prisma.member.deleteMany({ where: { email } })
  await prisma.user.deleteMany({ where: { id: userId } })
  await prisma.$disconnect()
})

// Klien native (Expo/React Native) tak punya cookie jar → sesi dikirim lewat
// header `Authorization: Bearer <token>` (dari POST /api/v1/auth-social).
describe('auth — bearer token untuk klien native', () => {
  it('getSession membaca sesi dari header Authorization', async () => {
    await prisma.user.create({
      data: {
        id: userId,
        name: 'Bearer Uji',
        email,
        emailVerified: true,
        role: 'OWNER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    const token = `token-bearer-${Date.now()}`
    await prisma.session.create({
      data: {
        id: `ses-bearer-${Date.now()}`,
        userId,
        token,
        expiresAt: new Date(Date.now() + 3600_000),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })

    const sesi = await auth.api.getSession({
      headers: new Headers({ authorization: `Bearer ${token}` }),
    })
    expect(sesi?.user.id).toBe(userId)
  })

  it('token salah tak menghasilkan sesi', async () => {
    const sesi = await auth.api.getSession({
      headers: new Headers({ authorization: 'Bearer token-ngawur' }),
    })
    expect(sesi).toBeNull()
  })
})

describe('profilSaya — aplikasi member', () => {
  it('mengembalikan profil member berdasarkan email sesi', async () => {
    const member = await prisma.member.create({
      data: { nama: 'Member Uji', email, telepon: '0812345' },
    })
    memberId.push(member.id)

    const hasil = await profilSaya({ email })
    expect(hasil.member?.id).toBe(member.id)
    expect(hasil.member?.poin).toBe(0)
    expect(hasil.member?.tier).toBe('BRONZE')
    expect(hasil.transaksi).toEqual([])
  })

  it('email tanpa member → member null (tak bocor error)', async () => {
    const hasil = await profilSaya({ email: 'tidak-ada@example.test' })
    expect(hasil.member).toBeNull()
  })
})
