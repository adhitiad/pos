# POS — Kasir, Buku Besar + Percetakan

Aplikasi point-of-sale untuk kasir, akuntansi buku besar, dan antrean cetak
(termasuk pemindaian printer). TanStack Start (React, file-router), PostgreSQL
via Prisma 7, login Google via Better Auth. Bahasa: en/id/zh/ko (Paraglide).

Indeks dokumentasi: [`docs/README.md`](docs/README.md) · PRD manusia:
[`docs/PRD.md`](docs/PRD.md) · kontrak agen:
[`docs/PRD-AI.md`](docs/PRD-AI.md) · status tugas:
[`docs/DAFTAR-TUGAS.md`](docs/DAFTAR-TUGAS.md) · performa:
[`docs/PERFORMA.md`](docs/PERFORMA.md) · lisensi: [`LICENSE`](LICENSE).

## Prasyarat

- Bun 1.x (`bun --version`)
- PostgreSQL lokal (service `postgresql-x64-18`, database `pos`)

## Mulai

```bash
bun install
# .env.local: DATABASE_URL, BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID/SECRET, OWNER_EMAILS
bun run db:migrate:deploy
bun run db:seed
bun --bun run dev   # http://localhost:3000
```

Setup Google OAuth langkah-demi-langkah: `docs/setup-google-oauth.md`.

## Deploy produksi (Vercel)

Provider produksi: **Vercel**. Alurnya `workflow_dispatch` → environment
`production` → `db:migrate:deploy` → deploy Vercel → smoke test. Auto-deploy
`main` dimatikan di `vercel.json` agar deploy tidak pernah mendahului migrasi.
Bootstrap pertama: lihat `docs/DEPLOY.md` §3.3. Repo memakai **GitHub Free**,
jadi required reviewer tidak dipakai; gate produksi adalah dispatch manual dari
`main` + branch policy `main`, bukan auto-deploy. Panduan lengkap:
[`docs/DEPLOY.md`](docs/DEPLOY.md).

| Provider | Konfigurasi repo | Status                     |
| -------- | ---------------- | -------------------------- |
| Vercel   | `vercel.json`    | produksi aktif             |
| Netlify  | `netlify.toml`   | cadangan, bukan alur aktif |

Langkah singkat:

1. Hubungkan repo ke Vercel sekali; biarkan root directory di root repo.
2. Isi Vercel Production env: `DATABASE_URL` (pooled), `BETTER_AUTH_URL`,
   `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `OWNER_EMAILS`,
   `KASIR_EMAILS` (opsional), `TRUSTED_ORIGINS`, `TRUST_PROXY=true`,
   `TRUST_PROXY_HOPS=1`, plus Cloudinary bila dipakai.
3. Isi secret environment `production`: `DATABASE_URL_UNPOOLED`, `VERCEL_TOKEN`,
   `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Di GitHub Free, lewati required
   reviewer dan andalkan dispatch manual; aktifkan reviewer hanya bila plan
   di-upgrade.
4. Daftarkan callback Google `https://<domain>/api/auth/callback/google`.
5. Jalankan `gh workflow run deploy-production.yml` dari `main` (setujui
   environment bila reviewer aktif), lalu pantau smoke test.
6. Jangan memakai `db:push` atau `db:seed` di produksi.

Preview PR memakai Vercel Preview environment dan database terpisah; jangan
mengarahkannya ke database produksi. Detail operasional:
[`docs/OPERASIONAL.md`](docs/OPERASIONAL.md).

## Env (`.env.local`)

| Key                                            | Isi                                                                    |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`                                 | `postgresql://postgres:postgres@localhost:5432/pos` (atau Neon pooled) |
| `DATABASE_URL_UNPOOLED`                        | koneksi langsung Neon (tanpa `-pooler`) untuk `db:push`/`db:seed`      |
| `BETTER_AUTH_URL`                              | `http://localhost:3000`                                                |
| `BETTER_AUTH_SECRET`                           | base64 32 byte                                                         |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`    | dari Google Cloud Console                                              |
| `OWNER_EMAILS`                                 | email owner, koma-separated — otomatis role OWNER                      |
| `KASIR_EMAILS`                                 | email kasir tetap, koma-separated (opsional)                           |
| `TRUSTED_ORIGINS`                              | origin produksi, koma-separated                                        |
| `SHADOW_DATABASE_URL`                          | DB kosong untuk cek drift (`db:migrate:drift`), opsional di lokal      |
| `TRUST_PROXY`                                  | `true` bila di belakang proxy tepercaya (pakai XFF)                    |
| `TRUST_PROXY_HOPS`                             | jumlah proxy yang menambahkan XFF; Vercel = `1`                        |
| `ENABLE_CSP`                                   | paksa CSP on/off; kosong = on saat produksi                            |
| `LOG_LEVEL`                                    | level pino; kosong = debug (dev) / info (prod)                         |
| `CLOUDINARY_CLOUD_NAME`                        | cloud name Cloudinary (server)                                         |
| `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | kredensial Cloudinary (server; rahasia)                                |
| `CLOUDINARY_FOLDER`                            | folder aset POS (default `pos/produk`)                                 |

