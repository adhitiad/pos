# PRD-AI — Kontrak Kerja Agen untuk POS

> **Untuk LLM/agen:** baca file ini setelah [`../AGENTS.md`](../AGENTS.md), lalu
> [`DAFTAR-TUGAS.md`](DAFTAR-TUGAS.md) dan aturan yang relevan di
> [`../.agents/rules/`](../.agents/rules/). PRD manusia ada di [`PRD.md`](PRD.md).
>
> Jangan mengarang status, endpoint, atau hasil deploy. Sumber kebenaran ada di
> urutan bagian 1. Blok `AUTO:PRD-AI` dihasilkan otomatis; jangan edit manual.

## 1. Hirarki sumber kebenaran

Bila dua dokumen bertentangan, urutan yang menang adalah:

1. **Kode + `prisma/schema.prisma` + migration** — perilaku runtime sebenarnya.
2. **`docs/DAFTAR-TUGAS.md`** — status pekerjaan, blocked/partial, kriteria.
3. **`docs/API.md`** — kontrak REST/DTO yang dipakai web + Expo.
4. **`docs/PRD.md`** — niat produk, persona, ruang lingkup, NFR.
5. **`docs/PRD-AI.md`** — peta kerja agen (file ini).
6. **`.agents/rules/**`** — aturan wajib yang mengikat implementasi.
7. **`docs/*.md` lain** — detail topik; tidak boleh melawan poin 1–5.

Jangan menyalin angka status ke banyak tempat. Angka di PRD dihasilkan dari
`DAFTAR-TUGAS.md` oleh `bun run docs:sync`.

## 2. Stack dan entrypoint

| Bagian        | Lokasi                                                                         |
| ------------- | ------------------------------------------------------------------------------ |
| Web/router    | `src/routes/**` (TanStack Start file-router), `src/router.tsx`, `src/start.ts` |
| UI            | `src/components/**`, `src/components/ui/**` (shadcn), Tailwind v4              |
| Logika domain | `src/server/*.ts` (murni, bisa diuji), wrapper `src/server/*Fn.ts`             |
| Validasi      | `src/validations/**` (Zod)                                                     |
| REST          | `src/routes/api/v1/**` — guard + envelope saja                                 |
| Data          | `prisma/schema.prisma`, `prisma/migrations/**`, `src/db.ts`                    |
| Auth          | `src/lib/auth.ts`, `src/lib/auth-client.ts`, Better Auth + Prisma adapter      |
| i18n          | `messages/{en,id,zh,ko}.json` → `src/paraglide/**`                             |
| Unit/e2e      | `tests/vitest/**`, `tests/e2e/**`                                              |
| Deploy        | `vercel.json`, `.github/workflows/deploy-production.yml`                       |
| Operasional   | `docs/DEPLOY.md`, `docs/OPERASIONAL.md`, `docs/PERFORMA.md`                    |

Perintah wajib `bun`/`bunx`; jangan memakai npm/npx/pnpm.

## 3. Invariant domain (jangan dilanggar)

- **Uang:** integer rupiah di semua DTO dan perhitungan; `Decimal(14,2)` hanya di
  kolom DB. Jangan memakai float untuk uang.
- **ID:** `cuid()`. Validasi ID masuk dengan Zod sebelum query.
- **Transaksi:** posting transaksi harus atomik; stok, jurnal, nomor struk, dan
  audit tidak boleh terpisah. Jalur panas mengikuti `postingTransaksi.ts` dan
  `penomoran.ts` (hindari `count()` di dalam transaksi tulis).
- **Diskon:** ambang diskon manual KASIR dibaca server dari
  `diskon_kasir_maks_persen` (default 10%, 0–100). KASIR di atas ambang ditolak
  dengan galat domain; OWNER boleh melewati tetapi diskon di atas ambang wajib
  diaudit. Jangan pernah memakai ambang dari body/klien.
- **Waktu transaksi:** `waktuKlien` hanya metadata offline dan wajib dalam
  ±24 jam dari jam server; laporan/filter resmi memakai `tanggal`/`diterimaPada`
  yang diisi server. `dibuatOffline=true` wajib disertai `idempotencyKey`.
- **Jurnal:** setiap transaksi yang memengaruhi uang harus menghasilkan jurnal
  seimbang. Jangan menulis jurnal dari klien.
- **Stok:** kurangi lewat operasi teragregasi/atomik; jangan loop tulis per item.
  Cegah oversell dengan validasi snapshot + update bersyarat.
- **Pesanan online:** pembuatan pesanan tidak boleh memotong stok, memberi poin,
  atau menulis jurnal/pembayaran. Efek itu dijalankan tepat sekali saat
  `dibayarPada` diisi (manual atau webhook HMAC). `statusPesanan` tetap alur
  dapur; jangan memakai `LUNAS` sebagai penanda pembayaran online.
