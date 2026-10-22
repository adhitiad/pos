import { createHmac } from 'node:crypto'

import { expect, test } from '@playwright/test'

import { prisma } from '../../src/db.js'

// Halaman owner butuh sesi. Better Auth menandatangani cookie sesi dengan
// HMAC-SHA256(secret, token) → nilai cookie = "<token>.<base64 signature>".
// Dengan ini e2e bisa menguji halaman yang tadinya tak pernah tersentuh
// (semua halaman di balik login).
const EMAIL_OWNER = 'e2e-owner@pos.test'

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

test.describe('halaman owner (dengan sesi)', () => {
  let sesi: { userId: string; token: string }
  let produkId: string

  test.beforeAll(async () => {
    sesi = await buatSesiOwner()
    // E2E tak bergantung pada data seed (unit test bisa mengosongkan master):
    // buat satu produk aktif supaya grid kasir terisi.
    const produk = await prisma.produk.create({
      data: {
        nama: `Produk E2E ${Date.now()}`,
        sku: `E2E-${Date.now()}`,
        harga: 15000,
        stok: 10,
        aktif: true,
      },
    })
    produkId = produk.id
  })

  test.afterAll(async () => {
    await prisma.transaksiItem.deleteMany({
      where: { produkId },
    })
    await prisma.produk.deleteMany({ where: { id: produkId } })
    await prisma.session.deleteMany({ where: { userId: sesi.userId } })
    await prisma.user.deleteMany({ where: { id: sesi.userId } })
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
})
