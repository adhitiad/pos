import { createHmac } from 'node:crypto'

import { expect, test } from '@playwright/test'

import { prisma } from '../../src/db.js'

// Halaman owner butuh sesi. Better Auth menandatangani cookie sesi dengan
// HMAC-SHA256(secret, token) → nilai cookie = "<token>.<base64 signature>".
// Dengan ini e2e bisa menguji halaman yang tadinya tak pernah tersentuh
// (semua halaman di balik login).
const EMAIL_OWNER = 'e2e-owner@pos.test'
const EMAIL_KASIR = 'e2e-kasir@pos.test'

function cookieSesi(token: string): string {
  const secret = process.env.BETTER_AUTH_SECRET ?? ''
  const signature = createHmac('sha256', secret).update(token).digest('base64')
  // Nilai cookie saja (tanpa nama) — Playwright menerima <nama, nilai> terpisah.
  return `${token}.${signature}`
}

async function buatSesiOwner() {
  const unik = Date.now()
  const user = await prisma.user.upsert({
    where: { email: EMAIL_OWNER },
    update: {},
    create: {
      id: `usr-e2e-${unik}`,
      name: 'E2E Owner',
      email: EMAIL_OWNER,
      emailVerified: true,
      role: 'OWNER',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
  const token = `token-e2e-${unik}`
  await prisma.session.create({
    data: {
      id: `ses-e2e-${unik}`,
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 600_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
  return { userId: user.id, token }
}

async function buatSesiKasir() {
  const unik = Date.now()
  const user = await prisma.user.upsert({
    where: { email: EMAIL_KASIR },
    update: { role: 'KASIR' },
    create: {
      id: `usr-e2e-kasir-${unik}`,
      name: 'E2E Kasir',
      email: EMAIL_KASIR,
      emailVerified: true,
      role: 'KASIR',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
  const token = `token-e2e-kasir-${unik}`
  await prisma.session.create({
    data: {
      id: `ses-e2e-kasir-${unik}`,
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 600_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
  return { userId: user.id, token }
}

test.describe('halaman owner (dengan sesi)', () => {
  let sesi: { userId: string; token: string }
  let sesiKasir: { userId: string; token: string }
  let produkIds: string[]
  let produkNama: string
  let produkTabelNama: string[]
  let memberTabelNama: string[]
  let memberIds: string[]

  test.beforeAll(async () => {
    sesi = await buatSesiOwner()
    sesiKasir = await buatSesiKasir()
    const unik = Date.now()
    produkNama = `Produk E2E Utama ${unik}`
    produkTabelNama = Array.from(
      { length: 12 },
      (_, i) => `Produk E2E Tabel ${unik} ${String(i + 1).padStart(2, '0')}`,
    )
    // E2E tak bergantung pada data seed (unit test bisa mengosongkan master).
    const utama = await prisma.produk.create({
      data: {
        nama: produkNama,
        sku: `E2E-${unik}-utama`,
        harga: 15000,
        stok: 10,
        aktif: true,
      },
    })
    const tabel = await Promise.all(
      produkTabelNama.map((nama, i) =>
        prisma.produk.create({
          data: {
            nama,
            sku: `E2E-${unik}-${i + 1}`,
            harga: 10000 + i,
            stok: 10,
            aktif: i < 11,
          },
        }),
      ),
    )
    produkIds = [utama.id, ...tabel.map((p) => p.id)]
    memberTabelNama = Array.from(
      { length: 12 },
      (_, i) => `Member E2E Tabel ${unik} ${String(i + 1).padStart(2, '0')}`,
    )
    const members = await Promise.all(
      memberTabelNama.map((nama) => prisma.member.create({ data: { nama } })),
    )
    memberIds = members.map((member) => member.id)
  })

  test.afterAll(async () => {
    await prisma.member.deleteMany({ where: { id: { in: memberIds } } })
    await prisma.transaksiItem.deleteMany({
      where: { produkId: { in: produkIds } },
    })
    await prisma.produk.deleteMany({ where: { id: { in: produkIds } } })
    await prisma.session.deleteMany({ where: { userId: sesi.userId } })
    await prisma.user.deleteMany({ where: { id: sesi.userId } })
    await prisma.session.deleteMany({ where: { userId: sesiKasir.userId } })
    await prisma.user.deleteMany({ where: { id: sesiKasir.userId } })
  })

  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: cookieSesi(sesi.token),
        domain: 'localhost',
        path: '/',
      },
    ])
  })

  const HALAMAN = [
    '/kasir',
    '/dashboard',
    '/produk',
    '/member',
    '/bahan',
    '/supplier',
    '/printer',
    '/percetakan',
    '/laporan',
    '/laporan-belanja',
    '/laporan-pajak',
    '/buku-besar',
    '/user',
    '/pengaturan',
    '/shift',
    '/retur',
    '/opname',
    '/meja',
    '/dapur',
    '/audit-log',
    '/notifikasi',
    '/pesanan',
  ]

  for (const rute of HALAMAN) {
    test(`${rute} terbuka tanpa galat server`, async ({ page }) => {
      const galat: string[] = []
      page.on('console', (m) => {
        if (m.type() === 'error') galat.push(m.text())
      })
      const res = await page.goto(rute, { waitUntil: 'networkidle' })
      expect(res?.status()).toBeLessThan(500)
      const isi = await page.locator('body').innerText()
      expect(isi).not.toContain('Terjadi kesalahan di server')
      // Sesi harus benar-benar dipakai — bukan jatuh ke halaman login.
      expect(new URL(page.url()).pathname).toBe(rute)
      // Galat tak harus muncul sebagai teks; cek juga jejak error di konsol.
      // 429 dari analytics antar-test adalah rate limit yang memang dirancang,
      // bukan kegagalan render/server halaman ini.
      expect(
        galat.filter(
          (g) => !g.includes('favicon') && !g.includes('status of 429'),
        ),
      ).toEqual([])
    })
  }

  test('kasir: grid produk tampil & tak crash saat keranjang kosong', async ({
    page,
  }) => {
    await page.goto('/kasir', { waitUntil: 'networkidle' })
    const produk = page.getByRole('button', { name: /tambah/i }).first()
    await expect(produk).toBeVisible()
  })

  test('user: daftar user & keterangan sumber peran tampil', async ({
    page,
  }) => {
    await page.goto('/user', { waitUntil: 'networkidle' })
    await expect(page.getByText(EMAIL_OWNER)).toBeVisible()
    await expect(page.getByText(/Mengikuti OWNER_EMAILS/).first()).toBeVisible()
  })

  test('produk: form ubah terisi nilai produk', async ({ page }) => {
    await page.goto('/produk', { waitUntil: 'networkidle' })
    await page.getByPlaceholder('Cari produk...').fill(produkNama)
    const baris = page.locator('table tbody tr').filter({ hasText: produkNama })
    await expect(baris).toHaveCount(1)
    await baris.getByRole('button', { name: 'Ubah produk' }).click()

    const form = page.locator('form')
    await expect(form.locator('input').first()).toHaveValue(produkNama)
    await expect(form.locator('input[type="number"]').first()).toHaveValue(
      '15000',
    )
    await expect(form.locator('input[type="number"]').nth(1)).toHaveValue('10')
    await expect(form.getByText('Tanpa kategori')).toBeVisible()
  })

  test('produk: tabel 10 baris, pagination, urutan, dan filter status', async ({
    page,
  }) => {
    await page.goto('/produk', { waitUntil: 'networkidle' })
    await page.getByPlaceholder('Cari produk...').fill('Produk E2E Tabel')

    const baris = page.locator('table tbody tr')
    await expect(baris).toHaveCount(10)

    await page.getByRole('link', { name: 'Berikutnya' }).click()
    await expect(baris).toHaveCount(2)
    await expect(baris.first()).toContainText(produkTabelNama[10])

    await page.getByRole('link', { name: '1', exact: true }).click()
    await page.getByRole('combobox', { name: 'Baris per halaman' }).click()
    await page.getByRole('option', { name: '25', exact: true }).click()
    await expect(baris).toHaveCount(12)

    const kolomNama = page.getByRole('button', { name: 'Nama', exact: true })
    await kolomNama.click()
    await kolomNama.click()
    await expect(baris.first()).toContainText(produkTabelNama[11])

    await page.getByRole('combobox', { name: 'Filter status' }).click()
    await page.getByRole('option', { name: 'Nonaktif' }).click()
    await expect(baris).toHaveCount(1)
    await expect(baris.first()).toContainText(produkTabelNama[11])
  })

  test('member: tabel memakai pagination 10 dan opsi 25, 50, 100', async ({
    page,
  }) => {
    await page.goto('/member', { waitUntil: 'networkidle' })
    await page.getByPlaceholder('Cari member...').fill('Member E2E Tabel')

    const baris = page.locator('table tbody tr')
    await expect(baris).toHaveCount(10)
    await page.getByRole('link', { name: 'Berikutnya' }).click()
    await expect(baris).toHaveCount(2)

    for (const ukuran of ['25', '50', '100']) {
      await page.getByRole('combobox', { name: 'Baris per halaman' }).click()
      await page.getByRole('option', { name: ukuran, exact: true }).click()
      await expect(baris).toHaveCount(12)
    }

    const kolomNama = page.getByRole('button', { name: 'Nama', exact: true })
    await kolomNama.click()
    await expect(baris.first()).toContainText(memberTabelNama[0])
    await kolomNama.click()
    await expect(baris.first()).toContainText(memberTabelNama[11])
  })

  test('owner: tautan pesanan online tidak tampil untuk staf', async ({
    page,
  }) => {
    await page.goto('/produk', { waitUntil: 'networkidle' })
    await expect(
      page.locator('header').getByRole('link', { name: 'Kasir' }),
    ).toBeVisible()
    await expect(
      page.locator('header').getByRole('link', { name: 'Pesanan Online' }),
    ).toHaveCount(0)
    await expect(
      page
        .locator('[data-slot="sidebar"]')
        .getByRole('link', { name: 'Pesanan Online' }),
    ).toHaveCount(0)
    await expect(
      page.locator('footer').getByRole('link', { name: 'Pesanan Online' }),
    ).toHaveCount(0)
  })

  test('kasir: tautan pesanan online tidak tampil di footer', async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: cookieSesi(sesiKasir.token),
        domain: 'localhost',
        path: '/',
      },
    ])
    await page.goto('/kasir', { waitUntil: 'networkidle' })
    await expect(
      page.locator('footer').getByRole('link', { name: 'Pesanan Online' }),
    ).toHaveCount(0)
  })

  test('kasir: antrean cetak dapat dibuka', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'better-auth.session_token',
        value: cookieSesi(sesiKasir.token),
        domain: 'localhost',
        path: '/',
      },
    ])
    await page.goto('/percetakan', { waitUntil: 'networkidle' })
    await expect(
      page.getByRole('heading', { name: 'Antrean Cetak' }),
    ).toBeVisible()
  })
})