- **Batas input publik:** item pesanan maks 100 baris, 20 modifier/baris, qty
  ≤ 9.999; body JSON publik punya batas eksplisit. Jangan menambah loop tak
  terbatas dari input klien.
- **Peran:** gunakan `src/server/peran.ts` dan guard `requireOwner`/
  `requireKasir`; REST memakai guard yang sama. Jangan membuat matriks peran
  baru di route.
- **Navigasi per peran:** `DashboardLayout`/`RelNav` wajib menerima `peran`
  konkret. Jangan mengirim `undefined`; filter navigasi mati dan menu manajerial
  bocor ke KASIR.
- **Checkout kasir:** tombol Bayar hanya aktif bila keranjang terisi, tipe
  pesanan dipilih, shift terbuka, dan pembayaran lengkap (tunai ≥ total atau
  split pas). Sentinel tipe pesanan `DINE_IN`/`PICKUP` hanya nilai form dan
  tidak boleh dikirim sebagai `deliveryId` ke server.
- **Auth web vs native:** web hanya memakai cookie httpOnly; body respons web
  tidak boleh memuat bearer token. Token bearer hanya dari
  `/api/v1/auth-native`, setelah `aud` Google ID token cocok dengan
  `GOOGLE_NATIVE_CLIENT_ID` yang berbeda dari client web. Jangan pernah
  memperlakukan header `x-client` sebagai bukti klien. Jalur langsung Better
  Auth `/sign-in/social` dengan `idToken` harus tetap diblokir untuk request
  publik, `session.token` tidak boleh muncul di `/get-session` atau
  `/list-sessions`, dan header `set-auth-token` tidak boleh dikirim ke klien
  web.
- **Single-tenant:** keputusan produk saat ini satu toko per deployment; tidak
  ada `tokoId`. Jangan menambahkan `tokoId` sebagian. Multi-tenant hanya boleh
  dimulai setelah keputusan produk eksplisit, dengan migrasi data, scope query,
  guard per toko, dan test isolasi.
- **Cetak ulang struk:** buat job STRUK melalui transaksi atomik; OWNER tidak
  dibatasi, KASIR maksimal tiga cetak per transaksi. Penegakan batas harus di
  server, bukan hanya dengan menyembunyikan tombol UI.
- **Privasi analytics:** `userId`/IP/path/OS/klasifikasi/lokasi diturunkan di
  server, bukan dipercaya dari body/header klien. `device-visit` hanya menerima
  token HMAC server; deviceId di-upsert per perangkat, dan metadata dari body
  diabaikan.
- **Ekspor CSV:** sanitasi formula (`= + - @`, termasuk spasi/kontrol di depan)
  dilakukan **sebelum** quoting; jangan hanya mengandalkan tanda kutip.
- **Error:** error DB mentah tidak boleh ke klien. Gunakan `GalatDomain` +
  `terjemahGalat`/`apiError`, kirim pesan aman + `ref` log.
- **API:** fitur data baru wajib lewat endpoint di `docs/API.md`; route REST
  hanya guard → validasi → panggil fungsi murni → envelope.
- **Mobile:** Expo dilarang mengakses Prisma atau meniru hitungan server.
- **Migrasi:** produksi hanya `bun run db:migrate:deploy`; `db:push`/`db:seed`
  dilarang di produksi.

## 4. Kinerja — anggaran yang mengikat

Detail baseline dan prosedur ada di [`PERFORMA.md`](PERFORMA.md).

| Area                    | Anggaran                                                   |
| ----------------------- | ---------------------------------------------------------- |
| Core Web Vitals         | LCP p75 ≤ 2,5 s; INP p75 ≤ 200 ms; CLS ≤ 0,1               |
| API baca                | p95 ≤ 500 ms                                               |
| API tulis               | p95 ≤ 1 s                                                  |
| `/api/health`           | ≤ 200 ms                                                   |
| Aset klien total (gzip) | ≤ 600 KB                                                   |
| Aset terbesar (gzip)    | ≤ 160 KB                                                   |
| CSS (gzip)              | ≤ 50 KB                                                    |
| Query daftar            | wajib `take`/pagination; tidak boleh menarik seluruh tabel |
| Jalur transaksi         | tanpa N+1; update stok teragregasi; index tersedia         |

Aturan implementasi:

- Pilih kolom dengan `select`; jangan over-fetch.
- Agregasi di DB (`groupBy`, `aggregate`) untuk laporan; jangan agregasi seluruh
  tabel di JS.
