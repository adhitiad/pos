import { expect, test } from '@playwright/test'

import { prisma } from '../../src/db.js'

// Tanpa login Google: halaman publik render, halaman guard melempar ke /login.
test('home memuat navigasi', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(
    page
      .getByRole('main')
      .getByRole('link', { name: /Buka kasir|Open cashier/i })
      .first(),
  ).toBeVisible()
})

test('landing berfungsi di tema terang dan gelap', async ({ page }) => {
  for (const tema of ['light', 'dark']) {
    await page.goto('/')
    await page.evaluate((nilai) => localStorage.setItem('theme', nilai), tema)
    await page.reload()
    await expect(page.locator('html')).toHaveClass(new RegExp(tema))
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  }
})

test('hero baru menampilkan alur transaksi', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    /Kasir yang bawa buku besarnya|A cashier that keeps the books/,
  )
  await expect(
    page.getByText(/Alur satu transaksi|One transaction/).first(),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: /Buka kasir|Open cashier/ }).first(),
  ).toBeVisible()
})

test('identitas publik: ikon SVG dan manifest', async ({ request }) => {
  const ikon = await request.get('/api/v1/app-icon')
  expect(ikon.status()).toBe(200)
  expect(ikon.headers()['content-type']).toContain('image/svg+xml')
  expect(await ikon.text()).toContain('<svg')

  const manifest = await request.get('/api/v1/manifest')
  expect(manifest.status()).toBe(200)
  const data = (await manifest.json()) as {
    name: string
    icons: { src: string; sizes: string }[]
  }
  expect(data.name.length).toBeGreaterThan(0)
  expect(data.icons.some((i) => i.sizes === 'any')).toBe(true)

  const identitas = await request.get('/api/v1/identitas')
  expect(identitas.status()).toBe(200)
  expect((await identitas.json()) as { ok: boolean }).toMatchObject({
    ok: true,
  })
})

test('health melaporkan database dan app', async ({ request }) => {
  const respons = await request.get('/api/health')
  expect(respons.status()).toBe(200)
  expect(await respons.json()).toMatchObject({
    database: 'ok',
    app: 'healthy',
  })
})

test('home menampilkan tiga baris produk', async ({ page }) => {
  const awalan = `Produk E2E Landing ${Date.now()}`
  await prisma.produk.createMany({
    data: Array.from({ length: 4 }, (_, i) => ({
      nama: `${awalan} ${i + 1}`,
      sku: `LANDING-${Date.now()}-${i}`,
      harga: 10000 + i * 1000,
      stok: 10,
      aktif: true,
    })),
  })

  try {
    await page.goto('/')

    const baris = [
      /Produk Terpopuler|Popular Products/,
      /Produk Terbaru|New Products/,
      /Populer dan Baru|Popular and New/,
    ]

    for (const judul of baris) {
      await expect(page.getByRole('heading', { name: judul })).toBeVisible()
      const bagian = page
        .getByRole('region', { name: judul })
        .filter({ has: page.getByRole('heading', { name: judul }) })
      await expect(bagian).toBeVisible()
      const carousel = bagian.getByRole('region', { name: judul })
      await expect(carousel).toBeVisible()
      expect(await carousel.getByRole('group').count()).toBeGreaterThan(3)
    }
  } finally {
    await prisma.produk.deleteMany({ where: { nama: { startsWith: awalan } } })
  }
})

test('halaman privasi memakai header dan footer landing', async ({ page }) => {
  await page.goto('/privasi')
  await expect(
    page.getByRole('heading', { name: /Kebijakan Privasi|Privacy Policy/ }),
  ).toBeVisible()
  await expect(page.getByRole('banner')).toBeVisible()
  await expect(page.getByRole('contentinfo')).toBeVisible()
  await expect(
    page.getByRole('link', { name: /Kembali ke beranda|Back to home/ }),
  ).toBeVisible()
})

test('login menampilkan tombol Google', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('button', { name: /Google/ })).toBeVisible()
})

test('kasir tanpa sesi → /login', async ({ page }) => {
  await page.goto('/kasir')
  await expect(page).toHaveURL(/\/login/)
})

test('buku besar tanpa sesi → /login', async ({ page }) => {
  await page.goto('/buku-besar')
  await expect(page).toHaveURL(/\/login/)
})

for (const rute of [
  '/produk',
  '/member',
  '/bahan',
  '/supplier',
  '/printer',
  '/percetakan',
  '/laporan-belanja',
  '/audit-log',
  '/user',
  '/laporan',
  '/pengaturan',
  '/notifikasi',
]) {
  test(`${rute} tanpa sesi → /login`, async ({ page }) => {
    await page.goto(rute)
    await expect(page).toHaveURL(/\/login/)
  })
}

test('dashboard tanpa sesi → /login', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/)
})

test('endpoint sesi auth hidup', async ({ request }) => {
  const res = await request.get('/api/auth/get-session')
  expect(res.status()).toBe(200)
})
