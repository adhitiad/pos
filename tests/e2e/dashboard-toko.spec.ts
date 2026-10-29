import { createHmac } from 'node:crypto'

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { prisma } from '../../src/db.js'

// NEW-11: staf (owner/kasir) mendarat di dashboard, tautan Dashboard ada di
// urutan teratas sidebar, dan status buka/tutup toko bisa diubah dari dashboard.
const EMAIL_OWNER = 'e2e-dashboard-owner@pos.test'
const KUNCI_TOKO = 'toko_aktif'

function cookieSesi(token: string): string {
  const secret = process.env.BETTER_AUTH_SECRET ?? ''
  const signature = createHmac('sha256', secret).update(token).digest('base64')
  return `${token}.${signature}`
}

let token = ''
let userId = ''
let nilaiAwal: string | null = null

test.beforeAll(async () => {
  const unik = Date.now()
  const user = await prisma.user.upsert({
    where: { email: EMAIL_OWNER },
    update: { role: 'OWNER' },
    create: {
      id: `usr-e2e-dashboard-${unik}`,
      name: 'E2E Dashboard Owner',
      email: EMAIL_OWNER,
      emailVerified: true,
      role: 'OWNER',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
  userId = user.id
  token = `token-e2e-dashboard-${unik}`
  await prisma.session.create({
    data: {
      id: `ses-e2e-dashboard-${unik}`,
      userId,
      token,
      expiresAt: new Date(Date.now() + 600_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })

  const baris = await prisma.pengaturan.findUnique({
    where: { kunci: KUNCI_TOKO },
  })
  nilaiAwal = baris?.nilai ?? null
  await prisma.pengaturan.upsert({
    where: { kunci: KUNCI_TOKO },
    update: { nilai: 'true' },
    create: { kunci: KUNCI_TOKO, nilai: 'true' },
  })
})

test.afterAll(async () => {
  if (nilaiAwal === null) {
    await prisma.pengaturan.deleteMany({ where: { kunci: KUNCI_TOKO } })
  } else {
    await prisma.pengaturan.update({
      where: { kunci: KUNCI_TOKO },
      data: { nilai: nilaiAwal },
    })
  }
  await prisma.session.deleteMany({ where: { userId } })
  await prisma.user.deleteMany({ where: { id: userId } })
})

async function masukSebagaiOwner(page: Page) {
  await page.context().addCookies([
    {
      name: 'better-auth.session_token',
      value: cookieSesi(token),
      domain: 'localhost',
      path: '/',
    },
  ])
}

test('owner yang sudah login diarahkan ke dashboard', async ({ page }) => {
  await masukSebagaiOwner(page)
  await page.goto('/login', { waitUntil: 'networkidle' })
  await expect(page).toHaveURL(/\/dashboard$/)
})

test('dashboard di urutan teratas sidebar dan sakelar toko tersimpan', async ({
  page,
}, testInfo) => {
  await masukSebagaiOwner(page)
  await page.goto('/dashboard', { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  // Desktop: sidebar kiri; mobile: nav bawah. Keduanya harus memulai dengan
  // tautan Dashboard.
  const tautanAwal =
    testInfo.project.name === 'webkit-mobile'
      ? page.locator('a.chrome-nav-item').first()
      : page.locator('[data-slot="sidebar"] a').first()
  await expect(tautanAwal).toHaveAttribute('href', '/dashboard')
  await expect(page.locator('header a[href="/dashboard"]')).toHaveCount(1)

  const sakelar = page.locator('#toko-aktif-dashboard')
  await expect(sakelar).toHaveAttribute('aria-checked', 'true')

  await sakelar.click()
  await expect
    .poll(async () => {
      const baris = await prisma.pengaturan.findUnique({
        where: { kunci: KUNCI_TOKO },
        select: { nilai: true },
      })
      return baris?.nilai
    })
    .toBe('false')
  await expect(page.locator('#toko-aktif-dashboard')).toHaveAttribute(
    'aria-checked',
    'false',
  )

  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.locator('#toko-aktif-dashboard')).toHaveAttribute(
    'aria-checked',
    'false',
  )

  await page.locator('#toko-aktif-dashboard').click()
  await expect
    .poll(async () => {
      const baris = await prisma.pengaturan.findUnique({
        where: { kunci: KUNCI_TOKO },
        select: { nilai: true },
      })
      return baris?.nilai
    })
    .toBe('true')
})
