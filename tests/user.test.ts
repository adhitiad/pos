import { afterAll, describe, expect, it } from 'vitest'

import { prisma } from '#/db'
import { sinkronPeranUser } from '#/lib/auth'
import { updateUserRole, userData } from '#/server/user'

const dibuat: string[] = []

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