- Tambah `@@index` untuk FK/filter baru, lalu verifikasi `EXPLAIN` pada data
  realistis.
- Gunakan `lazyRouteComponent`/code-split untuk halaman berat.
- Setelah `bun --bun run build`, jalankan `bun run perf:budget`; over budget =
  gate merah.
- Jangan mengejar optimasi tanpa pengukuran; catat baseline sebelum/sesudah.

## 4.1. Standar tabel antarmuka

- Tabel daftar menggunakan page size awal 10 dan pilihan 25/50/100 melalui
  komponen shadcn/ui; data daftar tetap dibatasi sesuai kontrak dan query server.
- Sediakan pencarian, sorting, dan filter yang relevan pada tiap daftar. Filter
  UI hanya membantu eksplorasi dan tidak menggantikan guard otorisasi server.
- Tabel input/detail yang perlu menjaga konteks bisnis (mis. form opname) boleh
  mempertahankan nilai semua baris saat paginasi; jangan menghilangkan data
  tersembunyi dari payload simpan.

## 5. Keamanan dan operasional

- Rate limit endpoint publik/analytics; jangan hanya mengandalkan pembatas di
  route bila server function juga bisa dipanggil langsung. Endpoint publik
  berisiko (`device-visit`) memakai batas per IP **dan** batas global.
  Token analytics ditandatangani server, terikat User-Agent, dan kedaluwarsa.
- Rate limit memakai bucket bersama yang atomik di PostgreSQL: default 100
  permintaan/menit per kunci, pembersihan kunci idle 30 menit; kunci umumnya
  per IP+endpoint, sedangkan endpoint printer/terautentikasi per pengguna.
  Saat `TRUST_PROXY=true`, `X-Forwarded-For` dibaca dari kanan sebanyak
  `TRUST_PROXY_HOPS` (Vercel = 1); jangan memakai entri paling kiri yang bisa
  dipalsukan klien. Jangan mengklaim kapasitas 1.000 pengguna tanpa hasil uji
  beban yang tercatat.
- Rate limit Better Auth wajib memakai bucket Postgres yang sama
  (`customStorage` → `batasi`), bukan storage memory per-proses: `/sign-in*`
  5/menit, `/sign-up*` 3/menit, `/callback*` 20/menit. `TRUST_PROXY` otomatis
  aktif bila `VERCEL=1`; jangan mengembalikan default mati tanpa alasan.
- Dine-in publik **hanya** menerima `mejaToken` QR bertanda tangan; `mejaId`
  mentah tidak boleh masuk schema publik. Pengecualian satu-satunya adalah
  finalisasi draft oleh staf (`/api/v1/pesan-dinein/{id}/finalisasi`) yang
  boleh mengirim `mejaId` opsional untuk meja tanpa QR, dengan verifikasi meja
  aktif di server dan guard `OWNER`/`KASIR`.
- Upload Cloudinary: `max_file_size` dan folder wajib ikut ditandatangani
  server; klien tidak boleh menentukan batas ukuran sendiri.
- Route cron (`/api/cron/*`) wajib membandingkan `CRON_SECRET` dengan
  `timingSafeEqual` dan membalas 503 bila secret kosong.
- Perubahan peran mencabut seluruh sesi user dalam transaksi yang sama;
  sinkronisasi peran saat login mencabut sesi lama tetapi mempertahankan sesi
  baru. Owner dapat mencabut semua sesi dari `/user`. Token yang dicabut harus
  langsung 401 pada request berikutnya.
- Rahasia hanya di `.env.local` (lokal) atau GitHub Environment/Vercel
  (produksi). Jangan pernah commit `.env*` selain `.env.example`.
- CSP/headers mengikuti `src/lib/csp.ts` dan konfigurasi Nitro.
- Deploy produksi: `workflow_dispatch` → environment `production` → migrasi →
  status migrasi → Vercel deploy → smoke test.
- Jangan mengklaim deploy/CI berhasil tanpa URL run atau bukti runtime.
- Gate commit/push/deploy: lihat `.agents/rules/15-git-dan-deploy.md`
  (**"ok Commit"**, **"ok push"**, izin deploy eksplisit).

## 6. Protokol perubahan

Untuk setiap tugas:

1. Baca `AGENTS.md`, aturan terkait, `DAFTAR-TUGAS.md`, dan `API.md` bila
   menyentuh data.
2. Cari implementasi yang ada sebelum membuat pola baru; ikuti konvensi repo.
3. Jika perilaku/fitur berubah: perbarui `PRD.md` (niat/ruang lingkup) dan
   `PRD-AI.md` (peta teknis/invariant) pada bagian yang relevan.
