import { afterAll, describe, expect, it } from 'vitest'

import { prisma } from '#/db'
import { daftarDeviceVisit, recordDeviceVisit } from '#/server/deviceVisit'
import { bacaTokenDevice, buatTokenDevice } from '#/server/deviceToken'

const userIds: string[] = []
const deviceIds: string[] = []

afterAll(async () => {
  await prisma.deviceVisit.deleteMany({
    where: { deviceId: { in: deviceIds } },
  })
  await prisma.user.deleteMany({ where: { id: { in: userIds } } })
})

function tokenUntuk(ipAddress: string, userAgent: string) {
  const { token } = buatTokenDevice({ ipAddress, userAgent })
  const { deviceId } = bacaTokenDevice(token, userAgent)
  deviceIds.push(deviceId)
  return { token, deviceId, userAgent, ipAddress }
}

describe('deviceVisit', () => {
  it('mencatat kunjungan anonim sebagai non-member dari token server', async () => {
    const data = tokenUntuk(
      '198.51.100.1',
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile TestAnonim',
    )

    const hasil = await recordDeviceVisit(data)
    expect(hasil?.userType).toBe('non-member')
    expect(hasil?.deviceId).toBe(data.deviceId)
    expect(hasil?.os).toBe('android')
    expect(hasil?.klasifikasi).toBe('hp')

    const daftar = await daftarDeviceVisit({ deviceId: data.deviceId })
    expect(daftar.some((v) => v.deviceId === data.deviceId)).toBe(true)
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
    const data = tokenUntuk(
      '198.51.100.2',
      `Mozilla/5.0 (iPhone) TestMember${unik}`,
    )

    const hasil = await recordDeviceVisit({ ...data, userId: user.id })
    expect(hasil?.userType).toBe('member')
    expect(hasil?.userId).toBe(user.id)
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

    const data = tokenUntuk(
      '198.51.100.3',
      `Mozilla/5.0 (Windows NT 10.0) TestOwner${unik}`,
    )
    const hasil = await recordDeviceVisit({ ...data, userId: owner.id })
    expect(hasil).toBeNull()
  })

  it('mengabaikan IP/DNS dari klien dan memakai IP koneksi server', async () => {
    const data = tokenUntuk(
      '203.0.113.9',
      'Mozilla/5.0 (Linux; Android 14) TestIp',
    )

    const hasil = await recordDeviceVisit(data)

    expect(hasil?.ipv4).toBe('203.0.113.9')
    expect(hasil?.ipv6).toBeNull()
    expect(hasil?.dns).toBeNull()
  })

  it('upsert: kunjungan berulang tidak menambah baris perangkat', async () => {
    const data = tokenUntuk(
      '203.0.113.10',
      'Mozilla/5.0 (Macintosh) TestUpsert',
    )

    const pertama = await recordDeviceVisit(data)
    const kedua = await recordDeviceVisit(data)

    expect(kedua?.id).toBe(pertama?.id)
    expect(kedua?.jumlahKunjungan).toBe(2)
    const jumlah = await prisma.deviceVisit.count({
      where: { deviceId: data.deviceId },
    })
    expect(jumlah).toBe(1)
  })

  it('menolak token palsu dan token yang dipakai beda User-Agent', async () => {
    const data = tokenUntuk(
      '203.0.113.11',
      'Mozilla/5.0 (X11; Linux) TestToken',
    )

    await expect(
      recordDeviceVisit({
        token: 'palsu.palsu',
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      }),
    ).rejects.toThrow('Token perangkat tidak valid')

    await expect(
      recordDeviceVisit({
        token: data.token,
        ipAddress: data.ipAddress,
        userAgent: 'User-Agent lain',
      }),
    ).rejects.toThrow('Token perangkat tidak cocok')
  })
})
