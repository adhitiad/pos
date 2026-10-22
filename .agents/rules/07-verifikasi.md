# WAJIB: Verifikasi Akhir Tugas

> Tugas belum selesai sebelum verifikasi hijau. Jalankan **setiap akhir tugas**
> pengodean, dalam urutan ini.

## Urutan wajib

1. **Typecheck** — `bunx tsc --noEmit`.
2. **Lint** — `bun run lint`.
3. **Prettier** — `bun run check`. Bila merah: `bun run format`, lalu ulangi dari
   langkah 1.
4. **Sinkronisasi dokumen** — `bun run docs:sync`, lalu `bun run docs:check`.
5. **Unit test** — `bun run test:vitest` (DB Postgres nyata; reset dengan
   `bun run db:reset` setelahnya bila perlu uji manual).
6. **E2E** — `bun run test:e2e` bila menyentuh route, guard, atau endpoint.
7. **Build** — `bun --bun run build`.
8. **Anggaran performa** — `bun run perf:budget` setelah build.

Untuk perubahan schema, jalankan `bun run db:migrate` (dev) sebelum test. Jangan
memakai `db:push` untuk perubahan yang akan di-commit.

## Ketentuan

- Semua perintah lewat `bun`/`bunx` (lihat `01-bun.md`). Satu langkah merah =
  berhenti, perbaiki, ulangi dari langkah 1.
- Unit test ada di `tests/vitest/**`; e2e di `tests/e2e/**` dan memakai port
  `3100`. Jangan mengarahkan e2e ke dev server `3000`.
- Logika yang bisa diuji diletakkan di `src/server/*.ts` murni; wrapper `*Fn.ts`
  tipis (lihat `12-testing.md`).
- Laporkan hasil setiap langkah di akhir pesan kerja (lolos/gagal + file yang
  dites).
- Jangan mengklaim hijau berdasarkan hasil gate lama bila file berubah setelah
  gate dijalankan.
