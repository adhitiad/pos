import { createHmac } from 'node:crypto'

import { expect, test } from '@playwright/test'

import { prisma } from '../../src/db.js'

function cookieSesi(token: string): string {
  const secret = process.env.BETTER_AUTH_SECRET ?? ''
  const signature = createHmac('sha256', secret).update(token).digest('base64')
  return `${token}.${signature}`
}

async function buatSesi(role: 'OWNER' | 'KASIR' | 'MEMBER', label: string) {
  const unik = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const user = await prisma.user.create({
    data: {
      id: `usr-e2e-ot-${label}-${unik}`,
      name: `E2E Otorisasi ${label}`,
      email: `e2e-ot-${label}-${unik}@pos.test`,
      emailVerified: true,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
  const token = `token-e2e-ot-${label}-${unik}`
  await prisma.session.create({
    data: {
      id: `ses-e2e-ot-${label}-${unik}`,
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 600_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
  return { userId: user.id, token }
}

const sesi: Array<{ userId: string; token: string }> = []

test.describe.configure({ mode: 'serial' })

test.describe('otorisasi printer', () => {
  let owner: Awaited<ReturnType<typeof buatSesi>>
  let kasir: Awaited<ReturnType<typeof buatSesi>>
  let kasirLain: Awaited<ReturnType<typeof buatSesi>>
  let member: Awaited<ReturnType<typeof buatSesi>>

  test.beforeAll(async () => {
    owner = await buatSesi('OWNER', 'owner')
    kasir = await buatSesi('KASIR', 'kasir')
    kasirLain = await buatSesi('KASIR', 'kasir-lain')
    member = await buatSesi('MEMBER', 'member')
    sesi.push(owner, kasir, kasirLain, member)
  })

  test.afterAll(async () => {
    const ids = sesi.map((s) => s.userId)
    await prisma.auditLog.deleteMany({ where: { userId: { in: ids } } })
    await prisma.printer.deleteMany({ where: { userId: { in: ids } } })
    await prisma.rateLimit.deleteMany({
      where: { OR: ids.map((id) => ({ key: { contains: id } })) },
    })
    await prisma.session.deleteMany({ where: { userId: { in: ids } } })
    await prisma.user.deleteMany({ where: { id: { in: ids } } })
  })

  test('anonymous ditolak 401', async ({ request }) => {
    expect((await request.get('/api/v1/printer/perangkat')).status()).toBe(401)
    expect(
      (
        await request.post('/api/v1/printer', {
          data: { nama: 'Tanpa Sesi', tipe: 'ESC_POS', koneksi: 'USB' },
        })
      ).status(),
    ).toBe(401)
  })

  test('KASIR hanya boleh perangkat miliknya, master 403', async ({
    context,
    page,
  }) => {
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: cookieSesi(kasir.token),
        domain: 'localhost',
        path: '/',
      },
    ])

    const perangkat = `ot-kasir-${Date.now()}`
    const daftar = await page.request.post('/api/v1/printer/perangkat', {
      data: {
        nama: 'Perangkat Kasir',
        perangkat,
        koneksi: 'BLUETOOTH',
        userId: owner.userId,
      },
    })
    expect(daftar.status()).toBe(201)
    const isi = (await daftar.json()) as {
      data: { id: string; userId: string }
    }
    expect(isi.data.userId).toBe(kasir.userId)

    expect((await page.request.get('/api/v1/printer/perangkat')).status()).toBe(
      200,
    )

    const jadiDefault = await page.request.patch(
      `/api/v1/printer/perangkat/${encodeURIComponent(isi.data.id)}/default`,
    )
    expect(jadiDefault.status()).toBe(200)
    const bodyDefault = (await jadiDefault.json()) as {
      data: { defaultPengguna: boolean }
    }
    expect(bodyDefault.data.defaultPengguna).toBe(true)

    const defaultAktif = await page.request.get('/api/v1/printer/default')
    expect(defaultAktif.status()).toBe(200)
    const bodyDefaultAktif = (await defaultAktif.json()) as {
      data: { id: string }
    }
    expect(bodyDefaultAktif.data.id).toBe(isi.data.id)

    expect((await page.request.get('/api/v1/printer')).status()).toBe(403)
    expect(
      (
        await page.request.post('/api/v1/printer', {
          data: { nama: 'Master Kasir', tipe: 'ESC_POS', koneksi: 'USB' },
        })
      ).status(),
    ).toBe(403)
    expect(
      (
        await page.request.put('/api/v1/printer', {
          data: {
            id: isi.data.id,
            nama: 'Ubah',
            tipe: 'ESC_POS',
            koneksi: 'USB',
            default: false,
            aktif: true,
          },
        })
      ).status(),
    ).toBe(403)
    expect(
      (
        await page.request.delete(
          `/api/v1/printer?id=${encodeURIComponent(isi.data.id)}`,
        )
      ).status(),
    ).toBe(403)

    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: cookieSesi(kasirLain.token),
        domain: 'localhost',
        path: '/',
      },
    ])
    const daftarLain = await page.request.get('/api/v1/printer/perangkat')
    expect(daftarLain.status()).toBe(200)
    const bodyLain = (await daftarLain.json()) as {
      data: Array<{ id: string }>
    }
    expect(bodyLain.data.some((p) => p.id === isi.data.id)).toBe(false)

    const defaultLain = await page.request.patch(
      `/api/v1/printer/perangkat/${encodeURIComponent(isi.data.id)}/default`,
    )
    expect(defaultLain.status()).toBe(422)

    const hapusLain = await page.request.delete(
      `/api/v1/printer/perangkat/${encodeURIComponent(isi.data.id)}`,
    )
    expect(hapusLain.status()).toBe(422)

    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: cookieSesi(kasir.token),
        domain: 'localhost',
        path: '/',
      },
    ])
    const hapus = await page.request.delete(
      `/api/v1/printer/perangkat/${encodeURIComponent(isi.data.id)}`,
    )
    expect(hapus.status()).toBe(200)
    const hasilHapus = (await hapus.json()) as {
      data: { id: string; dihapus: boolean }
    }
    expect(hasilHapus.data).toEqual({ id: isi.data.id, dihapus: false })

    const setelahHapus = await page.request.get('/api/v1/printer/perangkat')
    const bodySetelah = (await setelahHapus.json()) as {
      data: Array<{ id: string }>
    }
    expect(bodySetelah.data.some((p) => p.id === isi.data.id)).toBe(false)
  })

  test('MEMBER ditolak 403 di semua endpoint printer', async ({
    context,
    page,
  }) => {
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: cookieSesi(member.token),
        domain: 'localhost',
        path: '/',
      },
    ])
    expect((await page.request.get('/api/v1/printer/perangkat')).status()).toBe(
      403,
    )
    expect(
      (
        await page.request.post('/api/v1/printer/perangkat', {
          data: {
            nama: 'Perangkat Member',
            perangkat: `ot-member-${Date.now()}`,
            koneksi: 'WIFI',
          },
        })
      ).status(),
    ).toBe(403)
    expect((await page.request.get('/api/v1/printer')).status()).toBe(403)
    expect((await page.request.get('/api/v1/printer/default')).status()).toBe(
      403,
    )
  })

  test('OWNER boleh CRUD master', async ({ context, page }) => {
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: cookieSesi(owner.token),
        domain: 'localhost',
        path: '/',
      },
    ])
    const nama = `Master Otorisasi ${Date.now()}`
    const dibuat = await page.request.post('/api/v1/printer', {
      data: {
        nama,
        tipe: 'RAW',
        koneksi: 'USB',
        default: false,
        aktif: true,
      },
    })
    expect(dibuat.status()).toBe(201)
    const { data } = (await dibuat.json()) as { data: { id: string } }

    const daftar = await page.request.get('/api/v1/printer')
    expect(daftar.status()).toBe(200)
    const body = (await daftar.json()) as {
      data: Array<{ id: string; nama: string }>
    }
    expect(body.data.some((p) => p.id === data.id)).toBe(true)

    const ubah = await page.request.put('/api/v1/printer', {
      data: {
        id: data.id,
        nama: `${nama} Ubah`,
        tipe: 'RAW',
        koneksi: 'USB',
        default: false,
        aktif: true,
      },
    })
    expect(ubah.status()).toBe(200)

    const hapus = await page.request.delete(
      `/api/v1/printer?id=${encodeURIComponent(data.id)}`,
    )
    expect(hapus.status()).toBe(200)
  })
})
