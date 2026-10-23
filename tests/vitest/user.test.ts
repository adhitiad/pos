import { afterAll, describe, expect, it } from 'vitest'

import { prisma } from '#/db'
import { sinkronPeranUser } from '#/lib/auth'
import { revokeUserSessions, updateUserRole, userData } from '#/server/user'

const dibuat: string[] = []

async function buatSesi(userId: string) {
  const unik = `${Date.now()}-${crypto.randomUUID()}`
  return prisma.session.create({
    data: {
      id: `sesi-${unik}`,
      token: `token-${unik}`,
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
}

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: dibuat } } })
})

describe('user', () => {
  it('userData menampilkan user yang dibuat', async () => {
    const unik = Date.now()
    const user = await prisma.user.create({
      data: {
        id: `test-user-${unik}`,
        name: 'User Uji',
        email: `user-${unik}@pos.test`,
        emailVerified: false,
        role: 'MEMBER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    dibuat.push(user.id)

    const daftar = await userData()
    expect(daftar.some((u) => u.id === user.id)).toBe(true)
  })

  it('updateUserRole mengubah peran', async () => {
    const unik = Date.now()
    const user = await prisma.user.create({
      data: {
        id: `test-role-${unik}`,
        name: 'User Peran',
        email: `role-${unik}@pos.test`,
        emailVerified: false,
        role: 'MEMBER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    dibuat.push(user.id)

    const hasil = await updateUserRole({ id: user.id, role: 'KASIR' })
    expect(hasil.role).toBe('KASIR')

    const tersimpan = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    })
    expect(tersimpan.role).toBe('KASIR')
  })

  it('updateUserRole user tidak ada → GalatDomain', async () => {
    await expect(
      updateUserRole({ id: 'tidak-ada', role: 'OWNER' }),
    ).rejects.toThrow('tidak ditemukan')
  })

  it('peran yang diubah manual ditandai manual (env tak menimpanya)', async () => {
    const unik = Date.now()
    const user = await prisma.user.create({
      data: {
        id: `test-manual-${unik}`,
        name: 'User Manual',
        email: `manual-${unik}@pos.test`,
        emailVerified: false,
        role: 'MEMBER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    dibuat.push(user.id)

    await updateUserRole({ id: user.id, role: 'KASIR' })
    const tersimpan = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    })
    expect(tersimpan.role).toBe('KASIR')
    expect(tersimpan.roleManual).toBe(true)
  })

  it('updateUserRole mencabut semua sesi saat peran berubah', async () => {
    const unik = Date.now()
    const user = await prisma.user.create({
      data: {
        id: `test-sesi-role-${unik}`,
        name: 'User Sesi Role',
        email: `sesi-role-${unik}@pos.test`,
        emailVerified: false,
        role: 'MEMBER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    dibuat.push(user.id)
    await buatSesi(user.id)
    await buatSesi(user.id)

    const hasil = await updateUserRole({ id: user.id, role: 'KASIR' })
    expect(hasil.berubah).toBe(true)
    expect(hasil.sesiDicabut).toBe(2)
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0)
  })

  it('menyimpan peran yang sama tidak mencabut sesi', async () => {
    const unik = Date.now()
    const user = await prisma.user.create({
      data: {
        id: `test-sesi-sama-${unik}`,
        name: 'User Sesi Sama',
        email: `sesi-sama-${unik}@pos.test`,
        emailVerified: false,
        role: 'KASIR',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    dibuat.push(user.id)
    await buatSesi(user.id)

    const hasil = await updateUserRole({ id: user.id, role: 'KASIR' })
    expect(hasil.berubah).toBe(false)
    expect(hasil.sesiDicabut).toBe(0)
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(1)
  })

  it('revokeUserSessions hanya mencabut sesi user target', async () => {
    const unik = Date.now()
    const target = await prisma.user.create({
      data: {
        id: `test-revoke-${unik}`,
        name: 'User Revoke',
        email: `revoke-${unik}@pos.test`,
        emailVerified: false,
        role: 'KASIR',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    const lain = await prisma.user.create({
      data: {
        id: `test-revoke-lain-${unik}`,
        name: 'User Revoke Lain',
        email: `revoke-lain-${unik}@pos.test`,
        emailVerified: false,
        role: 'KASIR',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    dibuat.push(target.id, lain.id)
    await buatSesi(target.id)
    await buatSesi(target.id)
    await buatSesi(lain.id)

    const hasil = await revokeUserSessions({ id: target.id })
    expect(hasil.dicabut).toBe(2)
    expect(await prisma.session.count({ where: { userId: target.id } })).toBe(0)
    expect(await prisma.session.count({ where: { userId: lain.id } })).toBe(1)
  })

  it('revokeUserSessions user tidak ada → GalatDomain', async () => {
    await expect(revokeUserSessions({ id: 'tidak-ada' })).rejects.toThrow(
      'tidak ditemukan',
    )
  })

  it('sinkronisasi env mencabut sesi lama, bukan sesi yang baru dibuat', async () => {
    const unik = Date.now()
    const email = `env-sesi-${unik}@pos.test`
    const user = await prisma.user.create({
      data: {
        id: `test-env-sesi-${unik}`,
        name: 'User Env Sesi',
        email,
        emailVerified: false,
        role: 'MEMBER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    dibuat.push(user.id)
    await buatSesi(user.id)
    const sesiBaru = await buatSesi(user.id)

    await sinkronPeranUser(user.id, { owner: email, kasir: '' }, sesiBaru.id)
    const naik = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    })
    expect(naik.role).toBe('OWNER')
    const sisa = await prisma.session.findMany({
      where: { userId: user.id },
      select: { id: true },
    })
    expect(sisa.map((s) => s.id)).toEqual([sesiBaru.id])
  })

  it('sinkronisasi env menaikkan peran non-manual', async () => {
    const unik = Date.now()
    const email = `env-${unik}@pos.test`
    const user = await prisma.user.create({
      data: {
        id: `test-env-${unik}`,
        name: 'User Env',
        email,
        emailVerified: false,
        role: 'MEMBER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    dibuat.push(user.id)

    await sinkronPeranUser(user.id, { owner: email, kasir: '' })
    const naik = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    })
    expect(naik.role).toBe('OWNER')
    expect(naik.roleManual).toBe(false)
  })

  it('sinkronisasi env tidak menimpa peran manual', async () => {
    const unik = Date.now()
    const email = `manual-env-${unik}@pos.test`
    const user = await prisma.user.create({
      data: {
        id: `test-manual-env-${unik}`,
        name: 'User Manual Env',
        email,
        emailVerified: false,
        role: 'KASIR',
        roleManual: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    dibuat.push(user.id)

    await sinkronPeranUser(user.id, { owner: email, kasir: '' })
    const tetap = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    })
    expect(tetap.role).toBe('KASIR')
  })

  it('updateUserRole menolak ubah peran akun sendiri (OW-01)', async () => {
    const unik = Date.now()
    const user = await prisma.user.create({
      data: {
        id: `test-self-${unik}`,
        name: 'User Self',
        email: `self-${unik}@pos.test`,
        emailVerified: false,
        role: 'OWNER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    dibuat.push(user.id)

    await expect(
      updateUserRole({ id: user.id, role: 'KASIR' }, user.id),
    ).rejects.toThrow(/akun sendiri/)
    const tersimpan = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    })
    expect(tersimpan.role).toBe('OWNER')
  })

  it('updateUserRole menolak menurunkan OWNER terakhir (OW-01)', async () => {
    const ownerLain = await prisma.user.findMany({
      where: { role: 'OWNER' },
      select: { id: true },
    })
    const unik = Date.now()
    const user = await prisma.user.create({
      data: {
        id: `test-lastowner-${unik}`,
        name: 'Owner Terakhir',
        email: `lastowner-${unik}@pos.test`,
        emailVerified: false,
        role: 'OWNER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    dibuat.push(user.id)
    const idLain = ownerLain.map((o) => o.id)
    try {
      if (idLain.length > 0) {
        await prisma.user.updateMany({
          where: { id: { in: idLain } },
          data: { role: 'KASIR' },
        })
      }
      await expect(
        updateUserRole({ id: user.id, role: 'MEMBER' }, 'aktor-lain'),
      ).rejects.toThrow(/minimal satu OWNER/)
    } finally {
      if (idLain.length > 0) {
        await prisma.user.updateMany({
          where: { id: { in: idLain } },
          data: { role: 'OWNER' },
        })
      }
    }
  })
})
