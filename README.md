# POS — Kasir + Buku Besar

Aplikasi kasir (POS) + akuntansi buku besar. TanStack Start (React, file-router),
PostgreSQL via Prisma 7, login Google via Better Auth. Bahasa: en/id/zh/ko (Paraglide).

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

## Deploy via GitHub (Vercel / Netlify)

Deploy dilakukan dari repo GitHub, bukan CLI lokal. Push ke `main`, impor repo
sekali di provider, lalu setiap push berikutnya dibangun otomatis.

| Provider | Konfigurasi repo | Build                                                                               |
| -------- | ---------------- | ----------------------------------------------------------------------------------- |
| Vercel   | `vercel.json`    | `bun install`, `NITRO_PRESET=vercel bun run build`, runtime Bun 1.x                 |
| Netlify  | `netlify.toml`   | Bun 1.4.2, `bun run build`, publish `dist`, rewrite ke `/.netlify/functions/server` |

Langkah:

1. Push repo ke GitHub (privat disarankan). `.env.local`, `.vercel/`, dan
   `.netlify/` tidak ikut ter-commit.
2. Vercel: **Add New → Project → Import Git Repository**. Biarkan root directory
   di root repo; `vercel.json` mengatur install/build/framework. Netlify:
   **Add new site → Import an existing project → GitHub**; `netlify.toml`
   mengatur build, publish, dan rewrite.
3. Isi environment untuk Production (dan Preview bila dipakai):
   `DATABASE_URL` (Neon pooled), `DATABASE_URL_UNPOOLED` (direct, untuk migrasi),
   `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`, `OWNER_EMAILS`, `KASIR_EMAILS` (opsional),
   `TRUSTED_ORIGINS`, `TRUST_PROXY=true`, serta kredensial Cloudinary bila
   upload foto dipakai. `LOG_LEVEL=info` opsional.
4. Set `BETTER_AUTH_URL` ke URL produksi dan `TRUSTED_ORIGINS` ke origin yang
   sama; daftarkan callback Google `https://<domain>/api/auth/callback/google`.
5. Migrasi **tidak** dijalankan oleh build provider. Sebelum deploy yang
   membawa migration baru, jalankan `bun run db:migrate:deploy` dengan env
   produksi (`DATABASE_URL_UNPOOLED`). Skrip DB membaca `.env.local`, jadi isi
   sementara dengan kredensial Neon produksi atau jalankan dari CI yang menulis
   file itu dari secret. Jangan memakai `db:push` di produksi.

Preview deployment memakai env Preview; arahkan ke database terpisah bila tidak
ingin data produksi tersentuh. Detail operasional: `docs/OPERASIONAL.md`.

## Env (`.env.local`)

| Key                                            | Isi                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------- |
| `DATABASE_URL`                                 | `postgresql://postgres:postgres@localhost:5432/pos` (atau Neon pooled)    |
| `DATABASE_URL_UNPOOLED`                        | koneksi langsung Neon (tanpa `-pooler`) untuk `db:push`/`db:seed`         |
| `BETTER_AUTH_URL`                              | `http://localhost:3000`                                                   |
| `BETTER_AUTH_SECRET`                           | base64 32 byte                                                            |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`    | dari Google Cloud Console                                                 |
| `OWNER_EMAILS`                                 | email owner, koma-separated — otomatis role OWNER                         |
| `KASIR_EMAILS`                                 | email kasir tetap, koma-separated (opsional)                              |
| `TRUSTED_ORIGINS`                              | origin produksi, koma-separated                                           |
| `OWNER_EMAILS` / `KASIR_EMAILS`                | default peran dari email (dapat diubah manual di `/user` — manual menang) |
| `TRUST_PROXY`                                  | `true` bila di belakang proxy tepercaya (pakai XFF)                       |
| `ENABLE_CSP`                                   | paksa CSP on/off; kosong = on saat produksi                               |
| `LOG_LEVEL`                                    | level pino; kosong = debug (dev) / info (prod)                            |
| `CLOUDINARY_CLOUD_NAME`                        | cloud name Cloudinary (server)                                            |
| `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | kredensial Cloudinary (server; rahasia)                                   |
| `CLOUDINARY_FOLDER`                            | folder aset POS (default `pos/produk`)                                    |

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

| Perintah                                                         | Fungsi                                                |
| ---------------------------------------------------------------- | ----------------------------------------------------- |
| `bun --bun run dev`                                              | dev server :3000                                      |
| `bun --bun run build`                                            | production build                                      |
| `bun run generate-routes`                                        | regenerasi route tree (wajib tiap tambah route)       |
| `bun run db:migrate` / `db:migrate:deploy` / `db:migrate:status` | buat migration (dev), apply (dev/prod/CI), cek status |
| `bun run db:generate` / `db:seed` / `db:studio`                  | generate client, seed data, studio                    |
| `bun run db:push`                                                | sinkron cepat tanpa migration (dev sekali-pakai)      |
| `bun run db:reset`                                               | isi ulang data demo (setara `db:seed`)                |
| `bun run lint` / `bun run format` / `bun run check`              | eslint, prettier                                      |
| `bun run test`                                                   | unit (vitest, dotenv `.env.local` otomatis)           |
| `bun run test:e2e`                                               | smoke browser (playwright + chromium, port 3100)      |

Setelah mengubah `prisma/schema.prisma`: jalankan `bun run db:migrate` (dev) atau
`bun run db:migrate:deploy` (CI/prod) **sebelum** `bun run test` — unit test
pakai database yang sama, bukan mock.

## Aturan repo (ringkas)

- Perintah hanya `bun`/`bunx` — tanpa npm/npx/pnpm (lihat `.agents/rules/01-bun.md`).
- Gate tiap perubahan: `bunx tsc --noEmit` + `bun run lint` + `bun run check` + `bun run test` + `bun run test:e2e` + `bun --bun run build`.
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

- Status tugas: [`docs/DAFTAR-TUGAS.md`](docs/DAFTAR-TUGAS.md) (SEMUA item audit selesai;
  temuan terbaru dicatat sebagai backlog `[ ]`).
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
  tests/         unit (*.test.ts) + e2e (playwright)
  docs/          DAFTAR-TUGAS, API, execution-plan, setup-google-oauth
```
