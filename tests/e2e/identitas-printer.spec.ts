import { createHmac } from 'node:crypto'

import { expect, test } from '@playwright/test'

import { prisma } from '../../src/db.js'

const EMAIL = 'e2e-identitas@pos.test'

function cookieSesi(token: string): string {
  const secret = process.env.BETTER_AUTH_SECRET ?? ''
  const signature = createHmac('sha256', secret).update(token).digest('base64')
  return `${token}.${signature}`
}

async function buatSesiOwner() {
  const unik = Date.now()
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { role: 'OWNER' },
    create: {
      id: `usr-e2e-id-${unik}`,
      name: 'E2E Identitas',
      email: EMAIL,
      emailVerified: true,
      role: 'OWNER',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
  await prisma.session.deleteMany({ where: { userId: user.id } })
  const token = `token-e2e-id-${unik}`
  await prisma.session.create({
    data: {
      id: `ses-e2e-id-${unik}`,
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 600_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
  return { userId: user.id, token }
}

const PNG_1X1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

test.describe.configure({ mode: 'serial' })

test.describe('identitas & printer', () => {
  let sesi: { userId: string; token: string }

  test.beforeAll(async () => {
    sesi = await buatSesiOwner()
  })

  test.afterAll(async () => {
    await prisma.printer.deleteMany({ where: { userId: sesi.userId } })
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

  test('ikon: crop lalu reset tanpa menyimpan', async ({ page }) => {
    await page.goto('/pengaturan', { waitUntil: 'networkidle' })
    await expect(page.getByText(/Ikon Aplikasi|App Icon/).first()).toBeVisible()

    await page.locator('#ikon-file').setInputFiles({
      name: 'uji.png',
      mimeType: 'image/png',
      buffer: Buffer.from(PNG_1X1, 'base64'),
    })

    await expect(
      page.getByRole('heading', { name: /Atur crop ikon|Crop app icon/ }),
    ).toBeVisible()
    await page
      .getByRole('button', { name: /Pakai hasil crop|Use crop/ })
      .click()
    await expect(
      page.getByRole('heading', { name: /Atur crop ikon|Crop app icon/ }),
    ).toBeHidden()

    const pratinjau = page.getByAltText(/Pratinjau ikon|Icon preview/)
    await expect(pratinjau).toBeVisible()
    await expect(pratinjau).toHaveAttribute('src', /^blob:/)

    await page.getByRole('button', { name: /Hapus ikon|Remove icon/ }).click()
    await expect(page.getByAltText(/Pratinjau ikon|Icon preview/)).toHaveCount(
      0,
    )
  })

  test('printer: auto-scan per sesi lalu dibersihkan saat logout', async ({
    page,
    context,
  }) => {
    await page.addInitScript(() => {
      const port = {
        getInfo: () => ({ usbVendorId: 0x04b8, usbProductId: 0x0202 }),
        open: async () => {},
        close: async () => {},
        writable: null,
      }
      Object.defineProperty(navigator, 'serial', {
        configurable: true,
        value: {
          getPorts: async () => [port],
          requestPort: async () => port,
          addEventListener: () => {},
          removeEventListener: () => {},
        },
      })
    })

    await page.goto('/printer', { waitUntil: 'networkidle' })
    const pemicu = page
      .getByRole('button', { name: /Pindai printer|Scan printer/ })
      .first()
    await expect(pemicu).toBeVisible()
    await pemicu.click()

    await expect(
      page.getByRole('heading', { name: /Printer perangkat|Device printer/ }),
    ).toBeVisible()
    await expect(page.getByText(/Epson/)).toBeVisible()
    await expect(page.getByText(/Dari port: USB|From port: USB/)).toBeVisible()
    await expect(page.getByText(/Dipakai|In use/)).toBeVisible()

    const tersimpan = await page.evaluate(() =>
      sessionStorage.getItem('pos_printer_perangkat'),
    )
    expect(tersimpan).toContain('Epson')

    await expect
      .poll(() =>
        prisma.printer.count({
          where: { userId: sesi.userId, perangkat: { startsWith: 'serial-' } },
        }),
      )
      .toBeGreaterThan(0)

    const kirim = await page.request.post('/api/v1/printer/perangkat', {
      data: {
        nama: 'Printer WiFi Uji',
        perangkat: 'wifi-e2e',
        koneksi: 'WIFI',
        vendorName: 'Epson',
        serialNumber: 'SN-E2E',
        productName: 'TM-T82',
      },
    })
    expect(kirim.status()).toBe(201)
    const isi = (await kirim.json()) as {
      data: { userId: string; koneksi: string; serialNumber: string }
    }
    expect(isi.data.userId).toBe(sesi.userId)
    expect(isi.data.koneksi).toBe('WIFI')
    expect(isi.data.serialNumber).toBe('SN-E2E')

    const daftar = await page.request.get('/api/v1/printer/perangkat')
    expect(daftar.ok()).toBeTruthy()

    await page.keyboard.press('Escape')
    await context.clearCookies()
    await page.goto('/printer', { waitUntil: 'networkidle' })
    await expect(page).toHaveURL(/\/login/)

    await expect
      .poll(() =>
        page.evaluate(() => sessionStorage.getItem('pos_printer_perangkat')),
      )
      .toBeNull()
  })
})