4. Jika status tugas berubah: ubah `DAFTAR-TUGAS.md`; jangan mencentang tanpa
   bukti gate.
5. Jika kontrak API berubah: perbarui `API.md` dalam PR yang sama.
6. Jika aturan/arsitektur berubah: tambahkan/catat di `.agents/rules/`.
7. Jalankan `bun run docs:sync`, lalu gate di bawah. Jangan commit dokumen PRD
   yang masih basi.

## 7. Definisi selesai (gate)

Urutan minimal untuk perubahan kode:

```bash
bunx tsc --noEmit
bun run lint
bun run check
bun run docs:check
bun run test:vitest
bun run test:e2e
bun --bun run build
bun run perf:budget
```

- Unit test memakai DB Postgres nyata; setelah test, reset data demo dengan
  `bun run db:reset` sebelum uji manual.
- E2E memakai port `3100`; jangan mengarahkan ke dev server `3000`.
- Perubahan schema: `bun run db:migrate` (dev) sebelum test; deploy memakai
  `db:migrate:deploy`.
- Bila salah satu gate merah, perbaiki dan ulangi dari awal; jangan menyimpulkan
  "hampir selesai".

## 8. Peta dokumen

```text
AGENTS.md
  → docs/DAFTAR-TUGAS.md
  → .agents/rules/** (01–16)
  → docs/PRD.md
  → docs/PRD-AI.md
  → docs/API.md, DEPLOY.md, OPERASIONAL.md, PERFORMA.md, TEST-MANUAL.md,
    GITHUB-SETUP.md, EXPO.md, BUKTI-KODE.md
```

Dokumen indeks: [`README.md`](README.md). Aturan commit/deploy:
[`../.agents/rules/15-git-dan-deploy.md`](../.agents/rules/15-git-dan-deploy.md).
Aturan dokumen/PRD: [`../.agents/rules/16-prd-dan-dokumen.md`](../.agents/rules/16-prd-dan-dokumen.md).

## 9. Status dan risiko yang diketahui

Angka pasti ada di snapshot. Risiko yang harus dibaca sebelum mengambil tugas:

- Secret produksi (`DATABASE_URL_UNPOOLED`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
  `VERCEL_PROJECT_ID`) belum tentu terisi; cek environment, jangan berasumsi.
- GitHub Project belum dibuat karena token belum punya scope `project`.
- Private vulnerability reporting GitHub mengembalikan 404 untuk repo private
  ini; kanal privat mengandalkan maintainer.
- `bun run db:migrate:drift` lokal membutuhkan `SHADOW_DATABASE_URL`; CI memakai
  shadow DB port 5433.
- `bun audit` dapat exit 1 karena advisory transitive `postcss-selector-parser`
  lewat `@tailwindcss/typography`; ini diketahui, bukan alasan mengabaikan audit
  baru.
- Baseline performa saat ini berasal dari build lokal, bukan produksi.

## 10. Snapshot otomatis

<!-- AUTO:PRD-AI:START -->

> **Snapshot otomatis.** Dihasilkan oleh `bun run docs:sync`; jangan edit manual.

- **Item selesai:** 393/405 (97%)
- **Item terbuka:** 12
- **Terblokir / sebagian:** 3 / 1
- **Cakupan:** 31 rute · 64 file route REST · 42 model · 28 migrasi
- **Test:** 57 file unit · 8 file e2e
- **Dokumen**: 19 berkas di `docs/`

### Rute halaman terdeteksi

- `/`
- `/audit-log`
- `/bahan`
- `/buku-besar`
- `/dapur`
- `/dashboard`
- `/kasir`
- `/laporan`
- `/laporan-belanja`
- `/laporan-pajak`
- `/login`
- `/meja`
- `/member`
- `/member/$id`
- `/notifikasi`
- `/opname`
- `/pengajuan`
- `/pengaturan`
- `/percetakan`
- `/pesanan`
- `/pesanan-review`
- `/printer`
- `/privasi`
- `/produk`
- `/retur`
- `/review-transaksi`
- `/shift`
- `/supplier`
- `/tentang`
- `/tos`
- `/user`

### Tugas terbuka

- `SEC-26 (Low / future, A01)`
- `CICD-02` · terblokir
- `CICD-11` · sebagian
- `CICD-15` · terblokir
- `CICD-17`
- `CICD-25` · terblokir
- `MFA untuk OWNER belum ada. **Blocker:** butuh keputusan prod`
- `MFA OWNER`
- `Sisa 9 file > 397 baris`
- `Uji beban di staging/produksi`
- `PITR/uptime/error monitoring`
- `bun run test:load — k6 belum terpasang di mesin pengembangan`

<!-- AUTO:PRD-AI:END -->
