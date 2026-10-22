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
      // Ukur logika yang memang diuji unit. Komponen/rute/paraglide belum punya
      // unit test dan membuat angka global menyesatkan (34% saat audit CI).
      // Wrapper *Fn.ts diuji lewat E2E, bukan unit; menambahkannya di sini hanya
      // menurunkan sinyal karena isinya guard + panggilan fungsi murni.
      include: ['src/server/**/*.ts', 'src/validations/**/*.ts'],
      exclude: ['src/server/**/*Fn.ts'],
      reporter: ['text', 'json-summary', 'json', 'html'],
      // Baseline nyata 2026-10-21 (tanpa wrapper Fn): stmts 66.11,
      // branch 55.98, fn 59.90, lines 68.47. Ambang diberi margin kecil dan
      // harus dinaikkan saat tes bertambah — jangan diturunkan tanpa catatan.
      thresholds: {
        statements: 63,
        branches: 53,
        functions: 57,
        lines: 65,
      },
    },
  },
})