## Rute & peran

| Rute                                                                                                                                                                 | Akses                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `/`                                                                                                                                                                  | publik, menu menyesuaikan peran                  |
| `/login`                                                                                                                                                             | publik (Google), sudah-login → `/kasir` atau `/` |
| `/pesanan`, `/privasi`, `/tentang`, `/tos`                                                                                                                           | publik (pesanan online & halaman legal)          |
| `/kasir`, `/dashboard`, `/dapur`                                                                                                                                     | OWNER, KASIR                                     |
| `/produk`, `/member`, `/member/$id`, `/bahan`, `/supplier`, `/printer`, `/buku-besar`, `/laporan`, `/laporan-belanja`, `/audit-log`, `/meja`, `/pengaturan`, `/user` | OWNER                                            |
| `/percetakan`, `/shift`, `/retur`, `/opname`                                                                                                                         | OWNER, KASIR                                     |
| `/api/auth/*`                                                                                                                                                        | Better Auth handler                              |
| `/api/v1/*`                                                                                                                                                          | REST (guard per peran + envelope), dipakai Expo  |

Role: `OWNER` (penuh), `KASIR` (transaksi), `MEMBER` (pelanggan login, tanpa akses kasir).

Matriks peran tunggal: `src/server/peran.ts` (`AKSES.semua` / `operasional` / `manajerial` + `punyaAkses`) — dipakai konsisten oleh guard server fn, REST, `beforeLoad`, dan `RelNav`.

