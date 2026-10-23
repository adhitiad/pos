import { createHmac } from 'node:crypto'

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { prisma } from '../../src/db.js'

// Alur pengajuan pengeluaran kasir → persetujuan owner → notifikasi ke kasir.
// Sesi dibuat manual (HMAC cookie) seperti tests/e2e/auth.spec.ts.
const EMAIL_OWNER = 'e2e-pengajuan-owner@pos.test'
const EMAIL_KASIR = 'e2e-pengajuan-kasir@pos.test'
const NAMA_KASIR = 'E2E Kasir Pengajuan'

function cookieSesi(token: string): string {
  const secret = process.env.BETTER_AUTH_SECRET ?? ''
  const signature = createHmac('sha256', secret).update(token).digest('base64')
  return `${token}.${signature}`
}

async function buatSesi(email: string, nama: string, role: 'OWNER' | 'KASIR') {
  const unik = Date.now()
  const user = await prisma.user.upsert({
    where: { email },
    update: { role },
    create: {
      id: `usr-e2e-pengajuan-${role}-${unik}`,
      name: nama,
      email,
      emailVerified: true,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
  const token = `token-e2e-pengajuan-${role}-${unik}`
  await prisma.session.create({
    data: {
      id: `ses-e2e-pengajuan-${role}-${unik}`,
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 600_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
  return { userId: user.id, token }
}

async function pasangSesi(page: Page, token: string) {
  await page.context().addCookies([
    {
      name: 'better-auth.session_token',
      value: cookieSesi(token),
      domain: 'localhost',
      path: '/',
    },
  ])
}

// Hapus sisa pengajuan/jurnal/notifikasi milik pengguna uji supaya
// eksekusi ulang tidak_mewarisi baris milik run sebelumnya.
async function bersihkanSisa(
  kasirId: string,
  idPengguna: string[],
): Promise<void> {
  const pengajuan = await prisma.pengajuanPengeluaran.findMany({
    where: { kasirId },
    select: { id: true, jurnalId: true },
  })
  const jurnalIds = pengajuan
    .map((p) => p.jurnalId)
    .filter((id): id is string => Boolean(id))
  if (jurnalIds.length > 0) {
    await prisma.jurnalDetail.deleteMany({
      where: { jurnalId: { in: jurnalIds } },
    })
    await prisma.jurnal.deleteMany({ where: { id: { in: jurnalIds } } })
  }
  await prisma.pengajuanPengeluaran.deleteMany({ where: { kasirId } })
  await prisma.notifikasi.deleteMany({ where: { userId: { in: idPengguna } } })
}

test.describe('pengajuan pengeluaran kasir', () => {
  let sesiOwner: { userId: string; token: string }
  let sesiKasir: { userId: string; token: string }

  test.beforeAll(async () => {
    sesiOwner = await buatSesi(EMAIL_OWNER, 'E2E Owner Pengajuan', 'OWNER')
    sesiKasir = await buatSesi(EMAIL_KASIR, NAMA_KASIR, 'KASIR')
    await bersihkanSisa(sesiKasir.userId, [sesiOwner.userId, sesiKasir.userId])
  })

  test.afterAll(async () => {
    await bersihkanSisa(sesiKasir.userId, [sesiOwner.userId, sesiKasir.userId])
    await prisma.session.deleteMany({
      where: { userId: { in: [sesiOwner.userId, sesiKasir.userId] } },
    })
    await prisma.user.deleteMany({
      where: { id: { in: [sesiOwner.userId, sesiKasir.userId] } },
    })
  })

  test('kasir mengajukan, owner menyetujui, kasir menerima kabar nominal', async ({
    page,
  }) => {
    // 1. Kasir mengajukan lewat dialog di halaman kasir.
    await pasangSesi(page, sesiKasir.token)
    await page.goto('/kasir', { waitUntil: 'networkidle' })

    await page.getByRole('button', { name: 'Ajukan Pengeluaran' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByLabel('Nominal').fill('45000')
    await dialog.getByRole('button', { name: 'Kirim pengajuan' }).click()
    await expect(page.getByText('Pengajuan terkirim ke owner')).toBeVisible()

    const pengajuan = await prisma.pengajuanPengeluaran.findFirst({
      where: { kasirId: sesiKasir.userId },
      orderBy: { createdAt: 'desc' },
    })
    expect(pengajuan?.status).toBe('PENDING')
    const idPengajuan = pengajuan?.id
    expect(idPengajuan).toBeTruthy()

    // 2. Owner melihat ajuan dan menyetujuinya.
    await pasangSesi(page, sesiOwner.token)
    await page.goto('/pengajuan', { waitUntil: 'networkidle' })

    // Kartu khusus ajuan kasir uji — aman dari ajuan lain di daftar.
    const kartu = page.locator('[data-slot="card"]').filter({
      hasText: NAMA_KASIR,
    })
    await expect(kartu.getByText('Operasional Kasir — Rp45.000')).toBeVisible()

    await kartu.getByRole('button', { name: 'Setujui / Tolak' }).click()
    const dialogKeputusan = page.getByRole('dialog')
    await expect(dialogKeputusan).toBeVisible()
    await dialogKeputusan
      .getByRole('button', { name: 'Setujui', exact: true })
      .click()
    await dialogKeputusan
      .getByRole('button', { name: 'Setujui pengajuan' })
      .click()

    await expect(kartu.getByText('Disetujui', { exact: true })).toBeVisible()

    const disetujui = await prisma.pengajuanPengeluaran.findUnique({
      where: { id: idPengajuan },
    })
    expect(disetujui?.status).toBe('DISETUJUI')
    expect(disetujui?.nominalDisetujui?.toNumber()).toBe(45_000)
    expect(disetujui?.jurnalId).toBeTruthy()

    // 3. Kasir menerima notifikasi berisi nominal yang disetujui.
    await pasangSesi(page, sesiKasir.token)
    await page.goto('/notifikasi', { waitUntil: 'networkidle' })
    await expect(page.getByText('Pengajuan disetujui').first()).toBeVisible()
    await expect(
      page.getByText(/Nominal yang disetujui: Rp45\.000/).first(),
    ).toBeVisible()
  })

  test('dialog ajuan rapi di layar 390px tanpa scroll horizontal', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await pasangSesi(page, sesiKasir.token)
    await page.goto('/kasir', { waitUntil: 'networkidle' })

    await page.getByRole('button', { name: 'Ajukan Pengeluaran' }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    const bocor = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(bocor).toBeLessThanOrEqual(0)

    // Tinggi tombol waited sampai animasi buka dialog selesai supaya
    // ukuran terukur sama dengan yang dilihat pengguna.
    const tombol = dialog.getByRole('button', { name: 'Kirim pengajuan' })
    await expect
      .poll(
        async () =>
          await tombol.evaluate((el) => el.getBoundingClientRect().height),
        { timeout: 5_000 },
      )
      .toBeGreaterThanOrEqual(44)
  })
})
