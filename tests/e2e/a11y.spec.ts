import { createHmac } from 'node:crypto'

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { prisma } from '../../src/db.js'

// Audit aksesibilitas otomatis (axe) + uji fokus/keyboard manual.
// Yang dicakup: kontras warna, struktur landmark, label form, dan operasi
// keyboard dasar. Temuan level serious/critical menggagalkan CI.
const EMAIL_OWNER = 'e2e-a11y@pos.test'

function cookieSesi(token: string): string {
  const secret = process.env.BETTER_AUTH_SECRET ?? ''
  const signature = createHmac('sha256', secret).update(token).digest('base64')
  return `${token}.${signature}`
}

async function buatSesiOwner() {
  const unik = Date.now()
  const user = await prisma.user.upsert({
    where: { email: EMAIL_OWNER },
    update: { role: 'OWNER' },
    create: {
      id: `usr-e2e-a11y-${unik}`,
      name: 'E2E A11y',
      email: EMAIL_OWNER,
      emailVerified: true,
      role: 'OWNER',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
  const token = `token-e2e-a11y-${unik}`
  await prisma.session.create({
    data: {
      id: `ses-e2e-a11y-${unik}`,
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 600_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
  return { userId: user.id, token }
}

function ringkas(
  violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'],
) {
  return violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    contoh: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
    html: v.nodes[0]?.html,
    saran: v.nodes[0]?.failureSummary,
  }))
}

async function pindaiHalaman(page: Page) {
  const hasil = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  return ringkas(
    hasil.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    ),
  )
}

test.describe('aksesibilitas publik', () => {
  for (const rute of ['/', '/login', '/pesanan']) {
    test(`${rute}: axe tidak menemukan pelanggaran serius`, async ({
      page,
    }) => {
      await page.goto(rute, { waitUntil: 'networkidle' })
      expect(await pindaiHalaman(page)).toEqual([])
    })
  }

  test('fokus keyboard terlihat di halaman login', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' })
    await page.keyboard.press('Tab')
    const fokus = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      if (!el || el === document.body) return null
      const gaya = getComputedStyle(el)
      return {
        tag: el.tagName,
        terlihat: el.matches(':focus-visible'),
        outline: gaya.outlineStyle,
        bayangan: gaya.boxShadow,
      }
    })
    expect(fokus).not.toBeNull()
    if (!fokus) throw new Error('Tidak ada elemen yang menerima fokus')
    expect(fokus.terlihat).toBe(true)
    expect(fokus.outline !== 'none' || fokus.bayangan !== 'none').toBe(true)
  })
})

test.describe('aksesibilitas halaman owner', () => {
  let sesi: { userId: string; token: string }
  let produkId: string

  test.beforeAll(async () => {
    sesi = await buatSesiOwner()
    // E2E tidak boleh bergantung pada data seed: unit test bisa mengosongkan
    // master produk. Satu produk cukup untuk menguji grid + tombol keyboard.
    const produk = await prisma.produk.create({
      data: {
        nama: `Produk E2E A11y ${Date.now()}`,
        sku: `E2E-A11Y-${Date.now()}`,
        harga: 12000,
        stok: 10,
        aktif: true,
      },
      select: { id: true },
    })
    produkId = produk.id
  })

  test.afterAll(async () => {
    await prisma.transaksiItem.deleteMany({ where: { produkId } })
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

  for (const rute of ['/dashboard', '/kasir', '/produk', '/pengaturan']) {
    test(`${rute}: axe tidak menemukan pelanggaran serius`, async ({
      page,
    }) => {
      await page.goto(rute, { waitUntil: 'networkidle' })
      expect(await pindaiHalaman(page)).toEqual([])
    })
  }

  test('kasir: tombol produk dapat diaktifkan dengan Enter', async ({
    page,
  }) => {
    await page.goto('/kasir', { waitUntil: 'networkidle' })
    const tombol = page.getByRole('button', { name: /tambah/i }).first()
    await tombol.focus()
    await expect(tombol).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('button', { name: /hapus dari keranjang/i }).first(),
    ).toBeVisible()
  })
})
