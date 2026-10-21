import { defineConfig } from '@playwright/test'

// Port khusus e2e (bukan 3000): dev server sering sudah jalan di 3000 dan
// bisa stale/berubah state, sehingga e2e ikut gagal atau timeout. Port
// terpisah membuat e2e deterministik — server sendiri selalu dipakai.
const PORT_E2E = 3100
const BASE = `http://localhost:${PORT_E2E}`

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
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
