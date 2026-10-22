# WAJIB: Testing — Unit & E2E

> Kepercayaan tanpa bukti = asumsi. Setiap logika uang & jurnal harus punya test.

## Lapisan

| Jenis | Runner | Lokasi | Perintah |
| --- | --- | --- | --- |
| Unit (logika murni, zod, hitungan) | vitest | `tests/vitest/**/*.test.ts(x)` | `bun run test:vitest` |
| E2E smoke (halaman render, guard redirect, endpoint hidup) | playwright + chromium | `tests/e2e/**/*.spec.ts` | `bun run test:e2e` |
| Uji DB manual (skrip sekali-pakai) | bun | `C:\Users\humas\AppData\Local\Temp\opencode\` | `bunx dotenv run -f .env.local -- bun <skrip>` + `bun run db:seed` sesudahnya |

## Aturan

- **WAJIB** menaruh logika yang bisa diuji di `src/server/*.ts` murni (tanpa
  `createServerFn`, tanpa `getRequestHeaders`) — wrapper `*Fn.ts` tipis saja.
  Contoh: `hitungRedeem()` diuji tanpa DB.
- **WAJIB** menjalankan `bun run test:vitest` tiap menyentuh hitungan
  uang/poin/pajak/jurnal.
- **WAJIB** menjalankan `bun run test:e2e` tiap menyentuh route/guard/endpoint.
  Playwright memakai port `3100`; di CI `reuseExistingServer: false`, di lokal
  server yang sudah hidup di `3100` boleh dipakai ulang.
- Test e2e DILARANG butuh login Google asli — uji state tanpa-sesi
  (redirect `/login`, tombol render, endpoint `get-session` 200).
- Skrip uji DB manual DILARANG di-commit ke repo; selalu reset dengan `db:seed`.
- Browser e2e: chromium via `bunx playwright install chromium` (sekali per mesin).
- Jangan menganggap 429 analytics sebagai kegagalan aplikasi; filter hanya
  respons analytics yang memang diharapkan (lihat `tests/e2e/auth.spec.ts`).