Upload foto produk diproses lewat backend: server membuat **tanda tangan**
(`POST /api/v1/unggah`) dan klien mengunggah ke Cloudinary dengan tanda tangan
itu; unduh/hapus aset juga diproses server (`GET /api/v1/unggah/unduh`,
`DELETE /api/v1/unggah`). `CLOUDINARY_API_SECRET` tidak pernah dikirim ke klien.
Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` di
`.env.local`.

## Skrip

| Perintah                                                         | Fungsi                                                           |
| ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| `bun --bun run dev`                                              | dev server :3000                                                 |
| `bun --bun run build`                                            | production build                                                 |
| `bun run generate-routes`                                        | regenerasi route tree (wajib tiap tambah route)                  |
| `bun run db:migrate` / `db:migrate:deploy` / `db:migrate:status` | buat migration (dev), apply (dev/prod/CI), cek status            |
| `bun run db:migrate:drift`                                       | cek schema vs migration (butuh `SHADOW_DATABASE_URL`)            |
| `bun run db:generate` / `db:seed` / `db:studio`                  | generate client, seed data, studio                               |
| `bun run db:push`                                                | sinkron cepat tanpa migration (dev sekali-pakai)                 |
| `bun run db:reset`                                               | isi ulang data demo (setara `db:seed`)                           |
| `bun run lint` / `bun run format` / `bun run check`              | eslint / prettier --write / prettier --check                     |
| `bun run docs:sync` / `bun run docs:check`                       | perbarui / cek snapshot PRD dari `DAFTAR-TUGAS.md`               |
| `bun run perf:budget`                                            | cek anggaran bundle setelah `bun --bun run build`                |
| `bun run test:vitest` / `bun run test`                           | unit (vitest, `tests/vitest/**`, dotenv `.env.local`)            |
| `bun run test:e2e`                                               | smoke browser (playwright + chromium, `tests/e2e/**`, port 3100) |

Setelah mengubah `prisma/schema.prisma`: jalankan `bun run db:migrate` (dev) atau
`bun run db:migrate:deploy` (CI/prod) **sebelum** `bun run test` — unit test
pakai database yang sama, bukan mock.

## Aturan repo (ringkas)

- Perintah hanya `bun`/`bunx` — tanpa npm/npx/pnpm (lihat `.agents/rules/01-bun.md`).
- Gate tiap perubahan: `bunx tsc --noEmit` + `bun run lint` + `bun run check` +
  `bun run docs:check` + `bun run test` + `bun run test:e2e` + `bun --bun run build` +
  `bun run perf:budget`.
- **Unit test membersihkan tabel master** (produk/bahan/kategori/member/…) agar tiap
  suite mulai dari data kosong. Setelah `bun run test`, isi ulang data demo dengan
  `bun run db:reset` sebelum uji manual.
- UI: shadcn/ui + Tailwind v4, tambah komponen via `bunx shadcn@latest add -y <nama>`.
- Status tugas: `docs/DAFTAR-TUGAS.md`. Detail: `docs/README.md`.
- Kontrak API (web + Expo): `docs/API.md`. Aturan agen: `AGENTS.md`.

### Peringatan yang wajar (bukan bug)

| Peringatan                                                                             | Sumber                                                              | Arti                                                                                                                  |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `[MODULE_LEVEL_DIRECTIVE] … "use client"` saat `bun run build`                         | dependensi di `node_modules` (Radix, next-themes, sonner, TanStack) | Direktif CJS tak selalu dipertahankan saat bundling. Tidak memengaruhi hasil build; tak bisa difilter dari sisi repo. |
| `Accessing non-existent property 'replaceRouteChunk' …` saat `bun run generate-routes` | CLI `@tanstack/router-cli`                                          | Peringatan internal CLI, bukan kode repo.                                                                             |
| `injected env (N) from .env.local`                                                     | `dotenv-cli`                                                        | Info bahwa env file dev dimuat.                                                                                       |

> Semua peringatan di atas hilang otomatis bila dependensi terkait diperbarui ke
> versi yang sudah memperbaiki penerbitannya. Tak ada peringatan dari kode repo ini.

## Audit & status

- Status tugas: [`docs/DAFTAR-TUGAS.md`](docs/DAFTAR-TUGAS.md) (checkbox `[x]` =
  selesai, `[ ]` = backlog/blocked; jangan menganggap semua item selesai).
- Checklist uji manual web + backend (3–4 hari, sebelum lanjut ke app Expo):
  [`docs/TEST-MANUAL.md`](docs/TEST-MANUAL.md).
- Panduan integrasi mobile (Expo): [`docs/EXPO.md`](docs/EXPO.md).
- Laporan audit terbaru: [`audit-2026-10-19-0848.md`](audit-2026-10-19-0848.md).
  Riwayat: `audit-2026-10-18-2140.md`, `audit-2026-10-18.md`. Berkas ini adalah
  dokumen riwayat (dibaca dari README/DAFTAR-TUGAS) — **di-commit**, bukan di-ignore.
- Pindai kode mati: `bunx knip` — bersih (sisa hanya `prisma/*` generated yang aman diabaikan).
- Operasional produksi (backup/PITR Neon, uptime, deploy GitHub ke Vercel/Netlify): [`docs/OPERASIONAL.md`](docs/OPERASIONAL.md).

## Diagram Alur

Berikut diagram alur aplikasi lengkap (POS kasir, KDS dapur, pesanan online,
pembayaran, cetak struk, laporan, analytics, mode offline). Detail lengkap di
[`MYDIAGRAM.md`](./MYDIAGRAM.md).

![Diagram alur POS — kasir, dapur, pesanan online, pembayaran, cetak struk, laporan, analytics](docs/mydiagram.png)

## Struktur

```
src/
  routes/        halaman (kasir, produk, member, bahan, laporan, dapur, meja, pesanan…) + api/auth + api/v1/*
  server/        logika murni (transaksi, produk, member, kasir, auth) — bisa unit-test
  server/*Fn.ts  wrapper createServerFn (sering hanya ini yang diimpor route)
  validations/   semua skema Zod (satu sumber kebenaran input)
  types/         semua type/interface TypeScript (*.d.ts)
  hooks/         hook React bersama (useAntreanOffline, useFormKasir, use-mobile)
  lib/           auth, auth-client, cloudinary, kasir-store, kasir-total, csp, logger, outbox, printer
  components/    UI domain (kasir, produk, pesanan) + ui/ shadcn
  prisma/        schema.prisma, seed.ts
  messages/      en/id/zh/ko → compile ke src/paraglide
  tests/         unit (vitest/) + e2e (playwright/)
  docs/          DAFTAR-TUGAS, API, DEPLOY, execution-plan, setup-google-oauth
```

## Lisensi

MIT © 2026 **adhitiad**. Aplikasi POS untuk kasir, buku besar, dan percetakan;
lihat [`LICENSE`](LICENSE).
