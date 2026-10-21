# WAJIB: Testing — Unit & E2E

> Kepercayaan tanpa bukti = asumsi. Setiap logika uang & jurnal harus punya test.

## Lapisan

| Jenis                                                      | Runner              | Lokasi                                        | Perintah                                                                      |
| ---------------------------------------------------------- | ------------------- | --------------------------------------------- | ----------------------------------------------------------------------------- |
| Unit (logika murni, zod, hitungan)                         | vitest              | `tests/*.test.ts`                             | `bun run test`                                                                |
| E2E smoke (halaman render, guard redirect, endpoint hidup) | playwright+chromium | `tests/e2e/*.spec.ts`                         | `bun run test:e2e`                                                            |
| Uji DB manual (skrip sekali-pakai)                         | bun                 | `C:\Users\humas\AppData\Local\Temp\opencode\` | `bunx dotenv-cli -e .env.local -- bun <skrip>` + `bun run db:seed` sesudahnya |

## Aturan

- **WAJIB** menaruh logika yang bisa diuji di `src/server/*.ts` murni (tanpa
  `createServerFn`, tanpa `getRequestHeaders`) — wrapper `*Fn.ts` tipis saja.
  Contoh: `hitungRedeem()` diuji di `tests/redeem.test.ts` tanpa DB.
- **WAJIB** menjalankan `bun run test` tiap menyentuh hitungan uang/poin/pajak/jurnal.
- **WAJIB** menjalankan `bun run test:e2e` tiap menyentuh route/guard/endpoint.
  Playwright memakai dev server sungguhan (`reuseExistingServer: true`).
- Test e2e DILARANG butuh login Google asli — uji state tanpa-sesi
  (redirect `/login`, tombol render, endpoint `get-session` 200).
- Skrip uji DB manual DILARANG di-commit ke repo; selalu reset dengan `db:seed`.
- Browser e2e: chromium via `bunx playwright install chromium` (sekali per mesin).
