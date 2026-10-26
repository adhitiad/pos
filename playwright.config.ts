import { defineConfig, devices } from '@playwright/test'

// Port khusus e2e (bukan 3000): dev server sering sudah jalan di 3000 dan
// bisa stale/berubah state, sehingga e2e ikut gagal atau timeout. Port
// terpisah membuat e2e deterministik — server sendiri selalu dipakai.
const PORT_E2E = 3100
const BASE = `http://localhost:${PORT_E2E}`

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit-mobile',
      // Flake dev-server: overlay Vite saat dependensi dioptimasi pada run
      // pertama. Retry sekali hanya untuk WebKit; Chromium tetap tanpa retry.
      retries: 1,
      use: { ...devices['iPhone 13'], browserName: 'webkit' },
    },
  ],
  webServer: {
    command: `bun --bun run dev --port ${PORT_E2E}`,
    url: `${BASE}/login`,
    // Di CI selalu server baru; lokal boleh pakai server yang sudah hidup.
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
