import { createHmac } from 'node:crypto'

import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

import { prisma } from '../../src/db.js'

// FEAT-06: antrean review owner — setujui (posting) dan tolak (audit) draft,
// plus guard agar kasir tidak bisa melewati antrean saat mode `owner`.
// Sesi dibuat manual (HMAC cookie) seperti tests/e2e/pengajuan.spec.ts.
const EMAIL_OWNER = 'e2e-review-owner@pos.test'
const EMAIL_KASIR = 'e2e-review-kasir@pos.test'
const SKU_AWALAN = 'E2E-REVIEW-'
const KUNCI_MODE = 'review_transaksi_mode'

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
      id: `usr-e2e-review-${role}-${unik}`,
      name: nama,
      email,
      emailVerified: true,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  })
  const token = `token-e2e-review-${role}-${unik}`
  await prisma.session.create({
    data: {
      id: `ses-e2e-review-${role}-${unik}`,
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

async function setMode(nilai: 'kasir' | 'owner') {
  await prisma.pengaturan.upsert({
    where: { kunci: KUNCI_MODE },
    update: { nilai },
    create: { kunci: KUNCI_MODE, nilai },
  })
}

async function buatDraft(kasirId: string, produkId: string) {
  const unik = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  return prisma.draftTransaksi.create({
    data: {
      nomor: `DRAFT-E2E-${unik}`,
      kasirId,
      payloadJson: {
        items: [{ produkId, qty: 1 }],
        diskon: 0,
        pajak: 0,
        tukarPoin: 0,
        metodeBayar: 'TUNAI',
      },
      subtotal: 15000,
      total: 15000,
      metodeBayar: 'TUNAI',
      dibuatOffline: false,
    },
  })
}

// Hapus draft + transaksi/jurnal/audit hasil review milik kasir uji agar
// eksekusi ulang tidak mewarisi baris run sebelumnya.
async function bersihkan(kasirId: string): Promise<void> {
  const drafts = await prisma.draftTransaksi.findMany({
    where: { kasirId },
    select: { id: true, transaksiId: true },
  })
  const draftIds = drafts.map((d) => d.id)
  const txIds = drafts
    .map((d) => d.transaksiId)
    .filter((id): id is string => Boolean(id))

  if (txIds.length > 0) {
    const jurnal = await prisma.jurnal.findMany({
      where: { transaksiId: { in: txIds } },
      select: { id: true },
    })
    const jurnalIds = jurnal.map((j) => j.id)
    if (jurnalIds.length > 0) {
      await prisma.jurnalDetail.deleteMany({
        where: { jurnalId: { in: jurnalIds } },
      })
      await prisma.jurnal.deleteMany({ where: { id: { in: jurnalIds } } })
    }
    await prisma.transaksiReviewAudit.deleteMany({
      where: { transaksiId: { in: txIds } },
    })
    await prisma.transaksi.deleteMany({ where: { id: { in: txIds } } })
  }

  if (draftIds.length > 0) {
    await prisma.transaksiReviewAudit.deleteMany({
      where: { draftId: { in: draftIds } },
    })
    await prisma.auditLog.deleteMany({
      where: { entityId: { in: draftIds } },
    })
    await prisma.draftTransaksi.deleteMany({ where: { id: { in: draftIds } } })
  }
}

test.describe('review transaksi owner', () => {
  let sesiOwner: { userId: string; token: string }
  let sesiKasir: { userId: string; token: string }
  let produk: { id: string }

  test.beforeAll(async () => {
    sesiOwner = await buatSesi(EMAIL_OWNER, 'E2E Owner Review', 'OWNER')
    sesiKasir = await buatSesi(EMAIL_KASIR, 'E2E Kasir Review', 'KASIR')
    await setMode('owner')
    await bersihkan(sesiKasir.userId)
    await prisma.produk.deleteMany({
      where: { sku: { startsWith: SKU_AWALAN } },
    })
    produk = await prisma.produk.create({
      data: {
        nama: `Produk ${SKU_AWALAN}${Date.now()}`,
        sku: `${SKU_AWALAN}${Date.now()}`,
        harga: 15000,
        stok: 50,
        aktif: true,
      },
    })
  })

  test.afterAll(async () => {
    await bersihkan(sesiKasir.userId)
    await prisma.produk.deleteMany({
      where: { sku: { startsWith: SKU_AWALAN } },
    })
    await setMode('kasir')
    await prisma.session.deleteMany({
      where: { userId: { in: [sesiOwner.userId, sesiKasir.userId] } },
    })
    await prisma.auditLog.deleteMany({
      where: { userId: { in: [sesiOwner.userId, sesiKasir.userId] } },
    })
    await prisma.user.deleteMany({
      where: { id: { in: [sesiOwner.userId, sesiKasir.userId] } },
    })
  })

  test('owner menyetujui draft → posting + audit tercatat', async ({
    page,
  }) => {
    const draft = await buatDraft(sesiKasir.userId, produk.id)

    await pasangSesi(page, sesiOwner.token)
    await page.goto('/review-transaksi', { waitUntil: 'networkidle' })

    const baris = page.getByRole('row').filter({ hasText: draft.nomor })
    await expect(baris).toBeVisible()
    await baris.getByRole('button', { name: 'Setujui', exact: true }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByLabel('Catatan (opsional)').fill('Cek OK')
    await dialog.getByRole('button', { name: 'Setujui & posting' }).click()
    await expect(page.getByText('Draft disetujui dan diposting')).toBeVisible()

    await expect
      .poll(async () => {
        const d = await prisma.draftTransaksi.findUnique({
          where: { id: draft.id },
          select: { status: true },
        })
        return d?.status
      })
      .toBe('DISETUJUI')

    const setelah = await prisma.draftTransaksi.findUnique({
      where: { id: draft.id },
      select: { transaksiId: true },
    })
    expect(setelah?.transaksiId).toBeTruthy()

    const audit = await prisma.transaksiReviewAudit.findFirst({
      where: { draftId: draft.id },
    })
    expect(audit).toMatchObject({
      status: 'DISETUJUI',
      kasirId: sesiOwner.userId,
      catatan: 'Cek OK',
    })
    expect(audit?.transaksiId).toBe(setelah?.transaksiId)

    const log = await prisma.auditLog.findFirst({
      where: { entityId: draft.id, action: 'transaksi.review.setujui' },
    })
    expect(log).toBeTruthy()
  })

  test('owner menolak draft dengan alasan → audit DITOLAK', async ({
    page,
  }) => {
    const draft = await buatDraft(sesiKasir.userId, produk.id)

    await pasangSesi(page, sesiOwner.token)
    await page.goto('/review-transaksi', { waitUntil: 'networkidle' })

    const baris = page.getByRole('row').filter({ hasText: draft.nomor })
    await expect(baris).toBeVisible()
    await baris.getByRole('button', { name: 'Tolak', exact: true }).click()

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await dialog.getByLabel('Catatan (opsional)').fill('Stok tidak sesuai')
    await dialog.getByRole('button', { name: 'Tolak draft' }).click()
    await expect(page.getByText('Draft ditolak')).toBeVisible()

    await expect
      .poll(async () => {
        const d = await prisma.draftTransaksi.findUnique({
          where: { id: draft.id },
          select: { status: true },
        })
        return d?.status
      })
      .toBe('DITOLAK')

    const audit = await prisma.transaksiReviewAudit.findFirst({
      where: { draftId: draft.id },
    })
    expect(audit).toMatchObject({
      status: 'DITOLAK',
      transaksiId: null,
      kasirId: sesiOwner.userId,
      catatan: 'Stok tidak sesuai',
    })

    const log = await prisma.auditLog.findFirst({
      where: { entityId: draft.id, action: 'transaksi.review.tolak' },
    })
    expect(log).toBeTruthy()
  })

  test('kasir tidak bisa melewati antrean saat mode owner', async ({
    page,
  }) => {
    const draft = await buatDraft(sesiKasir.userId, produk.id)

    await pasangSesi(page, sesiKasir.token)
    const res = await page.request.post('/api/v1/transaksi-review', {
      data: { draftId: draft.id, keputusan: 'DISETUJUI' },
    })
    expect(res.status()).toBe(201)
    const body = (await res.json()) as {
      ok: boolean
      data: { keputusan: string; hasil: unknown }
    }
    expect(body.ok).toBe(true)
    expect(body.data.keputusan).toBe('MENUNGGU')
    expect(body.data.hasil).toBeNull()

    const setelah = await prisma.draftTransaksi.findUnique({
      where: { id: draft.id },
      select: { status: true, transaksiId: true },
    })
    expect(setelah?.status).toBe('MENUNGGU')
    expect(setelah?.transaksiId).toBeNull()
  })

  // Regresi: `useFormKasir` mengirim payload POS + ringkasan subtotal/total;
  // tanpa ringkasan, schema menolak dengan "expected number, received undefined"
  // dan tombol bayar gagal sebelum draft dibuat.
  test('kasir membuat draft lewat API dengan ringkasan subtotal/total', async ({
    page,
  }) => {
    await pasangSesi(page, sesiKasir.token)
    const res = await page.request.post('/api/v1/transaksi-draft', {
      data: {
        items: [{ produkId: produk.id, qty: 1 }],
        diskon: 0,
        tukarPoin: 0,
        metodeBayar: 'TUNAI',
        subtotal: 15000,
        total: 15000,
      },
    })
    expect(res.status()).toBe(201)
    const body = (await res.json()) as {
      ok: boolean
      data: { id: string; status: string }
    }
    expect(body.ok).toBe(true)
    expect(body.data.status).toBe('MENUNGGU')

    const tersimpan = await prisma.draftTransaksi.findUnique({
      where: { id: body.data.id },
      select: { subtotal: true, total: true, kasirId: true },
    })
    expect(tersimpan?.kasirId).toBe(sesiKasir.userId)
    expect(tersimpan?.subtotal.toNumber()).toBe(15000)
    expect(tersimpan?.total.toNumber()).toBe(15000)
  })
})
