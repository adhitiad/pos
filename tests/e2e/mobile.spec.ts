import { expect, test } from '@playwright/test'

import type { Page } from '@playwright/test'

// R-03/R-35: layout 390px tidak boleh bocor scroll horizontal.
test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
})

async function tanpaScrollX(page: Page, url: string) {
  await page.goto(url)
  // Tunggu render selesai + semua aset (font, gambar) agar tidak ada layout shift
  await page.waitForLoadState('networkidle')
  await page.waitForLoadState('load')
  await page.evaluate(() => document.fonts.ready).catch(() => {})
  await page
    .locator('img')
    .evaluateAll((imgs: Element[]) =>
      Promise.all(
        imgs.map(
          (img) =>
            new Promise<void>((r) => {
              const i = img as HTMLImageElement
              if (i.complete) r()
              else {
                i.onload = () => r()
              }
            }),
        ),
      ),
    )
    .catch(() => {})
  const bocor = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(bocor).toBeLessThanOrEqual(0)
}

test('home mobile tanpa scroll horizontal', async ({ page }) => {
  await tanpaScrollX(page, '/')
})

test('dashboard mobile tanpa scroll horizontal', async ({ page }) => {
  await tanpaScrollX(page, '/dashboard')
})

test('login mobile tanpa scroll horizontal', async ({ page }) => {
  await tanpaScrollX(page, '/login')
  // CTA utama tetap setinggi jempol (44px)
  const tinggi = await page
    .getByRole('button', { name: /Google/ })
    .evaluate((el) => el.getBoundingClientRect().height)
  expect(tinggi).toBeGreaterThanOrEqual(44)
})
