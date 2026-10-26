import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '#': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    include: ['tests/vitest/**/*.test.ts', 'tests/vitest/**/*.test.tsx'],
    // Tes integrasi memakai satu database bersama dan beberapa suite
    // menghapus tabel global (deleteMany) — jalankan berurutan agar tidak
    // saling menimpa (race → flaky).
    fileParallelism: false,
    maxWorkers: 1,
    coverage: {
      provider: 'v8',
      // Cakupan sengaja dibatasi pada logika murni: `src/server/**` (kecuali
      // wrapper *Fn.ts) dan `src/validations/**`. Komponen/rute React diuji
      // lewat E2E Playwright (`tests/e2e/*.spec.ts`), bukan unit; menambahkannya
      // di sini hanya menurunkan sinyal dan membuat angka global menyesatkan.
      // Paraglide (`src/paraglide/**`) adalah kode hasil kompilasi sehingga tidak
      // dihitung. Wrapper *Fn.ts berisi guard + panggilan fungsi murni dan
      // diuji lewat E2E.
      include: ['src/server/**/*.ts', 'src/validations/**/*.ts'],
      exclude: ['src/server/**/*Fn.ts'],
      reporter: ['text', 'json-summary', 'json', 'html'],
      // Baseline nyata 2026-10-26 (tanpa wrapper Fn): stmts 65.04,
      // branch 55.57, fn 60.96, lines 67.56. Ambang diberi margin ~1 poin dan
      // harus dinaikkan saat tes bertambah — jangan diturunkan tanpa catatan.
      thresholds: {
        statements: 64,
        branches: 54,
        functions: 59,
        lines: 66,
      },
    },
  },
})
