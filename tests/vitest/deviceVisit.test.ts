import { afterAll, describe, expect, it } from 'vitest'

import { prisma } from '#/db'
import { daftarDeviceVisit, recordDeviceVisit } from '#/server/deviceVisit'

const userIds: string[] = []
const deviceIds: string[] = []

afterAll(async () => {
  await prisma.deviceVisit.deleteMany({
    where: { deviceId: { in: deviceIds } },
  })
  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
})

describe('deviceVisit', () => {
  it('mencatat kunjungan anonim sebagai non-member', async () => {
    const deviceId = `dev-${Date.now()}`
    deviceIds.push(deviceId)

    const hasil = await recordDeviceVisit({
      deviceId,
      os: 'android',
      klasifikasi: 'hp',
    })
    expect(hasil?.userType).toBe('non-member')

    const daftar = await daftarDeviceVisit({ deviceId })
    expect(daftar.some((v) => v.deviceId === deviceId)).toBe(true)
  })

  it('mencatat kunjungan member dengan userType member', async () => {
    const unik = Date.now()
    const user = await prisma.user.create({
      data: {
        id: `test-dv-${unik}`,
        name: 'Member Uji',
        email: `dv-${unik}@pos.test`,
        emailVerified: false,
        role: 'MEMBER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    userIds.push(user.id)
    const deviceId = `dev-m-${unik}`
    deviceIds.push(deviceId)

    const hasil = await recordDeviceVisit({
      deviceId,
      os: 'ios',
      klasifikasi: 'hp',
      userId: user.id,
    })
    expect(hasil?.userType).toBe('member')
  })

  it('mengecualikan owner dari analytics', async () => {
    const unik = Date.now()
    const owner = await prisma.user.create({
      data: {
        id: `test-dv-owner-${unik}`,
        name: 'Owner Uji',
        email: `owner-${unik}@pos.test`,
        emailVerified: false,
        role: 'OWNER',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    userIds.push(owner.id)

    const hasil = await recordDeviceVisit({
      deviceId: `dev-o-${unik}`,
      os: 'windows',
      klasifikasi: 'pc',
      userId: owner.id,
    })
    expect(hasil).toBeNull()
  })

  it('mengabaikan IP/DNS dari klien dan memakai IP koneksi server', async () => {
    const deviceId = `dev-ip-${Date.now()}`
    deviceIds.push(deviceId)

    const hasil = await recordDeviceVisit({
      deviceId,
      os: 'android',
      klasifikasi: 'hp',
      // Field lama dari body klien tidak boleh masuk database.
      ipv4: '1.2.3.4',
      ipv6: '2001:db8::1',
      dns: 'evil.example',
      ipAddress: '203.0.113.9',
    } as Parameters<typeof recordDeviceVisit>[0])

    expect(hasil?.ipv4).toBe('203.0.113.9')
    expect(hasil?.ipv6).toBeNull()
    expect(hasil?.dns).toBeNull()
  })
})
