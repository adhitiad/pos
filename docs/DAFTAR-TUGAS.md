# DAFTAR TUGAS — POS

> Centang `[x]` bila selesai. File ini sumber utama status tugas; gunakan bahasa Indonesia yang jelas agar mudah dibaca oleh manusia dan AI. Setiap perubahan kode wajib lolos `tsc --noEmit`, `lint`, `check`, `docs:check`, `test:vitest`, `test:e2e` (bila route/guard/endpoint berubah), `build`, dan `perf:budget` sebelum dicentang.
>
> Snapshot status di [`PRD.md`](PRD.md) dan [`PRD-AI.md`](PRD-AI.md) dihasilkan
> dari file ini oleh `bun run docs:sync`. Jangan menyalin status manual ke PRD.

---

## DONE — Sudah Selesai

### Inisialisasi & Fondasi

- [x] Scaffold TanStack Start + add-on (ESLint, Compiler, DB, Form, Paraglide, Shadcn, T3Env, Table, Store, Query)
- [x] Fix `bun install` EBUSY + verifikasi build
- [x] Skema DB: auth, Kategori, Bahan, Produk, ProdukBahan, Member, Delivery, Transaksi
- [x] Buku besar: Akun, Jurnal, JurnalDetail + seed 7 CoA
- [x] Input pengeluaran owner di buku besar: dropdown jenis akun (belanja, operasional kasir, ambil owner, pembayaran utang, operasional toko, lainnya) + jurnal berimbang via `catatPengeluaranFn` (owner-only); 5 akun CoA baru (2200, 5200, 5300, 5400, 5900) + migrasi dan seed.
- [x] `postingTransaksi` atomik + uji nyata ke DB
- [x] Auth Google-only + prismaAdapter
- [x] Role enum OWNER/KASIR/MEMBER + guard + owner enrollment
- [x] i18n en/id/zh/ko + hapus de
- [x] Halaman login + kasir + buku besar
- [x] Guard anti-loop antar-role + link home per peran

### Fitur POS (POS-13 s/d POS-21)

- [x] POS-13 Upload foto produk langsung ke Cloudinary dari browser (unsigned preset, JPG/PNG/WebP ≤2MB, thumbnail tabel + preview form)
- [x] POS-14 Member CRUD (/member + redeem poin di kasir, 1 poin = Rp100)
- [x] POS-17 Cross-platform sign-in (opsional) — rencana di `docs/POS-17-cross-platform-signin.md`
- [x] POS-19 Vitest e2e (posting, jurnal balance)
- [x] POS-20 Dokumentasi API server function
- [x] POS-21 Manajemen role user (/user) — OWNER ubah role OWNER/KASIR/MEMBER, sinkronisasi dari `.env.local`

### UX & Desain

- [x] shadcn lengkap: card, sidebar, navigation-menu, avatar, accordion, carousel, table, input-group, separator, badge, dialog, sheet, skeleton, sonner, checkbox, tooltip (+ betulkan lint file registry)
- [x] Antislop UI + layout-mobile: rules 13 & 14, tap target 44px (stepper kasir, CTA, switcher bahasa), padding mobile p-4/sm:p-6, nav wrap, grid kasir lg:2kol, empty state + aksi, e2e viewport 390px (tanpa scroll-X, CTA ≥44px)
- [x] Phase 7: logo brand (public/logo.svg, home + struk print) + kasir offline (outbox IndexedDB, banner luring, kirim-otomatis saat online, jurnal deferred ikut sync)
- [x] Sidebar shadcn (icon-collapsible desktop) + bottom-nav mobile; Card (panel produk/member/bahan, neraca); Accordion rincian per akun di buku-besar. Sheet & Tooltip dipakai internal sidebar.tsx.
- [x] Breadcrumb (`NavigasiRemah`) di 4 halaman owner; Badge status produk, menipis, qty keranjang; Separator panel bayar/keranjang/ledger; Slider tukar-poin (0..saldo); Skeleton header-user; Dialog (`HapusDialog`) konfirmasi hapus + toast `sonner`; Textarea catatan transaksi
- [x] Redesain kasir ala referensi: rel ikon + bottom-nav mobile, pil kategori + cari, grid foto (fallback inisial, badge qty), panel draft sticky, kartu metode bayar + ikon, chip penjualan hari ini (real), pecah <397 baris (RelNav/ProdukGrid/PanelBayar/Struk/AntreanPanel/MetodeBayar/RingkasanBayar)
- [x] Tech-debt: pecah `src/routes/produk.tsx` (593 baris) → 5 file, masing-masing <397 baris (produk.tsx 315, ProdukForm 256, ProdukTabel 68, ProdukKategori 63, ProdukHapusDialog 28)
- [x] UX polish: stepper qty di ProdukGrid + PanelBayar (tambah/kurangi/hapus), tombol kosongkan keranjang, toast feedback real-time (add/remove/clear/success/error) mengganti inline alert berwarna tetap, skeleton loading di login, struk cetak dengan tombol salin nomor + ikon check tema-hijau
- [x] Status global TanStack Router: halaman loading, 404 dengan tautan beranda, dan error dengan aksi coba lagi/beranda; pesan tersedia dalam 4 bahasa dan dicakup tes unit.
- [x] Standar tabel daftar: default 10 baris, pilihan 25/50/100, paginasi shadcn/ui, pencarian, sorting, dan filter konteks pada tabel produk, bahan, dapur, member, retur, buku besar, laporan, user, shift, meja, opname, printer, supplier, pembelian, audit, dan transaksi dasbor.
- [x] Tautan pesanan online hanya ditampilkan untuk pengunjung/MEMBER; disembunyikan dari OWNER/KASIR pada header dan footer, dengan E2E kedua peran.
- [x] Pilihan ukuran kertas thermal di `/pengaturan`: 57×30, 57×37, 58×37, 58×40, 57×47, 58×50, 80×40, 80×47, 80×50, 80×60, 80×70, dan 80×80 mm; digunakan pada struk ESC/POS, cetak browser, dan PDF.
- [x] Dark/light theme toggle (next-themes ThemeProvider + ThemeToggle di Header & kasir nav), locale switcher → dropdown dengan bendera negara
- [x] Landing & identitas dinamis: hero/alur/segmen/CTA redesign (palet brand teal+brass, mobile-first, tanpa metrik palsu); owner unggah ikon (file-only → Cloudinary) dan judul app dipakai di header/footer/struk/tab; `/api/v1/app-icon` membuat SVG favicon/manifest otomatis, `/api/v1/identitas` untuk web+Expo
- [x] Printer perangkat: pindai otomatis Web Serial setelah login OWNER/KASIR, objek koneksi cache memori+`sessionStorage`, metadata perangkat (jalur, vendor, serial, produk) disimpan ke DB untuk akun OWNER/KASIR via `POST /api/v1/printer/perangkat`; dialog pindai cepat di header + `/printer`; kontrak siklus sesi Expo di `docs/EXPO.md`; unit test `tests/vitest/ikon.test.ts`
- [x] `/printer`: label port USB/Bluetooth/WiFi + jalur perangkat terdeteksi (USB atau serial virtual Bluetooth/WiFi), kolom koneksi di tabel; e2e memeriksa label `Dari port: USB`
- [x] Test print struk dari quick scan & `/printer`: dialog struk format asli dengan pesanan/member dummy, opsi cetak otomatis ESC/POS atau manual lewat dialog browser, tombol lewati; helper `src/lib/struk-uji.ts`, unit test `tests/vitest/struk-uji.test.ts`
- [x] DB printer perangkat: `Printer.userId` + `koneksi` + `vendorId`/`vendorName`/`serialNumber`/`productName`/`dipindaiPada`, upsert per `(userId, perangkat)`, endpoint OWNER/KASIR, migrasi `20261021000000_printer_device_identity`
- [x] `GET /api/health`: status `{ database: "ok"|"gagal", app: "healthy"|"degraded" }`, HTTP 503 saat database gagal, rate limit 60/menit; docs API/operasional + e2e

### Dashboard

- [x] Halaman dasbor /dashboard — guard OWNER+KASIR (`dashboardDataFn` pakai `requireKasir`), 4 stat card (penjualan hari ini, produk aktif, member, stok menipis), aksi cepat buka kasir/kelola produk, layout konsisten, e2e guard + mobile 390px
- [x] Layout dashboard bersama `DashboardLayout` (RelNav + Header + NavigasiRemah + container seragam: max-w-6xl, space-y-5, p-3 sm:p-6, pb-28 md:pb-6) dipakai /kasir /dashboard /produk /buku-besar /bahan /member /user — hapus celah ~100svh (SidebarProvider tak lagi bersarang di RelNav), satukan breakpoint sidebar/bottom-nav ke md, judul + slot `aksi` konsisten; verifikasi tsc + lint + build + 27 unit test + e2e mobile 390px
- [x] Sidebar tambah entri /dashboard (Dasbor, OWNER+KASIR) + fitur dasbor: keuntungan kotor & bersih hari ini (hitung COGS dari resep bahan), chart transaksi per jam, tabel transaksi hari ini dengan pengurutan (baru/lama, besar/kecil), i18n 4 bahasa; verifikasi tsc + lint + build + 27 unit test + e2e smoke + mobile

### API & Laporan

- [x] API-first: envelope + guard `src/server/api.ts`, REST `/api/v1/*` (kasir-data, transaksi, produk, kategori, member, laporan), `docs/API.md` + taut silang AGENTS/README/rules/docs
- [x] Rate limit bersama berbasis token bucket PostgreSQL: kapasitas default 100 permintaan dengan isi ulang 100/menit per kunci, bucket idle dibersihkan setelah 30 menit, atomik lintas instance; unit test untuk refill, batas paralel, dan bucket per pengguna printer.
- [x] Fase 0 — Fondasi lintas-fitur: Model `Pengaturan` (key-value), halaman `/pengaturan` dengan toggle `mode_fnb`, `Transaksi.kasirId`, `Produk.barcode`, i18n ×4 + `docs/API.md`
- [x] Fase 1 — Laporan Penjualan + Ekspor: `laporanPenjualan` murni, REST `GET /api/v1/laporan-penjualan`, ekspor CSV/XLSX/PDF, halaman `/laporan`, unit test 10 kasus, i18n ×4 + `docs/API.md`
- [x] Fase 2 — Integrasi Pembayaran (lokal, split): Enum `MetodeBayar` + `EWALLET`, `Transaksi.uangDiterima` + `kembalian`, model `Pembayaran`, validasi Σ=total, jurnal Kas (1100), UI pembayaran + struk, unit test, i18n ×4 + `docs/API.md`
- [x] Fase 3 — CRM Lanjutan: Schema `Member.tier`/`totalBelanja`/`diskonPersen`, `memberData`, `memberRiwayat`, diskon member otomatis, halaman `/member/$id`, REST riwayat member, unit test, i18n ×4 + `docs/API.md`
- [x] Fase 4 — Perangkat Keras: Barcode scanner, ESC/POS printer via Web Serial (di balik flag `printer_escpos`), toggle di `/pengaturan`, i18n ×4 + `docs/API.md`
- [x] Fase 5 — F&B Mode (flag `mode_fnb`): Schema `Meja`/`ModifierGrup`/`Modifier`/`ProdukModifierGrup`/`TransaksiItemModifier`, CRUD meja & modifier, `transaksi.ts` dukung `mejaId`/`statusPesanan`/`modifiers`, Fn & REST API, UI `/meja` & `/dapur` (KDS), `RelNav` tampilkan entri F&B hanya bila flag aktif, unit test, i18n ×4 + `docs/API.md`
- [x] Struk otomatis setelah bayar — pilihan `nonaktif|cetak|pdf` di `/pengaturan`, `window.print()` atau unduhan `GET /api/v1/transaksi/struk/{id}/pdf`, tombol manual Unduh PDF, i18n ×4, unit test, `docs/API.md`
- [x] Notifikasi owner — stok bahan habis, pendapatan harian, mingguan (Senin), dan bulanan (tanggal 1); lonceng di samping toggle tema, status dibaca lokal, halaman `/notifikasi`, tautan di dropdown profil, REST `GET /api/v1/notifikasi`, i18n ×4, unit test
- [x] Notifikasi semua peran — OWNER (stok + pendapatan), KASIR (stok + pesanan online `MENUNGGU`), MEMBER (transaksi terakhir + status pesanan online miliknya); lonceng di semua header, segarkan saat fokus/kembali ke tab, i18n ×4, unit test role-aware

### Pengajuan Pengeluaran Kasir (2026-10-22)

- [x] Input pengeluaran jadi dialog (modal), bukan form inline: owner mencatat langsung ke buku besar lewat tombol **Debit** di samping **Tampilkan**, kasir mengirim ajuan lewat tombol **Ajukan Pengeluaran** di `/kasir`; satu komponen `DialogPengeluaran` untuk dua mode, target sentuh ≥44px, tanpa scroll horizontal di 390px.
- [x] Alur persetujuan: `buatPengajuanFn` (kasir saja, status `PENDING`, jurnal belum dibuat) → `setujuiPengajuanFn`/`tolakPengajuanFn` (owner) → jurnal berimbang + status + `nominalDisetujui` dalam satu transaksi → notifikasi kasir berisi nominal yang disetujui; halaman `/pengajuan` untuk daftar ajuan & dialog keputusan.
- [x] Skema DB: model `PengajuanPengeluaran` (relasi `kasirId`/`ownerId`, `nominalDisetujui`, `jurnalId`), enum `StatusPengajuan`, notifikasi bertipe pengajuan; migrasi `20261022161956_add_pengajuan_dan_notifikasi` + `20261022094437_add_nominal_disetujui`.
- [x] i18n ×4 (id/en/zh/ko), unit test `tests/vitest/pengajuan.test.ts`, e2e `tests/e2e/pengajuan.spec.ts` (ajuan → setujui → notifikasi, plus dialog 390px), kontrak ditulis di `docs/API.md`.
- [x] Panduan recovery migrasi yang gagal di tengah jalan (buang objek sisa → `prisma migrate resolve --rolled-back` → deploy ulang) di `docs/OPERASIONAL.md`.

### Deployment via GitHub

- [x] **DEPLOY-01** `.gitignore` siap commit GitHub: `.env*` (kecuali `.env.example`), `.vercel/`, `.netlify/`, `.output/`, `dist/`, artefak test, cache, dan log diabaikan; tidak ada rahasia yang ikut.
- [x] **DEPLOY-02** Konfigurasi deploy dari repo: `vercel.json` (Bun install, `NITRO_PRESET=vercel`, runtime Bun 1.x) dan `netlify.toml` (Bun 1.4.2, `NITRO_PRESET=netlify`, publish `dist`, rewrite ke function).
- [x] **DEPLOY-03** Panduan `README.md` + `docs/OPERASIONAL.md`: impor repo GitHub di Vercel/Netlify, env produksi, callback Google, migrasi manual `db:migrate:deploy`, dan catatan preview deployment.
- [x] **DEPLOY-04** Verifikasi build preset: `NITRO_PRESET=vercel` dan `NITRO_PRESET=netlify` sama-sama menghasilkan output yang benar; gate `tsc`, `lint`, `build` hijau.

### Kelompok A — Konsep Restoran / Cafe & F&B Mode

- [x] Tampilan kasir sebagai layanan restoran/cafe (mode_fnb): `/meja` + `/dapur` (KDS), pembelian dengan meja & modifier
- [x] Carousel 4 item terpopuler di halaman member: `produkTerpopuler` + halaman `/member`
- [x] Landing page: hero alur transaksi, 3 baris produk (populer, terbaru `createdAt desc`, campuran populer+baru), carousel bila >3 item, fallback acak dari produk aktif, CTA, dan daftar fitur nyata; tema terang/gelap
- [x] Header/Footer landing page dipakai di halaman privasi, ToS, dan tentang
- [x] Mode F&B aktif/nonaktif via pengaturan `mode_fnb`
- [x] Unit test (`produkTerpopuler`/`produkTerbaru`/`produkLanding`) + e2e 3 baris & tema + i18n ×4 + `docs/API.md`

### Kelompok B — Member & Riwayat Belanja

- [x] Riwayat belanja member: `memberRiwayat` + halaman `/member/$id` + REST `GET /api/v1/member/riwayat?id=`
- [x] Saat pembayaran pilih member atau non-member (toggle + cari member di `PanelBayar`)
- [x] Struk menampilkan info member (nama, tier, diskon member)
- [x] Unit test (`tests/vitest/member.test.ts`) + i18n ×4 + `docs/API.md`
- [x] Filter tanggal/nomor struk + detail item per transaksi di halaman riwayat member

### Kelompok C — Pemesanan Online & Pembayaran Online

- [x] Pemesanan online dengan pembayaran online: halaman publik `/pesanan` (menu + keranjang), POST `public /api/v1/pesan` membuat transaksi `kasirId=null`, `statusPesanan=MENUNGGU`, metode `QRIS`/`TRANSFER`/`EWALLET`; muncul di `/dapur` (KDS) dan kasir
- [x] Pesanan online member — sesi `MEMBER` aktif otomatis menautkan pesanan ke data member (diskon/poin/tier), banner member di `/pesanan`, poin dan total belanja ikut diperbarui; `memberId` tidak pernah diterima dari klien
- [x] Opsi pengiriman: ambil sendiri (take-away) / dine-in (pilih meja); pesanan antar tidak tersedia untuk pesanan online
- [x] Unit test (`tests/vitest/pesanan.test.ts`, 4 tes) + i18n ×4 + `docs/API.md` (endpoint `GET/POST /api/v1/pesan`)

### T.txt — Implementasi Selesai

- [x] **TXT-01** Fix `node:url` di client code — `vite.config.ts` ditambahkan `ssr.external: ['node-url']`; pastikan `#/db` hanya di-import di `/server/**` dan `/lib/auth.ts`
- [x] **TXT-02** Fix `/pengaturan` error `Cannot read properties of undefined (reading 'findMany')` — jalankan `db:push` + `db:seed` agar tabel `Pengaturan` berisi data default
- [x] **TXT-05** modifier.hargaTambahan → subtotal transaksi — `postingTransaksi` menambahkan hargaTambahan modifier ke subtotal item dan total transaksi; `ringkasHasil` menampilkan `tambahan` dari snapshot `TransaksiItemModifier.hargaTambahan`; schema `TransaksiItemModifier.hargaTambahan` ditambahkan; uji `transaksi-fnb.test.ts` diperbarui
- [x] **TXT-06** Seed produk menu ke `prisma/seed.ts` — ditambahkan semua produk dari HTML: Corndog (10 varian), Tteokbokki (2), Mini Corndog (4), Mozzarella Dan Sosis (4), Sweet Corndog (2), Hottang (4), Soft Crepes (10), Minuman (10); dengan resep bahan dan SKU unik
- [x] **TXT-07** Cetak struk counter per role — kolom `cetakOwner` & `cetakKasir` di `Transaksi`; API `POST /api/v1/transaksi/cetak/$id` untuk increment; tampilkan di struk (ESC/POS + print browser), KDS (`/dapur`), dan riwayat member (`/member/$id`)
- [x] **TXT-13** Perbarui `DAFTAR-TUGAS.md` ini dengan bahasa Indonesia yang jelas dan mudah dimengerti (versi saat ini)

### Perbaikan produk.txt

- [x] **PRD-BUG-01** Dialog struk tahan payload lama/tidak lengkap — `src/lib/struk.ts` menormalisasi `items`, `pembayaran`, dan `modifier` menjadi array; `muatJob`/daftar print job memakai normalizer; payload seed kini lengkap; regresi `tests/vitest/struk.test.tsx`
- [x] **SEED-02** Seed demo untuk persiapan uji manual/pentest: validasi minimal 25 produk aktif dan minimal 25 resep, akun OWNER/KASIR/MEMBER harus tersedia, pengaturan ukuran kertas diisi default, helper seed gagal secara eksplisit jika data operasional wajib tidak ditemukan, dan payload job cetak diverifikasi.
- [x] **PRD-BUG-02** Form ubah produk terisi nilai sebenarnya — `form.reset(values, { keepDefaultValues: true })` agar `useForm` tidak mengembalikan nilai ke form kosong; dijaga e2e
- [x] **PRD-BUG-03** Tabel produk: pencarian, filter status/kategori, indikator jumlah, sort header, pagination 10/25/50/100; reset halaman saat data berubah
- [x] **PRD-BUG-04** Pesanan online tidak lagi ditautkan untuk sesi OWNER/KASIR di header dan rel navigasi; `/pesanan` tetap publik untuk pelanggan

---

## Permintaan Baru — Menunggu Review

> Berikut item baru dari permintaan terbaru. Semua masih `[ ]` — **belum diimplementasikan**, silakan direview sebelum dikerjakan.

### Pelacakan Device & Lokasi User/Member

- [x] **NEW-01** Model `DeviceVisit` di `schema.prisma` — field: `deviceId`, `deviceName`, `os`, `ipv4`, `ipv6`, `dns`, `lokasi`, `klasifikasi` (hp/tablet/laptop/pc/mobil), `userId` (opsional), `userType` (member/non-member), `createdAt`; indeks pada `deviceId`, `userId`, `createdAt`, `userType`
- [x] **NEW-02** Endpoint pelacakan device — `POST /api/v1/device-visit` untuk menerima payload perangkat dari client (web/Expo) saat load halaman atau login; owner & kasir dikecualikan dari pencatatan
- [x] **NEW-03** Integrasi client — kirim data perangkat (`deviceId`, `deviceName`, `os`, `klasifikasi`, `lokasi`, `userId`) dari client ke endpoint pelacakan via `__root.tsx`; owner & kasir tidak dicatat

### Fix Empty Catch

- [x] **NEW-04** Isi `catch` di `muatUlangPembelian` di `src/routes/bahan.tsx` — toast error saat gagal memuat daftar pembelian bahan

### Riwayat Belanja (Aktif/Nonaktif oleh Owner)

- [x] **NEW-05** Flag `riwayat_belanja_aktif` di model `Pengaturan` (key-value) + default `'true'` di `db:seed`
- [x] **NEW-06** Toggle aktif/nonaktif riwayat belanja di halaman `/pengaturan` (hanya OWNER)
- [x] **NEW-07** Filter riwayat belanja di `/member/$id` — periksa flag `riwayat_belanja_aktif` sebelum menampilkan daftar transaksi; jika nonaktif, tampilkan pesan bahwa fitur dinonaktifkan oleh owner
- [x] **NEW-08** i18n ×4 untuk semua label baru (device visit, pembelian bahan, riwayat belanja)

## RENCANA — Fitur Utama POS (Belum Dimulai)

> Keputusan: fitur = Laporan+ekspor, Pembayaran lokal (split), CRM lanjutan, Perangkat keras, F&B (di balik flag). Multi-outlet ditunda. Flag lewat model `Pengaturan`. Ekspor pakai `xlsx` + `@react-pdf/renderer`. Tiap fase wajib lolos tsc/lint/build/test/test:e2e + update `docs/API.md`.

### Roadmap fitur dari audit 2026-10-23

> Empat item ini adalah fitur atau verifikasi klien, **bukan temuan keamanan
> backend**. Jangan dicentang sebagai bug keamanan; prioritaskan setelah item
> P0/P1 dan setelah ada keputusan produk yang jelas.

- [x] **FIT-01 — QR dine-in & delivery.** Token QR meja stateless (HMAC,
      30 hari, rate limit via `/api/v1/pesan`), generate QR di `/meja` (owner),
      scan lewat `/pesanan?meja=<token>`, dan `PesananOnlineSchema` menerima
      `deliveryId`/`mejaToken`/`alamat`; ongkir antar dari master Delivery di
      server, `mejaId`/`deliveryId`/`mejaToken` saling eksklusif, alamat wajib
      untuk antar.
- [~] **FIT-02 — Offline-first Expo.** Kontrak server siap (`idempotencyKey`,
  `dibuatOffline`, `waktuKlien`). Implementasi SQLite (`expo-sqlite`) +
  outbox + sinkronisasi otomatis di `pos_mobile`:
  `src/services/offline/{db,schema,transaksi-store,outbox-store}.ts`,
  `src/hooks/{use-offline-transaksi-draft,use-sinkron-offline,
use-posting-transaksi}.ts`, `src/app/_layout.tsx` (inisialisasi tabel).
  `tsc --noEmit` + `expo lint` lulus. Perlu development build (Expo Go
  tidak muat native module baru).
- [x] **FIT-03 — Laporan & analitik komprehensif.** Endpoint `GET /api/v1/laporan-penjualan`
      diperluas dengan dimensi (`kategori`, `kasir`, `shift`, `member`, `metodeBayar`,
      `meja`, `delivery`, `sumber`, `statusPesanan`, `pajakJenis`), grup `tahunan`,
      dan metrik tambahan (`qtyTerjual`, `poinTerpakai`, `poinDapat`). Rekap per
      dimensi, ekspor CSV/XLSX/PDF, dan i18n ×4. Unit test `laporan.test.ts` +
      `laporan-ekspor.test.ts` lulus. Gate penuh (tsc, lint, check, test, build)
      lulus.
- [x] **FIT-04 — Verifikasi penyimpanan token Expo.** Audit di
      `pos_mobile` (`docs/FIT-04-AUDIT.md`): token disimpan di
      `expo-secure-store`, dikirim via header `Authorization: Bearer`,
      tidak ada token di `AsyncStorage`/log/konsol, logout menghapus token.
      **Rekomendasi #4 diimplementasi**: response interceptor di `client.ts`
      memanggil `clearPosSessionToken()` otomatis saat 401. Semua gate lulus
      (tsc + expo lint di `pos_mobile`).

### T.txt — Refactor & Dokumentasi

- [x] **TXT-03** RelNav.tsx tipe `.to` — hapus type assertion `as NavPath` yang unnecessarily; TanStack Router type inference sudah tepat tanpa cast
- [x] **TXT-04** Bundle size warning `pesanan.tsx` — pindah komponen `Pesanan` ke `#/components/pesanan/Pesanan` (sudah terpisah), route file memakai `lazyRouteComponent` untuk code-split lazy loading
- [x] **TXT-08** Dokumentasi Fase 5 — cara aktivasi/nonaktif `mode_fnb` via halaman `/pengaturan` (toggle owner); update `docs/API.md` bagian "Aktivasi / Nonaktifkan Mode F&B"
- [x] **TXT-09** Pindah semua type/interface TypeScript ke `src/types/**/*.d.ts`
- [x] **TXT-10** Pindah semua skema Zod ke `src/validations/**/*.ts`
- [x] **TXT-11** Buat `MYDIAGRAM.md` — diagram alur aplikasi (POS, KDS, pesanan online, pembayaran, cetak struk, laporan, analytics)
- [x] **TXT-12** Embed diagram dari `MYDIAGRAM.md` ke `./README.md` (gambar, bukan link)

### Audit & Pembersihan (2026-10-18)

- [x] **CLN-01** Hapus kode mati: `src/db-collections/`, `src/integrations/better-auth/header-user.tsx`, `src/lib/utils.ts` (dipertahankan sebagai target alias shadcn), `src/server/auth-socialFn.ts`, `src/server/modifierFn.ts`, `src/types/message.d.ts`, folder kosong `scripts/`
- [x] **CLN-02** Hapus export mati: `ROLE_LABEL`, `rateLimitHeaders`, `cartDecrement`, `cartRemove`, `ringkasanDeviceVisitFn` (+ `ringkasanDeviceVisit` & tipe `RingkasanDeviceVisit`), 4 skema modifier tak terpakai, tipe `HapusMejaInput`/`ToggleMejaInput`, duplikat `ProdukRow`, default `TanstackQueryProvider`
- [x] **CLN-03** Hapus dependensi tak terpakai: `@faker-js/faker`, `@tanstack/react-db`, `@tanstack/query-db-collection`
- [x] **CLN-04** Hapus artefak root: `build-output.txt`, `654e2754…avif`
- [x] **CLN-05** Jalankan gate penuh: `tsc --noEmit`, `lint`, `check` (prettier), `test` (71 lulus), `test:e2e` (15 lulus), `build` — semua hijau
- [x] **CLN-06** Scheduled cleanup data kadaluwarsa (>30 hari): `src/server/bersihkanData.ts` (`bersihkanPrintJobKadaluarsa`, `bersihkanDraftTransaksiKadaluarsa`), route cron `/api/cron/bersihkan-data` (dijadwalkan Vercel 03:00 UTC harian via `vercel.json`), guard `CRON_SECRET` via `cronAuth`, dokumentasi di `docs/API.md`
- [x] **SEC-11 (Medium)** Batasan ukuran payload pada endpoint printer/pemindai: `bacaJsonTerbatas` (1–64 KB tergantung endpoint) + validasi skema Zod ketat sebelum `request.json()` di `/api/v1/printer/*` dan `/api/v1/percetakan/*`; mencegah body raksasa dari perangkat keras (`src/server/api.ts`)
- [x] **NEW-09** Generate meja bulk: skema `GenerateMejaSchema` (`src/validations/meja.ts`), server fn `buatBanyakMeja` (`src/server/meja.ts`), server fn `buatBanyakMejaFn` (`src/server/mejaFn.ts`), route `POST /api/v1/meja/generate` (guard manajerial, payload limit 1 KB, maks 200 meja per batch, nomor duplikat dilewati), dialog UI/UX `GenerateMejaDialog` (`src/components/meja/GenerateMejaDialog.tsx`) mobile-first dengan form rentang nomor, toggle aktif/cetak A4, dan preview lembar A4 dengan 2 meja per lembar + garis potong; integrasi tombol generate di halaman `/meja` (`src/routes/meja.tsx`)
- [x] **NEW-10** Koneksi baca terpisah (read replica siap pakai): `src/db-read.ts` (PrismaClient terpisah via `DATABASE_URL_READ`, fallback ke `DATABASE_URL`), `src/database-url.ts` (`getDatabaseUrlRead()`), query laporan diarahkan ke `prismaBaca` (`laporanPenjualan.ts`, `laporanPajak.ts`, `laporanBelanja.ts`), env baru di `.env.example` + `src/env.ts`
- [x] **NEW-11** Navigasi akun staf: login dan sesi OWNER/KASIR diarahkan ke `/dashboard`, tautan Dashboard dipindah ke urutan teratas sidebar serta ditambahkan ke navbar desktop, dan sakelar buka/tutup toko (`toko_aktif`) tersedia di `/dashboard` (tersimpan langsung) di samping yang sudah ada di `/pengaturan`
- [x] **AUD-01** Audit menyeluruh (dead code, security, performa, health) → `audit-2026-10-18-2140.md`
- [x] **AUD-02** Perbaiki `.gitignore` (hapus ignore `.env.example`, tambah `.env.*` + `coverage/`, hanya template env yang di-commit) & rapikan `README.md`

---

## AUDIT — Temuan 2026-10-18 (Menunggu Review)

> Hasil audit lengkap di `audit-2026-10-18-2140.md`. Item `[ ]` **belum dikerjakan** — silakan tinjau sebelum implementasi. Prioritas: High dulu. SEC-01..10, PERF-01..06, dan HLT-01..06 selesai 2026-10-18/19.

### Keamanan

- [x] **SEC-01 (High)** `apiError()` menyampaikan `Error.message` apa adanya → pesan Prisma/Zod mentah bocor ke klien (`src/server/api.ts`). Dibuat `src/server/galat.ts` (`GalatDomain` + `terjemahGalat`: domain→422, Zod→400, guard→401/403, selainnya→log ref + 500 generik); `apiError` pakai translator; throw domain di 9 modul server dikonversi ke `GalatDomain`; `galatMiddleware` (`src/server/galatMiddleware.ts`, function middleware) sanitasi error server function di `src/start.ts`; unit test `tests/vitest/galat.test.ts`
- [x] **SEC-02 (High)** `POST /api/v1/pesan` publik menerima `memberId`/`deliveryId`/`diskon`/`pajak`/`pembayaran` → potensi pesanan gratis & penyalahgunaan poin member (`src/server/pesanan.ts`). Tambah `PesananOnlineSchema` (`src/validations/transaksi.ts`, hanya `items`/`mejaId`/`metodeBayar` QRIS-TRANSFER-EWALLET/`catatan`); `pesanTransaksi` paksa `diskon=0`, `pajak=0`, `tukarPoin=0`, `statusPesanan=MENUNGGU`; route tak lagi parse skema penuh; unit test `tests/vitest/pesanan-schema.test.ts`
- [x] **SEC-03 (High)** Belum ada CSRF middleware untuk server function (`src/start.ts`). Tambah `createCsrfMiddleware` (`filter: handlerType === 'serverFn'`) di `requestMiddleware`
- [x] **SEC-04 (Medium)** Matriks peran tidak konsisten antara route, `*Fn.ts`, dan REST (`/kasir`, `/dapur`, `/meja`, `/pengaturan`). Dibuat `src/server/peran.ts` (`AKSES.operasional`=OWNER+KASIR, `manajerial`=OWNER, `semua`=OWNER+KASIR+MEMBER + `punyaAkses`); guard server function (`auth.ts` → `requireKasir`/`requireOwner`), REST (`apiPengguna` di 19 route), guard halaman (`beforeLoad` via `punyaAkses`), dan nav (`RelNav`) semua memakai konstanta ini. Kekeliruan diperbaiki: `kasirDataFn`/`dapurFn` requireOwner→KASIR; REST GET `/meja` OWNER→operasional; unit test `tests/vitest/peran.test.ts`
- [x] **SEC-05 (Medium)** `recordDeviceVisitFn`/`recordPageVisitFn` publik tanpa rate limit (REST-nya punya, server function tidak) → storage DoS. Rate limit dipindah ke server function (`batasiNama`: device-visit 60/menit, kunjungan 120/menit di `deviceVisitFn.ts`/`kunjunganFn.ts`); pembatas di route REST `device-visit` & `kunjungan/index` dihapus
- [x] **SEC-06 (Medium)** `signInSocial` mengembalikan token sesi di body JSON (bisa dibaca XSS). `src/routes/api/v1/auth-social.ts` kini mengirim `{ user }` saja untuk web (cookie httpOnly tetap di-set); token sesi di body hanya bila klien mengirim header `x-client: expo` — **digantikan SEC-25:** token native kini hanya lewat `/api/v1/auth-native` dan `x-client` tidak lagi dipercaya.
- [x] **SEC-07 (Medium)** `trustedOrigins` bisa `undefined` di produksi; `useSecureCookies` bentrok dengan atribut `secure`. `src/lib/auth.ts`: `trustedOrigins` selalu terdefinisi (origin `BETTER_AUTH_URL` + `TRUSTED_ORIGINS`); `useSecureCookies` murni dari `NODE_ENV`; atribut `secure` ganda dihapus dari `defaultCookieAttributes`
- [x] **SEC-08 (Medium)** Rate limiter in-memory + IP dari header yang bisa dipalsukan; tidak efektif di serverless. Diganti store bersama Postgres (model `RateLimit`, upsert atomik `INSERT ... ON CONFLICT ... RETURNING` di `src/server/rateLimit.ts`); IP dari `getRequestIP` (header proxy hanya bila `TRUST_PROXY`); `batasi` async dipakai `rateLimit` (REST 429) & `batasiNama` (server fn → `GalatRateLimit`/429); tambah `TRUST_PROXY` di `src/env.ts`; unit test `tests/vitest/api.test.ts`
- [x] **SEC-09 (Low)** CSP hanya di produksi, `style-src 'unsafe-inline'`, `img-src https:` terlalu luas. `src/lib/csp.ts` kini digate flag eksplisit `ENABLE_CSP` (default menyala di produksi, bisa dipaksa di staging/dev); `img-src` dipersempit ke `'self' data: blob: https://res.cloudinary.com https://*.googleusercontent.com`; komentar menjelaskan `style-src 'unsafe-inline'` masih perlu untuk style inline Radix/next-themes; env baru di `src/env.ts` + `.env.example`/`README.md`
- [x] **SEC-10 (Low)** Metadata analytics dari klien (`x-path`, `x-real-ip`, `userId` body) → racun data. `kunjungan/index.ts`: `userId` dari sesi, IP dari `ipSaatIni()` (`getRequestIP`, soket tepercaya), path dari `Referer` dengan fallback `x-path` ternormalisasi (`normalkanPath`: relatif internal, tanpa query/hash, ≤200); `device-visit.ts`: `userId` diturunkan dari sesi (`apiPenggunaOpsional`), body klien tak lagi dipercaya; `__root.tsx` tak lagi mengirim `x-path`/`path`/`userId`; unit test `tests/vitest/kunjungan.test.ts`

### Performa

- [x] **PERF-01 (High)** N+1 tulis di loop posting transaksi (modifier & stok bahan). Modifier dibuat sebagai nested `create` di dalam satu `transaksi.create` (bukan loop tulis terpisah); stok produk & bahan dikurangi lewat satu `UPDATE ... FROM (VALUES ...)` per tabel dengan id di-dedupe & kebutuhan dijumlahkan (`src/server/postingTransaksi.ts`)
- [x] **PERF-02 (High)** Agregasi JS atas seluruh tabel. `laporanPenjualan.ts` → `select` skalar + `groupBy` (`transaksiItem`, `transaksi`) + ambil nama kasir sekaligus; `kunjungan.ts` → `select` minimal + `groupBy` halaman terpopuler; `deviceVisit.ts` → `take` berlimit (`limit` opsional ≤500); `kasir.ts` → `select`/`include` ramping. Fungsi murni periode tetap (batas `date_trunc` Prisma)
- [x] **PERF-03 (High)** Indeks FK/filter belum ada di `schema.prisma`. Ditambah `@@index` (`Transaksi` tanggal/FK/filter + composite, `TransaksiItem`, `Pembayaran`, `Jurnal`, `JurnalDetail`, `Produk`, `Bahan`/`PembelianBahan`, `Modifier`/`ProdukModifierGrup`/`TransaksiItemModifier`, `session`/`account`) lalu `db:push`; verifikasi daftar indeks + `EXPLAIN` di DB dev
- [x] **PERF-04 (Medium)** Query ulang transaksi yang baru dibuat (`transaksi.ts`) — pakai hasil `create`. Modifier kini ikut sebagai nested `create` pada `items`, sehingga `transaksi` hasil `create` sudah memuat `items[].modifiers[].modifier`; `findUnique` sesudahnya dihapus (`src/server/postingTransaksi.ts`); diverifikasi `tests/vitest/transaksi-fnb.test.ts`
- [x] **PERF-05 (Medium)** Over-fetch tanpa `select` (`produk.ts`, `kasir.ts`, `/api/v1/kategori` memanggil `produkData()` penuh). `produkData` memakai `select` kolom yang dipakai saja (produk/resep/bahan/kategori); `kategoriData()` khusus ditambahkan dan dipakai GET `/api/v1/kategori`; `kasirData` (kategori/member/delivery/transaksiHariIni) dan `laporanBukuBesar` (akun/jurnalDetail) memakai `select`
- [x] **PERF-06 (Medium)** Nomor struk harian pakai `count()` di dalam transaksi tulis → contention. Ditambah model `NomorHarian` (`nomor_harian`) + `nomorBerikut` atomik (`UPDATE ... +1 RETURNING`, inisialisasi sekali per hari dari count hanya bila baris belum ada, tahan balapan) — `count()` tak lagi di jalur panas (`src/server/penomoran.ts`); test membersihkan `nomorHarian`

### Health / Kebersihan

- [x] **HLT-01 (High)** File melebihi 397 baris: `src/server/transaksi.ts` (673), `src/components/kasir/PanelBayar.tsx` (657), `src/routes/bahan.tsx` (559), `src/routes/laporan.tsx` (534). Selesai dipecah per tanggung jawab: `transaksi.ts` → `poin`/`penomoran`/`postingHitung`/`postingTransaksi`/`ringkasTransaksi`/`dapur` + facade; `PanelBayar.tsx` → `DaftarDraft` + hook `src/hooks/{useAntreanOffline,useFormKasir}.ts`; `bahan.tsx` → `components/bahan/{FormBahan,FormPembelianBahan,TabelBahan,DaftarPembelian}`; `laporan.tsx` → `components/laporan/{FilterLaporan,RingkasanKartu,GrafikKunjungan,TabelLaporan,KosongLaporan}`. Semua berkas tangan kini ≤ 397 baris
- [x] **HLT-02 (High)** Prisma error mentah di-`throw` di `bahan.ts`, `meja.ts`, `member.ts`, `produk.ts`, `transaksi.ts` (akar SEC-01). Diselesaikan bersama SEC-01: error translator terpusat (`src/server/galat.ts`), semua throw domain pakai `GalatDomain`
- [x] **HLT-03 (Medium)** Modul `src/server/*.ts` tanpa unit test: `api`, `bahan`, `deviceVisit`, `kasir`, `kunjungan`, `pembelianBahan`, `pengaturan`, `user`, `laporanEkspor`. Ditambah 9 suite vitest (`tests/{api,bahan,deviceVisit,kasir,kunjungan,pembelianBahan,pengaturan,user,laporan-ekspor}.test.ts`) — total 24 file/110 tes lulus
- [x] **HLT-04 (Medium)** Skema Zod inline di `*Fn.ts` (`bahanFn`, `dapurFn`, `mejaFn`, `memberFn`, `produkFn`) — dipindahkan ke `src/validations/**` (`MemberIdSchema`, `ProdukTerpopulerSchema`, `UpdateStatusPesananSchema`, `CetakStrukSchema`, dll)
- [x] **HLT-05 (Low)** Tipe inline dipindahkan ke `src/types/**`: `transaksi.ts` → `types/transaksi.d.ts`, `PanelBayar.tsx` → `types/kasir.d.ts`, `bahan.tsx` → `types/bahan.d.ts`, route `device-visit` → `types/device-visit.d.ts`
- [x] **HLT-06 (Low)** Konvensi lokasi: seluruh hook dipindahkan ke `src/hooks/**`, seluruh tipe/interface ke `src/types/**` (satu berkas per domain), seluruh skema Zod ke `src/validations/**`. Hook: `useAntreanOffline`, `useFormKasir` → `src/hooks/`. Tipe baru: `types/{produk,laporan,printer,api,prisma,home}.d.ts` + tambahan di `types/{kasir,bahan,pesanan}.d.ts`. Skema baru: `validations/pagination.ts` (dipakai bahan/meja/member/produk), `FormatEksporSchema`/`LaporanSearchSchema`, `BukuBesarSearchSchema`, `ModifierGrupId`/`ModifierId`/`ToggleModifierGrup`/`ToggleModifier`. Dikecualikan: `src/components/ui/**` (registry), augmentasi tipe router, `src/env.ts`. Gate hijau (tsc/lint/check/110 tes/build)

---

## Audit & Pembersihan (2026-10-19)

- [x] **CLN-06** Hapus berkas artefak root: `T.txt`
- [x] **CLN-07** Hapus ekspor/tipe mati (diverifikasi `knip` + `rg`): `BukuBesarSearchInput`, `PaginationInput`, `LaporanSearchInput`, `FormatEkspor`, `PesananOnlineInput`, `KunciPengaturan`, dan re-export mati `KUNCI_PENGATURAN`/`KunciPengaturan` (`src/server/pengaturan.ts`); cabut `export` pada `validasiFotoProduk`, `requirePeran`, `TIER_AMBANG`, `KUNCI_PENGATURAN`, `GrupSchema`, `ResepInputSchema`, `PostingItemSchema`, `PembayaranInputSchema` (dipakai internal saja)
- [x] **CLN-08** Dependensi: hapus `@tanstack/match-sorter-utils`, `embla-carousel-react`, `@tanstack/devtools-event-client`; daftarkan `@better-auth/core` & `@tanstack/form-core` (sebelumnya _unlisted_, hanya tipe)
- [x] **CLN-09** Jalankan gate penuh: `tsc --noEmit`, `lint`, `check` (prettier), `test` (25 file, **120** lulus), `test:e2e` (**15** lulus), `build` — semua hijau
- [x] **AUD-03** Audit menyeluruh (dead code, security, performa, health) → `audit-2026-10-19-0848.md`
- [x] **AUD-04** Rapikan `.gitignore` (`.agents/rules` ikut di-commit; `.vscode/` tetap lokal), `README.md` (tabel rute + bagian Audit & status), `docs/DAFTAR-TUGAS.md`

---

## Perbaikan AUDIT 2026-10-19 (Selesai)

> Hasil lengkap di `audit-2026-10-19-0848.md`. Semua item dikerjakan 2026-10-19; gate penuh hijau (`tsc`, `lint`, `check`, `test` 120, `test:e2e` 15, `build`).

### Keamanan

- [x] **SEC-11 (Low)** Trust header IP Better Auth kini digate `TRUST_PROXY` (`src/lib/auth.ts`): aktif → `ipAddressHeaders: ['x-forwarded-for','x-real-ip']`, selain itu `disableIpTracking: true` (header bisa dipalsukan tak dipakai)
- [x] **SEC-12 (Low)** `recordDeviceVisitFn` menurunkan `userId` dari sesi via `getPengguna()`; body klien tak lagi dipercaya (`src/server/deviceVisitFn.ts`); route POST `/api/v1/device-visit` berhenti menyuntik `userId` (`delete body.userId`)
- [x] **SEC-13 (Info)** Mitigasi kode: `unggahFotoProduk` memvalidasi hasil (`secure_url` harus dari host cloud kita + format `jpg/png/webp`) — `src/lib/cloudinary.ts`. Sisa risiko (unsigned preset) = konfigurasi Cloudinary: batasi folder/ukuran/format & rotasi preset bila bocor
- [x] **SEC-14 (Info)** `GET /api/v1/health` diberi rate limit ringan (`rateLimit(request, 60)`) — `src/routes/api/v1/health.ts`

### Health / UX

- [x] **HLT-07 (Low)** Judul dokumen pakai `VITE_APP_TITLE ?? 'POS'` (bukan lagi `TanStack Start Starter`) — `src/routes/__root.tsx`
- [x] **HLT-08 (Low)** `fetch('/api/v1/kunjungan')` diberi `.catch` (senada device-visit) — `src/routes/__root.tsx`
- [x] **UX-01 (Low)** Halaman legal `/tentang`, `/privasi`, `/tos` ditautkan di `src/components/Footer.tsx`
- [x] **UX-02 (Low)** Disamakan ke `manajerial` (mengikuti guard halaman + `requireOwner` pada mutasi): item `/meja` di `RelNav`; `src/routes/meja.tsx` tetap `manajerial`; REST GET `/meja` tetap `operasional` untuk kebutuhan POS

---

## AUDIT OWASP Top 10:2025 (2026-10-19) — Semua Tingkat Selesai

> Audit manual (sumber + uji langsung 3 tingkat hak akses). Laporan lengkap: `audit-owasp-2025-2026-10-19.md`.
> High, Medium, dan Low **selesai**. Uji dinamis menghasilkan PoC nyata untuk OW-09 & OW-10.
> Sisa risiko yang sifatnya operasional (OW-13/15/16) didokumentasikan di laporan audit.

### Tinggi

- [x] **OW-09 (High, A06/A10)** Oversell stok **tanpa login**: qty kini diagregasi per produk/bahan lalu divalidasi terhadap snapshot sebelum menulis (langkah 2b `postingTransaksi.ts`). Uji: `tests/vitest/posting.test.ts` → 2 baris qty=3 pada stok 5 ditolak, stok tetap 5.
- [x] **OW-10 (High, A06)** `pajak` diabaikan; server menghitung dari pengaturan `pajak_persen` (`hitungPajak` di `postingHitung.ts`, dibaca di dalam transaksi). Input pajak kasir dihapus; halaman `/pengaturan` menambah kartu "Tarif pajak (%)". `diskon` dibatasi (`diskonTotal > subtotal` → tolak) & `total < 0` → tolak. Uji: `pajak: 500000` dari klien → `pajak 0`.
- [x] **OW-18 (High, A10)** TOCTOU stok: dekrementasi jadi `UPDATE ... WHERE stok >= qty` + cek jumlah baris terpengaruh (langkah 5) → penjualan paralel tak bisa membuat stok negatif. Catatan: `CHECK (stok >= 0)` tak bisa dinyatakan di schema Prisma (proyek pakai `db:push`, tanpa migrasi), jadi dijaga di level aplikasi.

### Menengah

- [x] **OW-11 (Medium, A06)** Diskon menumpuk: ditambahkan penjaga `diskonTotal > subtotal` → tolak ("Diskon melebihi subtotal") dan `total < 0` → tolak, sehingga `total` tak lagi bisa negatif (`postingTransaksi.ts`). Uji di `tests/vitest/posting.test.ts`.
- [x] **OW-19 (Medium, A10)** Double-spend poin: dekremen poin kini atomik & bersyarat (`UPDATE "Member" SET poin = poin - X WHERE id = ? AND poin >= X` via `$executeRaw`); `terpakai !== 1` → tolak "Poin member tidak mencukupi". Uji: `tests/vitest/posting.test.ts`.
- [x] **OW-01 (Medium, A01)** `updateUserRole` menolak ubah peran akun sendiri (`aktorId === target.id`), menolak demosi OWNER terakhir (hitungan OWNER lain = 0), dan menulis audit `[AUDIT] user.role.changed` (id disensor, non-development). `updateUserRoleFn` mengirim id pemanggil dari `requireOwner()`. Uji: `tests/vitest/user.test.ts`.
- [x] **OW-12 (Medium, A06)** `validasiModifier` di `postingHitung.ts` menegakkan: modifier harus milik produk, jumlah per grup ≤ `max`, dan grup `wajib`/`min` terpenuhi (min efektif = max(min,1) bila wajib). Dipanggil dari `hitungBaris`. Uji: `tests/vitest/posting.test.ts`.
- [x] **OW-03 (Medium, A02)** `errorComponent` root generik (`src/routes/__root.tsx`) — tak pernah menampilkan `error.message`; kunci i18n `error_title`/`error_desc`/`error_retry` (4 bahasa).
- [x] **OW-17 (Medium, A09)** Hook audit tak lagi menulis PII: email dihapus, id user/sesi dihapus (`src/lib/auth.ts`). Hanya transisi peran yang dicatat (tanpa id).

### Rendah

- [x] **OW-02 (Low, A01)** Query id divalidasi Zod cuid (`src/validations/id.ts`) di `GET /api/v1/member/riwayat`, `GET /api/v1/modifier`, dan `DELETE /api/v1/modifier`; `?id=bad` kini 400, bukan 500. Uji: `tests/vitest/validasi-query.test.ts`.
- [x] **OW-04 (Low, A02)** Peringatan `[KEAMANAN]` dilog saat CSP mati eksplisit di produksi (`src/lib/csp.ts`).
- [x] **OW-05 (Low, A02)** `Cache-Control: no-store` untuk `/api/*` + header `Cross-Origin-Opener-Policy`/`Cross-Origin-Resource-Policy: same-origin` (`src/lib/csp.ts`).
- [x] **OW-06 (Low-Med, A03)** CI GitHub Actions (`.github/workflows/ci.yml`): `bun install --frozen-lockfile`, tsc, lint, format, build, `bun audit` (SCA), dan unit test dengan service Postgres. Update otomatis via `.github/dependabot.yml`. Skrip `bun run audit` ditambahkan. Temuan pertama SCA: `xlsx@0.18.5` (2 high) → di-upgrade ke `xlsx@0.20.3` (tarball resmi SheetJS). Sisa 1 advisory **moderate** `postcss-selector-parser` (transitif `@tailwindcss/typography`, hanya saat build, tak dikirim ke runtime) — tanpa perbaikan dalam rentang; dibiarkan & dipantau.
- [x] **OW-13 (Low, A07)** Sisa risiko didokumentasikan (token body JSON hanya untuk sesi baru yang sah) — lihat catatan operasional laporan audit.
- [x] **OW-14 (Low, A07)** Cek `Origin` eksplisit untuk REST `/api/*` non-GET (browser harus cocok daftar tepercaya; klien non-browser tanpa Origin diizinkan) — `periksaOrigin` di `src/lib/csp.ts`, sumber daftar `src/lib/origin.ts`.
- [x] **OW-15 (Info, A07)** Persyaratan proxy tepercaya didokumentasikan (`.env.example` + catatan operasional laporan audit).
- [x] **OW-16 (Low, A08)** Pengerasan preset Cloudinary (batasi format/ukuran/folder + rotasi) didokumentasikan di `.env.example` + laporan audit.
- [x] **OW-20 (Low, A10)** `produk-terpopuler.ts` mengembalikan 400 eksplisit; galat domain `member.ts`/`produk.ts` memakai `GalatDomain` → 422 (bukan 500).
- [x] **OW-21 (Low, A10)** `totalBelanja` ditambah via `increment` atomik lalu tier dihitung ulang dari nilai tersimpan (`postingTransaksi.ts`). Uji: `tests/vitest/posting.test.ts`.

---

## Iterasi 2026-10-19 (pajak ganda, pino, upload/download backend, review manual)

### Pajak dibebankan ke pelanggan — PB1 restoran/cafe & PPN retail

- [x] **PAJAK-01** Dua tarif pajak terpisah & dipilih otomatis dari `mode_fnb`:
      `pajak_resto_persen` (→ **PB1**, mode F&B/restoran/cafe) dan `pajak_retail_persen`
      (→ **PPN**, retail); fallback `pajak_persen` lama. Modul murni `src/server/pajak.ts`
      (`tarifPajak`, `normalisasiPersen`). Dipakai `postingTransaksi.ts`, `kasir.ts`,
      `pengaturan.ts`. Pajak bersifat **eksklusif** (ditambahkan ke total) — dibebankan
      ke pelanggan. Jenis disimpan di `Transaksi.pajakJenis` (kolom baru).
- [x] **PAJAK-02** UI `/pengaturan` menampilkan dua input (PB1 & PPN) + deskripsi
      otomatis-per-mode; kunci i18n `pengaturan_pajak_resto`/`pengaturan_pajak_retail`
      ×4 bahasa. Struk & RingkasanBayar menampilkan label jenis (PB1/PPN).
- [x] **PAJAK-03** Seed menambah `pajak_resto_persen`/`pajak_retail_persen` = 0;
      validasi pengaturan diperluas. Uji: `tests/vitest/pajak.test.ts` (8).

### Logging terstruktur (pino)

- [x] **LOG-01** Logger pino `src/lib/logger.ts`: JSON di produksi, pretty di dev
      (bukan di test/build), level `LOG_LEVEL`, redaksi otomatis kredensial/PII
      (`authorization`/`cookie`/`password`/`token`/`secret`/`email`).
- [x] **LOG-02** Middleware request `src/server/logMiddleware.ts` mencatat
      method/path/status/durasi + `reqId` (echo header `x-request-id`); aset statis
      hanya di level debug; error tak tertangani ikut dicatat.
- [x] **LOG-03** Semua `console.*` server diganti pino: `galat.ts`, `csp.ts`,
      audit `auth.ts` (terstruktur, tanpa PII), `user.ts`. Seed CLI tetap `console`
      (output script, bukan log server).

### Unggah/unduh Cloudinary pindah ke backend

- [x] **CLOUD-01** `src/server/cloudinary.ts` + helper murni
      `src/server/bantu.cloudinary.ts`: server membuat **tanda tangan upload**;
      `CLOUDINARY_API_SECRET` tak pernah ke klien. `POST /api/v1/unggah` (OWNER).
- [x] **CLOUD-02** Unduh & hapus lewat server: `GET /api/v1/unggah/unduh?url=`
      (streaming attachment) dan `DELETE /api/v1/unggah` (Admin API). Validasi host
      `res.cloudinary.com` + prefix folder (`publicIdAman`/`publicIdDariUrl`/
      `urlUnduhAman`) → anti-SSRF & tak bisa hapus aset luar. Klien
      (`src/lib/cloudinary.ts`) memakai tanda tangan & unduh via server.
- [x] **CLOUD-03** Hapus gambar produk lama diproses server saat produk diubah
      (gambar diganti/dikosongkan) atau dihapus — `bersihkanGambar` di `produk.ts`
      (best-effort). Env: `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET/FOLDER`;
      variabel `VITE_CLOUDINARY_*` dihapus. Uji: `tests/vitest/cloudinary.test.ts` (9).
- Catatan: `POS-13` (upload unsigned dari browser) **digantikan** oleh CLOUD-01..03
  (upload bertanda tangan + unduh/hapus lewat server).

### Review keamanan manual (white-box)

- [x] **REV-01** Review manual lapisan otorisasi/IDOR/injeksi/upload/log/pajak
      → laporan `audit-keamanan-manual-2026-10-19.md`. Temuan **M-02** diperbaiki
      (rate limit 30/menit untuk `POST /api/v1/device-visit`). **M-01** (pesanan
      publik `/api/v1/pesan` mengurangi stok) & **M-03/M-04** didokumentasikan sebagai
      risiko diterima/ditunda. (Strix tak dijalankan: router LLM 429.)

### Hardening keamanan pesanan online & input publik (2026-10-23)

- [x] **SEC-15 (High)** Penyalahgunaan pesanan online: stok, poin, jurnal, dan
      baris pembayaran tidak lagi dibuat saat pesanan publik dibuat. Migrasi
      `20261023090000_add_pembayaran_pesanan_online` menambah `Transaksi.sumber`
      (`POS|ONLINE`), `dibayarPada`, `dibayarVia`, `paymentRef` (unik), dan
      `stokTerpotong`. Efek samping dijalankan tepat sekali di
      `tandaiPesananLunas` lewat klaim `updateMany` bersyarat; manual memakai
      `POST /api/v1/pesanan/{id}/bayar` + tombol **Tandai lunas** di KDS,
      gateway mendatang memakai `POST /api/v1/pembayaran/webhook` dengan HMAC
      `PAYMENT_WEBHOOK_SECRET`. Laporan, riwayat member, shift, dan notifikasi
      hanya menghitung transaksi lunas non-batal (`transaksiTerjual.ts`).
      Pembatalan online setelah lunas ditolak (refund belum didukung). Uji:
      `tests/vitest/pesanan.test.ts`, `tests/vitest/pembayaran-webhook.test.ts`.
- [x] **SEC-16 (High)** CSV formula injection: helper `src/server/csv.ts`
      menyanitasi sel berawalan `= + - @` (termasuk spasi/kontrol di depan)
      **sebelum** quoting, lalu dipakai semua ekspor penjualan/belanja/pajak.
      Uji: `tests/vitest/laporan.test.ts`.
- [x] **SEC-17 (Medium)** Input analytics publik dibatasi: skema `device-visit`
      memakai panjang maksimum, body ≤ 16 KB, dan `ipv4`/`ipv6`/`dns` dari klien
      diabaikan — IP hanya dari koneksi server (`ipSaatIni`). Uji:
      `tests/vitest/deviceVisit.test.ts`.
- [x] **SEC-18 (Medium)** Pesanan/transaksi publik dibatasi 100 baris, 20
      modifier per baris, qty ≤ 9.999, dan body ≤ 256 KB sebelum `JSON.parse`;
      body berlebih → 413 `PAYLOAD_TOO_LARGE`. Uji:
      `tests/vitest/pembayaran-webhook.test.ts` (skema pesanan).
- [x] **SEC-19 (Low)** `GET /api/v1/app-icon` diberi rate limit 60/menit per IP
      dan cache ikon 10 menit (gagal 1 menit) agar fetch Cloudinary tidak
      dipanggil tiap request.

### Perbaikan bundle klien & e2e

- [x] **FIX-KLIEN-01** `src/start.ts` juga di-import di klien, sehingga
      `cspMiddleware`, `logMiddleware`, `galatMiddleware` yang meng-import
      `#/env` (dotenv → `process.cwd`), pino, dan `./galat` secara statis membuat
      halaman klien crash (`process.cwd is not a function`) dan hidrasi mati
      (tombol Google tak pernah muncul). Impor server-only sekarang **lazy**
      (dynamic import di dalam handler `.server()`); graph klien diverifikasi bersih
      dari `env.ts`, `db.ts`, prisma, `lib/auth.ts`, `lib/logger.ts`.
- [x] **FIX-KLIEN-02** Fetch fire-and-forget analytics di `__root.tsx`
      (`/api/v1/kunjungan`, `/api/v1/device-visit`) tidak mengonsumsi body →
      koneksi tetap "in-flight" → `networkidle` Playwright tak pernah tercapai.
      Body sekarang di-`cancel()` setelah respons. Uji: `test:e2e` 15/15 lulus.
- Catatan: jalankan unit test dengan `bun run test` (vitest). `bun test`
  (runner Bun) akan ikut memungut `tests/e2e/*.spec.ts` dan tak mendukung
  `vi.mocked`, jadi hasilnya bukan indikasi bug aplikasi.

### Kebersihan kode & konsolidasi struktur (2026-10-19, putaran akhir)

- [x] **BERSIH-01** Kode mati hasil `bunx knip` dihapus: `src/lib/utils.ts`
      (helper `cn` tak terpakai — komponen memakai paket `cn`), dependensi
      `clsx`, `tailwind-merge`, `@tanstack/intent`, dan blok `pnpm.onlyBuiltDependencies`
      (config mati di repo bun-only) diganti `trustedDependencies` (ekuivalen bun).
- [x] **BERSIH-02** Konsolidasi type ke `src/types/`: `JenisPajak`/`TarifPajak`
      → `src/types/pajak.d.ts`; `HasilBatasi` → `src/types/rate-limit.d.ts`;
      `KunciAkses` → `src/types/peran.d.ts` (nilai `AKSES` di `src/server/peran.ts`
      dijaga sinkron lewat `satisfies Record<KunciAkses, readonly Role[]>`);
      duplikat `TandaTanganUnggah` di `src/server/cloudinary.ts` dihapus (pakai
      `src/types/cloudinary.d.ts`).
- [x] **BERSIH-03** Duplikat konstanta `METODE` di `MetodeBayar.tsx` dihapus →
      memakai `METODE_BAYAR` dari `src/validations/transaksi.ts` (satu sumber,
      sudah jadi basis `MetodeBayar` di `src/types/transaksi.d.ts`);
      `PembayaranPanel.tsx` ikut diubah (tidak lagi re-export type).
- [x] **BERSIH-04** Verifikasi struktur: semua hook React di `src/hooks/` (3 file),
      semua skema Zod di `src/validations/` (17 file; pengecualian sengaja: skema
      env di `src/env.ts`), type/interface domain di `src/types/`. yang sengaja
      tetap inline hanya tipe lokal non-domain (props framework `MyRouterContext`,
      `KonteksServer`, `ModulGalat`, `SidebarContextProps` shadcn).
- [x] **BERSIH-05** `.gitignore` dirapikan (kepala bagian per kategori; tambah
      `*.log`, `.eslintcache`, `*.tsbuildinfo`, `.playwright/`, `.idea/`; entri
      `*.avif` dihapus karena berisiko memblokir aset gambar web yang sah).
      `README.md` diperbarui (struktur folder + catatan knip).
- Catatan hasil pindai: hand-written code 0 `any`, 0 `@ts-ignore`,
  0 TODO/FIXME; `xlsx` & `@react-pdf` hanya di sisi server (tak masuk bundle klien).
- [x] **PERF-01** Infra React Query dihapus — memang **tidak pernah dipakai**
      (0 `useQuery`/`useMutation`; data lewat `loader` + server fn). Yang dihapus:
      `src/integrations/` (root-provider + devtools query), integrasi
      `setupRouterSsrQueryIntegration`, plugin Query di devtools, dan dependensi
      `@tanstack/react-query`, `@tanstack/react-query-devtools`,
      `@tanstack/react-router-ssr-query`. Bukti: chunk utama klien 428→401 KB,
      0 string `react-query`/`QueryClient` di `.output/public`.
- [x] **PERF-02** `urlGambarCloudinary` (resize `w_*,q_auto,f_auto`) sekarang
      dipakai di semua tampilan foto produk non-tabel: grid kasir, menu pesanan
      pelanggan (`ProdukItem`), produk terpopuler di `/member`, dan preview
      `ProdukForm` — sebelumnya hanya thumbnail tabel produk yang dioptimalkan,
      sisanya menyajikan gambar ukuran penuh.
- [x] **BERSIH-06** Sisa export mati hasil `bunx knip` ditutup: re-export
      `publicIdDariUrl`/`urlUnduhAman` di `src/server/cloudinary.ts` dihapus
      (tes memakai `#/server/bantu.cloudinary` langsung), `apiPenggunaOpsional`,
      `validasiModifier` tidak lagi diekspor (internal), `AsetUrlInput` dihapus,
      re-export tipe pajak di `src/server/pajak.ts` dihapus. Knip kini hanya
      menyisakan `src/generated/prisma/*`, export registry `ui/*`, dan
      false-positive `pino-pretty`/`dotenv run`.

---

## BACKLOG KEAMANAN — Tindak Lanjut Audit 2026-10-23

> Sumber: verifikasi ulang 10 temuan pada kode aktual (TanStack Start + Better Auth +
> Prisma). **Tidak ada temuan Critical**: tidak ada RCE, bypass autentikasi tanpa
> kredensial, atau kebocoran data lintas pengguna. Status: **SEC-20 dan SEC-27
> selesai 2026-10-23**; item `[ ]` lainnya belum dikerjakan. Urutan kerja:
> **High → Medium → Low**.
> Gate tiap item: `tsc --noEmit`, `lint`, `check`, `docs:check`, `test:vitest`,
> `test:e2e` bila route/guard berubah, `build`, dan `perf:budget` setelah build.

### Ringkasan prioritas

| Prioritas        | ID     | Temuan                                        | Status | Alasan singkat                                                                |
| ---------------- | ------ | --------------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| **Critical**     | —      | Tidak ada                                     | —      | Tidak ada RCE, bypass auth tanpa kredensial, atau kebocoran lintas pengguna.  |
| **High**         | SEC-20 | Rate limit percaya `X-Forwarded-For` mentah   | `[x]`  | Selesai: XFF dibaca dari kanan (+hops); endpoint auth per user.               |
| **High**         | SEC-22 | Diskon kasir tanpa batas/approval             | `[x]`  | Selesai: batas KASIR 10% (configurable), OWNER override diaudit.              |
| **High**         | SEC-27 | Sesi tidak bisa dicabut massal                | `[x]`  | Selesai: role berubah/revoke-all menghapus sesi; tombol di `/user`.           |
| **Medium**       | SEC-24 | Tulisan `device-visit` publik dapat dicemari  | `[x]`  | Selesai: token HMAC server, UA-derived, upsert per device, batas global.      |
| **Low**          | SEC-21 | `waktuKlien`/`dibuatOffline` tanpa validasi   | `[x]`  | Selesai: waktuKlien ±24 jam, diterimaPada server, laporan tetap server.       |
| **Low**          | SEC-23 | Validasi angka pengaturan pajak/mode          | `[x]`  | Selesai: pajak 0–100, enum mode/stok, konfirmasi 0, fallback legacy.          |
| **Low**          | SEC-25 | `x-client: expo` sebagai pemilih bearer token | `[x]`  | Selesai: endpoint native terpisah + verifikasi aud; web tanpa bearer.         |
| **Low / future** | SEC-26 | Isolasi multi-toko (`tokoId`)                 | `[ ]`  | Diputuskan tetap single-tenant; multi-tenant ditunda sampai kebutuhan produk. |

**Urutan eksekusi yang disarankan:** SEC-20, SEC-27, SEC-22, SEC-24, SEC-21,
SEC-23, dan SEC-25 sudah selesai. SEC-26 tetap ditunda: keputusan produk saat
ini adalah single-tenant per deployment, dan `tokoId` tidak ditambahkan
setengah-setengah.

### P1 — High (dahulukan)

- [x] **SEC-20 (High, A05/A07)** Rate limit tidak lagi mempercayai entri kiri
      `X-Forwarded-For`. **Selesai 2026-10-23:** `src/server/rateLimit.ts` menambah
      `pilihIpKlien()` yang membaca XFF dari **kanan** sebanyak
      `TRUST_PROXY_HOPS` (default `1`, sesuai satu lapis proxy Vercel), mengabaikan
      entri kiri yang bisa dipalsukan, dan fallback ke IP soket/`unknown`. Env baru
      divalidasi 1–10 di `src/env.ts` dan didokumentasikan di `.env.example`,
      `docs/DEPLOY.md`, `docs/OPERASIONAL.md`, `README.md`, dan `docs/API.md`.
      `POST /api/v1/pesanan/{id}/bayar` memakai `rateLimitPengguna()` (kunci per
      user, bukan IP bersama). Unit test `tests/vitest/api.test.ts` mencakup XFF
      palsu di kiri, dua hop, header kosong/kotor, fallback soket, dan kuota user A
      vs B.
      Kriteria terpenuhi: XFF palsu tidak membuat bucket baru; IP korban tidak bisa
      dihabiskan lewat entri kiri; endpoint publik tetap punya batas per IP.

- [x] **SEC-22 (High, A01/A06)** Batasi diskon kasir dan tambahkan approval owner.
      **Selesai 2026-10-23:** kebijakan default KASIR maks **10% dari subtotal**,
      dapat diubah OWNER di `/pengaturan` melalui `diskon_kasir_maks_persen`
      (validasi 0–100). `postingTransaksi.ts` menghitung ulang ambang dari pengaturan
      server dan menolak diskon manual KASIR di atasnya dengan galat domain (HTTP
      422). OWNER tetap boleh melewati ambang; setiap diskon OWNER di atas ambang
      dicatat ke `AuditLog` (`transaksi.diskon.owner`), dan percobaan KASIR yang
      ditolak dicatat sebagai `transaksi.diskon.ditolak` di luar transaction yang
      di-rollback. UI kasir menampilkan batas dan meng-clamp input; server tetap
      penentu akhir. Tidak ada antrean approval terpisah: persetujuan owner
      dilakukan dengan owner memposting transaksi tersebut.
      Test `tests/vitest/diskon.test.ts` mencakup normalisasi ambang, penolakan
      KASIR + audit, diskon tepat di ambang, dan override OWNER + audit.
      Kriteria terpenuhi: KASIR tidak bisa melewati ambang; OWNER bisa memberi
      diskon sesuai kebijakan; percobaan melewati ambang ditolak 422 dan tercatat.

- [x] **SEC-27 (High, A07)** Sesi dicabut saat role berubah dan tersedia
      revoke-all. **Selesai 2026-10-23:** `updateUserRole` menghapus semua `Session`
      target dalam transaksi yang sama dan mengembalikan `sesiDicabut`;
      `sinkronPeranUser` mencabut sesi lama tetapi mempertahankan sesi login yang
      baru; `revokeUserSessions` + `revokeUserSessionsFn` (owner-only) memberi aksi
      “Cabut semua sesi” di `/user`. Audit `user.role.ubah`/`user.sesi.cabut` dan log
      `user.sessions.revoked` ditambahkan. Unit test `tests/vitest/user.test.ts`
      mencakup role berubah mencabut 2 sesi, role sama tidak mencabut, revoke-all
      hanya target, user tidak ada, dan sync env mempertahankan sesi baru. Manual
      test `docs/TEST-MANUAL.md` 1.1.5/1.1.8.
      Kriteria terpenuhi: sesi lama langsung 401; sesi user lain tidak terpengaruh;
      test role change dan revoke-all tersedia.

### P2 — Medium

- [x] **SEC-24 (Medium, A09)** Perketat tulisan `device-visit`.
      **Selesai 2026-10-23:** endpoint publik tetap ada, tetapi body hanya berisi
      `token` HMAC-SHA256 yang diterbitkan `POST /api/v1/device-visit-token`.
      `deviceId` diturunkan server dari IP + User-Agent, OS/klasifikasi/nama
      perangkat diturunkan dari User-Agent, dan lokasi hanya dari header geolokasi
      platform (Vercel/Cloudflare). `DeviceVisit.deviceId` kini unik dengan
      `terakhirDilihat`/`jumlahKunjungan`; tulisan memakai upsert sehingga perangkat
      sah tidak menambah baris berulang. Token terikat User-Agent dan kedaluwarsa
      30 hari; token palsu/berbeda UA ditolak. Batas per IP diturunkan menjadi 20/menit
      dan ditambah batas global 600/menit (token: 10/menit per IP, 120/menit global).
      Migrasi `20261023120000_sec_21_22_24` mendedupe data lama sebelum unique index.
      Test `tests/vitest/deviceToken.test.ts` dan `deviceVisit.test.ts` mencakup
      determinisme token, penolakan token palsu/UA beda, derivasi perangkat, upsert,
      dan sanitasi IP/DNS.
      Kriteria terpenuhi: data palsu tidak menambah baris baru; perangkat sah tetap
      tercatat; endpoint tetap tidak membocorkan data ke publik.

### P3 — Low

- [x] **SEC-21 (Low, A04)** Validasi `waktuKlien` dan `dibuatOffline`.
      **Selesai 2026-10-23:** `PostingTransaksiSchema` menolak `waktuKlien` yang
      selisihnya lebih dari ±24 jam dari jam server, menolak tanggal tidak valid, dan
      mewajibkan `idempotencyKey` bila `dibuatOffline=true`. `Transaksi` mendapat
      kolom `diterimaPada` yang selalu diisi server; laporan resmi tetap memakai
      `tanggal`/`diterimaPada`, bukan `waktuKlien`. Data lama diisi dari `createdAt`
      oleh migrasi. Test `tests/vitest/idempotensi.test.ts` mencakup waktu masa
      depan/masa lalu ekstrem, offline tanpa kunci, serta penyimpanan `diterimaPada`.
      Kriteria terpenuhi: waktu di luar batas ditolak; laporan memakai `tanggal`
      server; test regresi tersedia.

- [x] **SEC-23 (Low, A04)** Validasi numerik pengaturan pajak/mode. Selesai:
      `SetPengaturanSchema` menolak `pajak_*` kosong/non-angka/di luar 0–100 serta
      membatasi `mode_fnb` ke `true|false` dan `stok_dikurangi_saat` ke
      `order|payment`; string kosong pada kunci pajak baru jatuh ke `pajak_persen`
      legacy, bukan diam-diam menjadi 0. UI mempertahankan input kosong agar
      ditolak, dan meminta konfirmasi saat tarif diturunkan ke 0. Audit before/after
      tetap. Test: `tests/vitest/pengaturan.test.ts`, `tests/vitest/pajak.test.ts`.

- [x] **SEC-25 (Low, A07)** Pisahkan jalur token native dari header `x-client`.
      **Selesai 2026-10-23:** `POST /api/v1/auth-social` kini hanya mengembalikan
      `{ user }` + cookie httpOnly dan tidak pernah memuat `session.token`,
      termasuk bila klien mengirim `x-client: expo` palsu. Token bearer hanya
      keluar dari endpoint terpisah `POST /api/v1/auth-native`, yang aktif bila
      `GOOGLE_NATIVE_CLIENT_ID` diisi, berbeda dari `GOOGLE_CLIENT_ID`, dan klaim
      `aud` Google ID token cocok dengan client native tersebut. Jalur langsung
      Better Auth `/api/auth/sign-in/social` dengan `idToken` diblokir plugin
      `nativeIdTokenGuard` kecuali memakai header internal acak per proses dari
      panggilan server-ke-server. Respons Better Auth `/api/auth/get-session`
      dan `/api/auth/list-sessions` juga tidak lagi memuat `session.token`,
      dan header `set-auth-token` dihapus dari semua respons Better Auth
      (plugin `sembunyikanTokenSesi`), menutup jalur cookie → bearer. Mobile
      memakai `expo-secure-store` (lihat `docs/EXPO.md`). Test regresi:
      `tests/vitest/auth-native.test.ts`,
      `tests/vitest/auth-routes.test.ts` (header `x-client` palsu, token web ke
      endpoint native, client native belum dikonfigurasi).

- [ ] **SEC-26 (Low / future, A01)** Isolasi multi-toko.
      **Keputusan produk 2026-10-23: tetap single-tenant per deployment; item
      ditunda, bukan dikerjakan sebagian.** PRD menyatakan single-tenant; schema
      tidak punya `tokoId`, dan semua OWNER saat ini adalah co-owner toko yang
      sama sehingga belum ada IDOR antar-tenant. Jangan menambahkan `tokoId`
      setengah-setengah. Implementasi hanya dimulai bila multi-tenant menjadi
      kebutuhan produk yang disetujui: tambah `tokoId` pada master/transaksi,
      scope semua query, guard per toko, migrasi data, dan test isolasi.
      Kriteria bila dimulai: user toko A tidak bisa membaca/menulis data toko B;
      test isolasi lintas toko tersedia.

### Ditunda / bukan temuan keamanan

- **Roadmap fitur:** QR dine-in/delivery, offline-first Expo, laporan/analitik
  komprehensif, dan verifikasi penyimpanan token Expo sudah dicatat sebagai
  `FIT-01`..`FIT-04` di bagian **RENCANA — Fitur Utama POS**. Tidak ada item
  keamanan backend yang perlu ditindaklanjuti dari daftar ini.

---

## BACKLOG — Analisis 2026-10-19 (Belum Dikerjakan)

> Semua item di bawah `[ ]` — **belum diimplementasikan**, hasil analisis keamanan/performa/kesehatan seluruh codebase. Prioritas: P0 dulu (blokir/hardening produksi), lalu P1 (operasional toko), P2 opsional. Tiap item wajib lolos gate penuh (tsc/lint/check/test/test:e2e/build) + update `docs/API.md` bila menyentuh kontrak API.

### P0 — Sebelum dipakai uang sungguhan (kecil, cepat)

- [x] **DEP-01** Neon aktif: `.env.local` → `DATABASE_URL` (pooled, runtime) +
      `DATABASE_URL_UNPOOLED` (direct, CLI). Catatan: database `neondb` ternyata berisi
      45 tabel aplikasi HR lain (gaji/cuti/presensi) — **data lama dihapus (DROP SCHEMA
      public) atas instruksi eksplisit user, tanpa backup** (pilihan user), lalu
      `db:push` (3,4 dtk) + `db:seed` sukses. Verifikasi: unit 152/152 & e2e 15/15
      berjalan terhadap Neon.
- [x] **DEP-02** Prisma Migrate aktif: baseline `prisma/migrations/20261019000000_baseline/`
      (467 baris SQL, `migrate diff --from-empty --to-schema`) + `migration_lock.toml`;
      `migrate resolve --applied` di Neon & Postgres lokal; skrip `db:migrate:deploy` + `db:migrate:status`; CI "Push skema" → "Apply migrations (migrate deploy)";
      README + AGENTS diperbarui. `migrate status` = up to date, `deploy` = no pending.
- [x] **KDS-01** Selesai: `src/routes/dapur.tsx` kini `await router.invalidate()`
      setelah `ubahStatus` + auto-refresh `setInterval` 20 dtk (hanya saat tab
      terlihat). Gate penuh hijau (tsc/lint/check/152 unit/15 e2e/build).
- [x] **OBS-01** Panduan ops ditulis di `docs/OPERASIONAL.md` (PITR/backup Neon +
      uji restore, monitor uptime `/api/v1/health`, env produksi Vercel). Aksi
      konsol (Neon/Vercel/uptime) dilakukan user — lihat checklist di dokumen itu.
      env-gated `SENTRY_DSN` via `@sentry/tanstackstart-react`.

### P1 — Operasional toko inti

- [x] **SHIFT-01** Shift kas: model `Shift` (kasir, waktu buka/tutup, kas awal,
      kas akhir, selisih) + halaman buka/tutup + rekap di laporan. `Transaksi.kasirId`
      sudah ada — diikat ke shift otomatis saat posting.
- [x] **RETUR-01** Retur/refund pasca-jual: model `Retur` (transaksi asal, item, qty,
      alasan) + balik stok + jurnal pembalik (kebalikan postingan semula) + tampil di
      struk/laporan. (Sekarang nol — pembatalan hanya status pesanan F&B `DIBATALKAN`.)
- [x] **OPNAME-01** Stok opname: model `StokOpname` (bahan/produk, stok tercatat vs
      fisik, selisih, catatan) + log siapa/kapan. (Koreksi manual di form saat ini
      tanpa jejak.)
- [x] **PAJAK-04** Laporan rekap pajak periode (PB1/PPN) + ekspor — data sudah
      tersimpan per transaksi (`Transaksi.pajakJenis`, `pajak`) dan sudah ikut dihitung
      di laporan penjualan (`src/server/laporanPenjualan.ts:105`); tinggal laporan khusus.
- [x] **SUPPLIER-01** Field `supplierId` opsional di `PembelianBahan` (schema + validasi +
      server); harga beli otomatis jadi harga kulakan bahan. Master supplier + pilih di
      form + laporan belanja → SUPPLIER-02.
- [x] **AUDIT-01** Tabel `AuditLog` (user, aksi, entitas, before/after) + migrasi — siap
      dipakai; penulisan otomatis & cara melihat log → AUDIT-02.
- [x] **SUPPLIER-02** Master supplier (CRUD UI + REST) + pilih supplier di form pembelian +
      laporan belanja; opsional hutang usaha. Selesai: halaman `/supplier` (CRUD + rekap
      belanja & hutang per supplier + dialog pelunasan), REST `/api/v1/supplier`
      (GET/POST/PUT/DELETE + `?hutang=` + `{ bayar }`), pilih supplier + centang "beli
      hutang" di form pembelian bahan, laporan belanja `/laporan-belanja` (+ ekspor
      CSV/XLSX/PDF, `GET /api/v1/laporan-belanja`), hutang usaha: `PembelianBahan.belumDibayar` + model `PembayaranHutang` (migrasi `20261020015259_add_hutang_supplier`) + pelunasan
      parsial; i18n ×4 + `docs/API.md` + unit test (`tests/vitest/supplier.test.ts`,
      `tests/vitest/laporan-belanja.test.ts`).
- [x] **AUDIT-02** Tulis `AuditLog` di mutasi sensitif (perubahan harga, role, hapus data,
      pengaturan) + halaman/endpoint untuk melihat log. Selesai: helper `src/server/audit.ts`
      (`catatAudit` best-effort + `selisihField` hanya simpan field yang berubah), penulisan
      di produk (ubah/aktif/hapus), bahan (ubah/hapus), kategori (hapus), role user,
      pengaturan, supplier (buat/ubah/hapus) & pelunasan hutang; halaman `/audit-log`
      (filter entitas/aksi/tanggal + paging) + REST `GET /api/v1/audit-log`; i18n ×4 +
      `docs/API.md` + unit test (`tests/vitest/audit.test.ts`).
- [x] **MOBIL-01** Kesiapan backend untuk aplikasi Expo (native) — plugin `bearer`
      Better Auth aktif (`src/lib/auth.ts`) sehingga sesi mobile bisa dikirim lewat
      header `Authorization: Bearer <token>` (React Native tak punya cookie jar);
      CORS + preflight `OPTIONS` untuk origin tepercaya (Expo Web) di
      `src/lib/csp.ts`; endpoint baru `GET /api/v1/saya` (profil + riwayat milik
      pengguna yang login, untuk app member); panduan integrasi mobile
      `docs/EXPO.md` (auth, peta endpoint per layar, env, batasan, yang belum ada);
      unit test `tests/vitest/auth-bearer.test.ts`; `docs/API.md` + `.env.example` diperbarui.
- [x] **UI-04** UI web master printer & antrean cetak — halaman `/printer`
      (CRUD printer: nama, tipe ESC_POS/RAW, lokasi, perangkat, default, aktif;
      satu printer default) & `/percetakan` (antrean job: filter status, ambil →
      DIPROSES, tandai dicetak/gagal + alasan, pratinjau isi struk); memakai server
      fn yang sama dengan REST (`src/server/percetakanFn.ts`); komponen
      `src/components/printer/*` & `src/components/percetakan/*`; i18n ×4; nav
      RelNav; e2e guard rute baru.
- [x] **SEED-01** Seed dibenahi — `prisma/seed.ts` dipecah ke `prisma/seed/*`
      (dasar, bersihkan, bahan, menu-makanan, menu-minuman, produk, master) agar
      tiap berkas < 397 baris; pembersihan kini mencakup SELURUH tabel (sebelumnya
      tabel baru tertinggal & seed kedua gagal karena SKU bentrok); seed menambah
      master baru: 2 printer (1 default), 2 supplier, 3 meja, 3 grup modifier +
      7 modifier (dipasang ke produk terpilih), member contoh ber-email (untuk uji
      `/api/v1/saya`); test `tests/vitest/retur.test.ts` kini membersihkan sisa
      data uji (sebelumnya meninggalkan user/kategori/produk di DB).
- [x] **WARN-01** Warning "SECURITY WARNING: sslmode=require" dari driver `pg`
      hilang — `src/ssl.ts` menormalisasi `sslmode=require|prefer|verify-ca` →
      `verify-full` (dihasilkan Neon & PostgreSQL modern; 'disable' untuk
      PostgreSQL lokal dibiarkan); dipakai `src/database-url.ts` (runtime + CLI) dan
      `prisma.config.ts` (migrate/seed).
- [x] **TEST-MANUAL-01** Checklist uji manual web + backend (3–4 hari) —
      `docs/TEST-MANUAL.md`: auth & guard peran, master data, kasir & struk,
      printer & antrean cetak, laporan & ekspor, supplier/pasar/hutang, mode F&B,
      smoke + uji beban REST, uji offline, perangkat keras, penutup + gate.
- [x] **CLN-09** Dead-code audit rapi — `knip.json` (config) dibuat supaya
      `bunx knip` meaningful: file generated Prisma/paraglide/routeTree & `ui/`
      dikecualikan, dependensi CSS-only (`tailwindcss`, `tw-animate-css`,
      `@tailwindcss/typography`) & `pino-pretty` di-ignore (dipakai lewat CSS/log
      dinamis). Tipe mati dihapus: `MemberSiap`, `StatusPrintJob`,
      `FormatEksporBelanja`, `SupplierIdInput`, `FormatEksporPajak`,
      `OpnameItemInput`, `JenisMasterInput`, `ReturItemInput`, `AksiShiftInput`.
      Hasil `bunx knip`: 0 unused file/export (kecuali 2 hint konfigurasi).
- [x] **TEST-UI-01** Uji render UI printer & antrean cetak — `tests/vitest/ui-percetakan.test.tsx`
      merender komponen tabel ke HTML statis (`react-dom/server`) sehingga error
      runtime komponen tertangkap; `vitest.config.ts` kini menyertakan `*.test.tsx`.
- [x] **TEST-ISO-01** Isolasi data uji dicoba lewat skema `pos_test` (search_path),
      tapi **Prisma 7 + driver adapter `@prisma/adapter-pg` mengabaikan** parameter
      `schema`/`options` (engine mengatur search_path sendiri) → data uji tetap
      menimpa data dev. Isolasi dibatalkan (skema `pos_test` sudah di-drop);
      gantinya: `bun run db:reset` (alias `db:seed`) untuk mengisi ulang data demo
      setelah `bun run test`, plus catatan di README & checklist uji manual.
- [x] **UI-05** Chrome (sidebar, navbar, footer) — sistem warna & tipografi sendiri:
      teks **#002037** (terang) / **#e8dccb** (gelap), permukaan hangat
      (`--chrome-bg`), garis tipis (`--chrome-border`), bayangan tipis 1px
      (`--chrome-shadow`), state aktif `--chrome-active`; brand memakai
      **Fraunces** (serif) sebagai identitas, teks nav tetap sans (legibilitas);
      token sidebar shadcn diturunkan dari token chrome; `blur` pada navbar
      dihapus (R-10: kaca bukan default) & aturan `a` global dipindah ke
      `@layer base` supaya utility Tailwind bisa menimpanya (label sidebar tak
      lagi biru); nav bawah mobile pakai token chrome + scroll-snap; teks
      "Masuk" & link navbar/footer memakai `.chrome-link`. Diverifikasi lewat
      Playwright (computed style + screenshot) di terang/gelap × desktop/mobile:
      0 overflow horizontal, 0 error konsol.
- [x] **E2E-AUTH-01** E2e untuk halaman yang butuh login — cookie sesi Better Auth
      bisa ditandatangani (HMAC-SHA256(secret, token) → base64) sehingga
      `tests/e2e/auth.spec.ts` membuat user OWNER + sesi di DB lalu menguji
      **20 halaman owner** (kasir, dashboard, produk, member, bahan, supplier,
      printer, percetakan, laporan, user, pengaturan, shift, retur, opname, meja,
      dapur, audit-log) → tiap halaman harus 200, tanpa pesan galat, tanpa error
      konsol, dan **tetap di URLnya** (bukan jatuh ke /login).
- [x] **BUG-02** Halaman `/member` 500 "Invalid input: expected object, received
      undefined" — `produkTerpopulerFn()` dipanggil tanpa argumen padahal
      validator-nya mewajibkan objek. Perbaikan: `ProdukTerpopulerSchema` punya
      `.default({})` + validator `parse(input ?? {})` + pemanggilan eksplisit
      `{ data: {} }`.
- [x] **ORIGIN-01** Origin lokal dev (Expo 8081/19006, e2e 3100, POS 3000)
      otomatis diizinkan saat `NODE_ENV !== 'production'` → POST tracker tak lagi
      403 dan Expo Web tak perlu tambah TRUSTED_ORIGINS tiap mesin.
- [x] **DEV-01** Dev server basi setelah ubah skema → `predev: prisma generate`
      (script `bun run dev` selalu regenerate Prisma client dulu, jadi query ke kolom
      baru tak gagal dengan "Unknown argument"). Error 500 di `/user` yang muncul
      berasal dari proses dev lama (start 15:41) yang masih memegang client
      sebelum migrasi `role_manual` — kode & DB sudah benar (terbukti: server
      baru → `GET /user` 200, isi tabel + keterangan role tampil).
- [x] **TEST-ISO-01** Test `member.test.ts` bergantung pada setting global
      `riwayat_belanja_aktif` → gagal saat flag dimatikan manual. Sekarang test
      mengaktifkan flag sendiri di `beforeAll` & mengembalikannya di `afterAll`.
- [x] **AUTH-02** Peran bisa dikelola dari **UI `/user`** (bukan hanya env) —
      field `User.roleManual` menandai peran yang dipilih manual; sinkronisasi
      otomatis `OWNER_EMAILS`/`KASIR_EMAILS` **melewati** akun manual (pilihan owner
      menang), dan halaman `/user` menampilkan keterangan "Diatur manual" vs
      "Mengikuti env". Migrasi `20261020085419_add_role_manual`; unit test
      (`tests/vitest/user.test.ts`: manual ditandai, env tidak menimpa manual).
- [x] **BUG-01** Halaman `/kasir` crash (`Cannot read properties of undefined
(reading 'qty')`) — `cart[p.id].qty` diakses tanpa fallback padahal produk
      belum ada di keranjang. Perbaikan: `cart[p.id]?.qty ?? 0` (ProdukGrid) dan
      `PanelBayar` melompati baris keranjang yang produknya sudah tak ada di
      master. Tipe store `kasir-store.ts` dibenahi jadi `Partial<Record<...>>`
      (sebelumnya `Record` berbohong → bug lolos typecheck). Tes regresi render
      `tests/vitest/ui-kasir.test.tsx` (terbukti gagal tanpa perbaikan).
- [x] **AUTH-01** Peran user tidak sinkron dengan `OWNER_EMAILS` — akun yang dibuat
      **sebelum** env diisi tersimpan sebagai MEMBER selamanya (hook
      `databaseHooks.user.create` hanya jalan saat pembuatan), jadi tombol
      Kasir/Dashboard tak muncul bagi owner sungguhan. Perbaikan: helper murni
      `src/lib/peran-email.ts` (`peranDariEmail`) + sinkronisasi role di
      `databaseHooks.session.create.after` (promosi saja; OWNER tak pernah
      diturunkan otomatis) + akun lama yang tertinggal diperbarui di DB
      (`adhitiadwima@gmail.com` → OWNER). Unit test `tests/vitest/peran-email.test.ts`.
- [x] **LOG-01** `pino.transport` gagal di Vite/ESM ("unable to determine
      transport target for pino-pretty") → `src/lib/logger.ts` memakai
      **pino-pretty sebagai stream** di proses yang sama (tanpa worker thread,
      tanpa thread tambahan); JSON tetap dipakai di produksi & test.
- [x] **QA-01** QA web (firecrawl-qa workflow, browser lokal) — 6 halaman publik +
      18 kasus error API + 4 breakpoint responsif diuji. Temuan & perbaikan:
      (1) `POST /api/v1/kunjungan` membalas **401 di semua halaman publik**
      (tracker analytics memanggilnya untuk pengunjung anonim) → endpoint dibuat
      publik, `userId` dari sesi bila ada, `userType` non-member untuk anonim
      (server tetap mengabaikan userId dari klien & mengecualikan OWNER/KASIR);
      (2) kolom pencarian `/pesanan` **mati** (tak ada onChange/filter) → kini
      menyaring produk + pesan "tidak ada produk yang cocok";
      (3) endpoint `/api/v1/*` tak dikenal balas **HTML**, bukan envelope JSON
      (klien Expo gagal `res.json()`) → route catch-all `src/routes/api/v1/$.ts`;
      (4) halaman 404 polos "Not Found" tanpa h1/aksi → `notFoundComponent`
      berpintu (judul, penjelasan, tombol kembali, i18n ×4);
      (5) judul tab semua halaman "POS" → judul per halaman (publik via `head`,
      halaman app via DashboardLayout);
      (6) target sentuh < 44px (theme toggle, locale, CTA landing, tombol
      produk/pesanan, link footer) → area sentuh dinaikkan ke 44px;
      (7) `<meta name="description">` tak ada → ditambahkan.
      Hasil akhir: 0 error konsol, 0 respons 4xx tak terduga, 0 overflow
      horizontal di 390/768/1280/1920px.
- [x] **MOBIL-02** Kontrak offline (idempotensi) di backend — `Transaksi.idempotencyKey`
      (unik) + `dibuatOffline` + `waktuKlien` + `hpp`/`diskonMember` tersimpan (biar
      replay sama persis); `POST /api/v1/transaksi` menerima `idempotencyKey` dan
      mengembalikan transaksi yang sama dengan `replay: true` saat retry (stok &
      pendapatan tak dobel); konflik P2002 ditangani sebagai replay; outbox web
      (`src/lib/outbox.ts`) kini memakai `id` antrean sebagai kunci idempotensi;
      migrasi `20261020031500_add_idempotensi_dan_print_job`; unit test
      `tests/vitest/idempotensi.test.ts`.
- [x] **MOBIL-03** Kontrak printer di backend — model `Printer` (master perangkat) &
      `PrintJob` (antrean cetak: MENUNGGU → DIPROSES → DICETAK/GAGAL, payload struk
      disusun server); REST `/api/v1/printer` (CRUD + `/printer/default`),
      `/api/v1/percetakan` (buat job + polling), `/percetakan/$id/ambil|selesai|gagal`
      (klaim satu kali, laporan hasil); `idempotencyKey` pada job agar retry tak
      menghasilkan job ganda; server fn `src/server/percetakanFn.ts`; unit test
      `tests/vitest/percetakan.test.ts`; didokumentasikan di `docs/API.md` + `docs/EXPO.md`.
- [x] **PRINT-02** Cetak ulang dari antrean struk — OWNER tanpa batas; KASIR
      maksimal tiga kali per transaksi. Selesai: `buatPrintJob` menaikkan
      `cetakOwner`/`cetakKasir` dan membuat PrintJob dalam satu transaksi DB;
      KASIR ditolak setelah 3 cetak, OWNER tanpa batas. Antrean web menampilkan
      hitungan OWNER/KASIR dan menyembunyikan tombol cetak ulang saat batas
      tercapai; REST `/api/v1/percetakan` mengembalikan penghitung dan menegakkan
      batas. Test domain, UI, dan akses kasir lulus; gate repo (tsc, lint, check,
      unit, e2e, build, perf) lulus 2026-10-23.
- [x] **API-01** REST retur/opname untuk Expo: `GET/POST /api/v1/retur` (+
      `retur/produk-aktif`, `retur/transaksi?id=`), `GET/POST /api/v1/opname` (+
      `opname/master?jenis=`), guard OWNER+KASIR, envelope standar; didokumentasikan di
      `docs/API.md` (katalog + DTO + tabel Fn).
- [x] **SUPPLIER-03** Belanja bahan tanpa supplier (belum ada supplier terdaftar) →
      belanja ke pasar online/offline. Selesai: `PembelianBahan.sumberBelanja`
      (`SUPPLIER`/`PASAR_ONLINE`/`PASAR_OFFLINE`) + `tempatBelanja` (nama pasar/toko),
      migrasi `20261020023732_add_sumber_belanja`; server memaksa `SUPPLIER` bila ada
      supplier dan menolak pembelian tanpa supplier yang belum menandai sumber pasar
      (422); form pembelian menampilkan pilihan "Pasar Online/Offline" + kolom tempat
      belanja saat supplier dikosongkan; riwayat pembelian & laporan belanja menampilkan
      sumber (rekap `perSumber`, filter per sumber, ekspor CSV/XLSX/PDF); i18n ×4 +
      `docs/API.md` + unit test (`tests/vitest/pembelianBahan.test.ts`,
      `tests/vitest/laporan-belanja.test.ts`).

### P2 — Opsional / pertumbuhan (bukan bug)

- [x] **OPT-01** Paginasi daftar master (produk/member/bahan). Cache TTL dihapus — tanpa
      invalidasi berarti data basi (Postgres tetap sumber kebenaran).
- [x] **CI-01** Threshold coverage di CI + job e2e Playwright di CI (sekarang CI
      hanya typecheck/lint/format/build/unit/audit; e2e jalan lokal).
- [x] **BIZ-01** Keputusan bisnis M-01: `POST /api/v1/pesan` publik mengurangi stok —
      diputuskan stok dipotong **saat pembayaran dikonfirmasi**, bukan saat order.
      Implementasi dan pengujian ada di **SEC-15** (2026-10-23).
- [x] **MCP-01** MCP Server `mcp/server-expo.ts` untuk integrasi Expo — mengekspor 7 tool
      (expo_api_docs, expo_expo_docs, expo_prd_ai, expo_operasional, expo_readme,
      expo_barriers, expo_all_docs) yang membaca docs/API.md, EXPO.md, PRD-AI.md,
      OPERASIONAL.md + barriers keamanan mobile. JSON-RPC over stdio; typecheck lulus.
- [x] **MCP-02** Konfigurasi klien OpenCode — `opencode.json` (project) +
      `C:\Users\humas\.config\opencode\opencode.json` (global) terdaftar 5 server MCP:
      pos-expo, pos-backend (stdio/Bun), firecrawl, tavily, exa (remote). API key
      remote tersimpan di konfigurasi global, bukan di repo ini. Verifikasi JSON valid.
- [x] **MCP-03** Perbaiki MCP gagal konek (`failed: Request timed out`) + tool baca
      repo backend: transport stdio dipusatkan di `mcp/stdio.ts` (satu pesan JSON per
      baris; framing `Content-Length` ala LSP dihapus), tool `repo_list_files`,
      `repo_read_file`, `repo_search` di `mcp/repo.ts` (allowlist `docs/`, `src/`,
      `prisma/`, `tests/`, `scripts/`, `messages/`, `.agents/`; tolak path absolut,
      `..`, symlink, `.env*`), dipakai `pos-expo` + `pos-backend`; konfigurasi V2
      dirapikan (`type` + `command` array) di project, `pos_mobile/opencode.json`,
      dan global; regresi `tests/vitest/mcp.test.ts`; `opencode mcp list` semua
      connected. Semua kode MCP dikonsolidasi ke `mcp/**`, dan `mcp/` + tes MCP
      di-`.gitignore` (dev-only, dilarang commit). API key remote dipindah ke
      `~/.config/opencode/secrets/` via substitusi `{file:...}`.
- [x] **MOBIL-04 / SEC-28** Perbaiki autentikasi klien Expo — ganti
      `POST /api/v1/auth-social` → `POST /api/v1/auth-native`, ganti cookie header →
      `Authorization: Bearer <token>`, hapus `x-client: expo` (bukan security boundary),
      hapus dead code `getSessionCookieName`. `tsc --noEmit` pos_mobile lulus; 0 referensi
      lama tersisa. Dokumentasi di `docs/MOBILE-INTEGRASI.md`.
- [x] **MOBIL-05** `.env.example` untuk pos_mobile — `EXPO_PUBLIC_API_BASE_URL`
      (IP LAN untuk device, 10.0.2.2 untuk emulator Android, localhost untuk dev)

---

## RENCANA HARDENING PRINTER (2026-10-21) — Belum Dikerjakan

> Sumber: review kode `src/server/percetakan.ts`, `src/routes/api/v1/printer/**`,
> `src/lib/printer-daftar.ts`, dan endpoint `/api/v1/percetakan`. Ini **bukan**
> hasil pentest penuh. Urutan pengerjaan: keamanan → performa/konsistensi → fitur.
> Setiap item wajib lolos gate penuh (`tsc`, `lint`, `check`, `test`, `test:e2e`,
> `build`) sebelum dicentang.

### Keputusan awal (dapat diubah sebelum implementasi)

- Batas perangkat: **20 baris per user** (aktif + nonaktif), bukan hanya aktif.
- Rate limit: GET 60/10 detik, POST/PUT/DELETE 20/10 detik, per user setelah guard.
- Nonaktifkan perangkat sebagai aksi default; hapus permanen hanya bila tidak punya
  riwayat `PrintJob`.
- Printer default per user memakai kolom baru `defaultPengguna`; `default` global
  yang lama tetap dipakai sebagai fallback web/master.

### Fase 1 — Keamanan (P1)

- [x] **PRN-SEC-01** Tambah rate limit di seluruh endpoint printer/percetakan:
      `GET/POST /api/v1/printer/perangkat`, seluruh `/api/v1/printer`,
      `GET /api/v1/printer/default`, dan `/api/v1/percetakan` beserta aksi
      `ambil|selesai|gagal`.
      Gunakan `batasi()` dengan kunci per user (`printer:<aksi>:<userId>`) setelah
      guard; balas envelope 429 + `Retry-After`. Jangan hanya mengandalkan IP agar
      satu kantor/NAT tidak saling memblokir.
      Kriteria: request melebihi batas → 429; user lain tidak terpengaruh; test
      unit untuk ambang batas dan header.

- [x] **PRN-SEC-02** Batasi jumlah perangkat per user.
      Sebelum upsert, hitung seluruh baris `Printer` milik user (bukan hanya
      `aktif`). Bila perangkat baru dan jumlah sudah 20 → `409 LIMIT_PERANGKAT`
      dengan pesan aman. Lakukan cek + upsert dalam transaksi dan kunci baris
      `User` (`SELECT ... FOR UPDATE`) agar dua request paralel tidak melewati
      batas. Perangkat lama yang sudah ada tetap boleh di-update.
      Kriteria: perangkat ke-21 ditolak; update perangkat lama tetap 201/200;
      uji paralel tidak menghasilkan 21 baris.

- [x] **PRN-SEC-03** Audit log untuk mutasi printer.
      Tulis `catatAudit` di create/update/delete master printer dan registrasi
      perangkat. Aksi: `printer.buat`, `printer.ubah`, `printer.hapus`,
      `printer.perangkat.daftar`, `printer.perangkat.nonaktif`. Simpan hanya field
      yang berubah via `selisihField`; scan berulang yang tidak mengubah data
      (selain `dipindaiPada`) tidak perlu menulis audit baru.
      Kriteria: baris audit berisi aktor, entitas, `before/after`; tidak ada
      serial/vendor bocor ke klien; kegagalan audit tidak menggagalkan mutasi.

- [x] **PRN-SEC-04** Lengkapi matriks otorisasi printer.
      Tambah test untuk: OWNER boleh CRUD master; KASIR boleh GET/POST perangkat
      miliknya tetapi 403 untuk CRUD master; MEMBER 403 di semua endpoint;
      anonymous 401; user B tidak bisa melihat/menonaktifkan perangkat user A;
      `userId` di body diabaikan dan selalu memakai sesi.
      Kriteria: test E2E/unit di atas lulus dan menjadi regression gate.

- [x] **PRN-SEC-05** Tegaskan status metadata perangkat.
      Dokumentasikan di `docs/API.md` dan `docs/EXPO.md` bahwa `vendorId`,
      `vendorName`, `serialNumber`, dan `productName` adalah metadata informatif
      dari klien, bukan bukti identitas/otorisasi. Tambah validasi karakter kontrol
      dan pertahankan batas panjang yang ada. Jangan memakai metadata ini untuk
      keputusan akses atau query mentah.
      Kriteria: dokumentasi jelas; input dengan karakter kontrol ditolak; metadata
      tetap aman ditampilkan (React escaping).

### Fase 2 — Performa & konsistensi (P1/P2)

- [x] **PRN-PERF-01** Perbaiki pengelolaan printer default agar tahan concurrent.
      `createPrinter`/`updatePrinter` saat ini mengubah default dalam dua query
      terpisah. Refactor ke satu `$transaction`: kosongkan default lama lebih dulu,
      lalu set target. Tambah partial unique index Postgres
      `printer_satu_default_global` (`WHERE default AND aktif`) dan retry
      `P2002`/`P2034` sekali. Transaksi saja tidak cukup pada READ COMMITTED;
      constraint-lah yang menutup race.
      Kriteria: dua request default bersamaan berakhir tepat satu default aktif;
      create/update yang gagal tidak menghapus default lama.

- [x] **PRN-PERF-02** Tangani race upsert perangkat.
      Bungkus `upsert` dengan penanganan `P2002`: bila baris `(userId, perangkat)`
      sudah dibuat request lain, ulangi sebagai update. Pertahankan perilaku
      metadata yang tidak dikirim tidak menghapus nilai lama.
      Kriteria: 10 request paralel untuk perangkat yang sama menghasilkan satu
      baris dan tidak ada error 500.

- [x] **PRN-PERF-03** Batasi query daftar perangkat dan tambah index komposit.
      `daftarPrinterPerangkat` memakai `take: 50` (batas perangkat 20) dan index
      `@@index([userId, aktif, dipindaiPada])`. Pertimbangkan `select` kolom yang
      dipakai saja.
      Kriteria: migration index diterapkan; `EXPLAIN` memakai index; respons tetap
      sama untuk data normal.

- [x] **PRN-PERF-04** Hindari write amplification `dipindaiPada`.
      Tunda item ini selama scan hanya terjadi saat login/manual. Bila nanti ada
      scan periodik, update `dipindaiPada` maksimal sekali per 5 menit atau hanya
      saat metadata berubah; jangan menulis ulang baris yang identik.
      Kriteria: dua scan berurutan dalam <5 menit tidak mengubah `dipindaiPada`;
      metadata yang berubah tetap tersimpan.

- [x] **PRN-PERF-05** Observability sinkronisasi perangkat.
      `simpanPerangkatPrinter` saat ini menelan semua kegagalan
      (`Promise.allSettled`) tanpa jejak. Kembalikan ringkasan
      `{ berhasil, gagal }`, catat kegagalan dengan aman (tanpa serial number),
      dan opsional retry sekali untuk error jaringan/5xx, bukan 4xx.
      Kriteria: kegagalan terlihat di log/telemetry; tidak ada data sensitif;
      pemakaian printer dari cache tetap tidak terblokir.

### Fase 3 — Fitur (P2)

- [x] **PRN-FEAT-01** Endpoint nonaktif/hapus perangkat.
      Tambah `DELETE /api/v1/printer/perangkat/$id` yang selalu memverifikasi
      kepemilikan sesi. Default: set `aktif=false` (soft delete). Dengan
      `?permanen=1`, hapus hanya bila tidak ada `PrintJob`; bila ada, tolak dan
      arahkan ke nonaktif. GET perangkat tidak lagi menampilkan yang nonaktif.
      Kriteria: user B tidak bisa menonaktifkan perangkat user A; perangkat
      nonaktif hilang dari GET; perangkat berjob tidak bisa dihapus permanen.

- [x] **PRN-FEAT-02** Printer default per user.
      Tambah `Printer.defaultPengguna` + endpoint
      `PATCH /api/v1/printer/perangkat/$id/default` (OWNER/KASIR, hanya milik
      sendiri). Endpoint mengosongkan `defaultPengguna` pada baris lain milik
      user yang sama, bukan milik user lain. Tambah partial unique index per user.
      Ubah `printerDefault(userId?)` agar memilih default user dulu, lalu fallback
      ke default global. `default` global tetap dikelola OWNER di `/printer`.
      Kriteria: default user A tidak memengaruhi user B; fallback global tetap
      bekerja; migrasi + UI/API docs diperbarui.

- [x] **PRN-FEAT-03** Riwayat scan dan terakhir digunakan.
      Audit log menjadi riwayat registrasi/perubahan perangkat (setelah
      PRN-SEC-03); `dipindaiPada` tetap berarti scan terakhir. Tambah
      `Printer.terakhirDipakai` yang diperbarui saat `PrintJob` memakai printer,
      tampilkan di `/printer`, dan sertakan di respons API. Bila nanti butuh
      riwayat **setiap** scan, buat tabel `PrinterScan` dengan retensi terpisah;
      jangan membebani `AuditLog` dengan scan berulang.
      Kriteria: registrasi/ubah metadata muncul di audit; scan berulang hanya
      memperbarui `dipindaiPada`; pemakaian printer memperbarui
      `terakhirDipakai`; UI menampilkan waktu relatif/absolut dengan aman.

### Fase 4 — Verifikasi akhir

- [x] **PRN-QA-01** Jalankan gate penuh dan perbarui dokumentasi.
      `tsc --noEmit`, `lint`, `check`, `test`, `test:e2e`, `build`; lalu
      `db:seed` untuk mengembalikan data demo. Perbarui `docs/API.md` (rate limit,
      kode `LIMIT_PERANGKAT`, endpoint nonaktif/default), `docs/EXPO.md`,
      `docs/TEST-MANUAL.md`, dan centang item di dokumen ini setelah semua lulus.
      **Diverifikasi ulang 2026-10-24:** `docs/API.md` memuat rate limit,
      `LIMIT_PERANGKAT`, endpoint nonaktif/hapus/default; `docs/EXPO.md` §7.1
      memuat siklus sesi pindai; `docs/TEST-MANUAL.md` §2.3/§5 memuat uji manual
      printer. Gate penuh hijau (tsc, lint, check, vitest 343/343, e2e 67/67,
      build, perf:budget 505,0 KB). Tidak ada item printer yang tersisa.

---

## RENCANA CI/CD & GITHUB (2026-10-21) — Belum Dikerjakan

> Sumber: audit `.github/workflows/ci.yml`, `.github/dependabot.yml`,
> `playwright.config.ts`, `package.json`, `docs/OPERASIONAL.md`, dan status git
> lokal. Temuan nyata: workflow **belum bisa hijau** (password DB salah, dependency
> coverage hilang, browser Playwright tidak dipasang), repo belum punya commit/remote,
> dan belum ada issue template/PR template/Project. Item implementasi boleh dicentang
> setelah diverifikasi lokal dengan catatan; **CICD-19 tetap wajib** sebelum pipeline
> dinyatakan hijau (butuh URL run GitHub).

### Fase 0 — Repositori & proteksi branch

- [x] **CICD-01** Siapkan repo GitHub: commit awal, remote `origin`, branch default
      `main` (atau ubah trigger workflow bila tetap `master`), lalu push. Kondisi
      sekarang: branch `master`, **belum ada commit**, **belum ada remote**.
      Selesai: repo private `https://github.com/adhitiad/pos`, branch `main`,
      commit awal `8854fa9`, remote `origin`, push pertama memicu CI.

- [ ] **CICD-02** Aktifkan ruleset/branch protection untuk `main`: wajib PR, wajib
      check `quality` + `test` + `e2e`, larang force-push dan hapus branch,
      minimal 1 approval. Kriteria: push langsung ke `main` ditolak; PR merah tidak
      bisa di-merge. **Terblokir:** repo private di GitHub Free; API ruleset dan
      branch protection mengembalikan 403 "Upgrade to GitHub Pro or make this
      repository public". Aturan yang disepakati: wajib PR + check, 0 approval
      (solo), larang force-push/hapus branch. Pilihan: upgrade Pro, ubah repo jadi
      public, atau terima tanpa proteksi.

### Fase 1 — Perbaiki pipeline yang sekarang rusak

- [x] **CICD-03** Ganti password Postgres di `.env.local` CI dari literal `***`
      menjadi `postgres` (dua tempat: job `test` dan `e2e`). Service container
      memakai `POSTGRES_PASSWORD: postgres`, jadi URL sekarang pasti gagal auth.
      Selesai: kedua URL diperbaiki; verifikasi runtime runner menunggu CICD-19.

- [x] **CICD-04** Tambah `@vitest/coverage-v8` sebagai devDependency yang cocok
      dengan Vitest 5. Saat ini `bunx vitest run --coverage` gagal dengan
      `MISSING DEPENDENCY`, jadi job `test` berhenti sebelum menjalankan tes.
      Selesai: `@vitest/coverage-v8@5.0.5` terpasang; coverage dibatasi ke logika
      `src/server/**` + `src/validations/**` (wrapper `*Fn.ts` diuji E2E),
      baseline 2026-10-26: 65.04% statements / 55.57% branch / 60.96% function /
      67.56% line, ambang **64/54/59/66** di `vitest.config.ts` (margin ±1 poin,
      wajib dinaikkan saat tes bertambah). `bun run test:coverage` lulus (exit 0).
      Threshold 80% global sebelumnya tidak realistis karena mengikutkan
      UI/generated/paraglide dan tidak pernah benar-benar dievaluasi (`global`
      bukan key Vitest).

- [x] **CICD-05** Pasang browser Playwright di job `e2e`:
      `bunx playwright install --with-deps chromium` sebelum `playwright test`.
      Selesai: langkah ditambahkan di `.github/workflows/ci.yml`; eksekusi runner
      Linux menunggu CICD-19.

- [x] **CICD-06** Hapus server dev manual di port 3000 pada job `e2e`.
      `playwright.config.ts` sudah menyalakan server sendiri di port 3100
      (`reuseExistingServer: false` saat `CI`), sehingga langkah 3000 hanya
      duplikasi. Langkah `Stop dev server` juga tidak bekerja karena `SERVER_PID`
      tidak terbawa antar-step. Selesai: langkah start/stop dihapus; e2e lokal
      tetap lulus 53 tes dengan `webServer` Playwright.

- [x] **CICD-07** Tambah guardrail workflow: `permissions: contents: read`,
      `concurrency` (batalkan run lama per branch), `timeout-minutes`,
      cache Bun, `workflow_dispatch`, dan upload `playwright-report/` +
      `test-results/` saat gagal. Selesai: semua guardrail ditambahkan ke
      `ci.yml`; cache dependency `~/.bun/install/cache`; Playwright memakai
      reporter HTML + `trace: retain-on-failure` + screenshot kegagalan agar
      artefak benar-benar berisi. Bukti runtime (run dibatalkan/artefak terunduh)
      menunggu CICD-19.

- [x] **CICD-08** Tambah job verifikasi migrasi: `db:migrate:deploy` di database
      kosong lalu `db:migrate:status`, plus cek drift schema vs migrations
      (`prisma migrate diff --exit-code` bila didukung versi ini). Selesai: job
      `migrasi` memakai Postgres kedua (`pos_shadow` port 5433), script
      `db:migrate:drift`, dan `shadowDatabaseUrl` di `prisma.config.ts` (Prisma 7
      mewajibkannya untuk `--from-migrations`). Diverifikasi lokal: drift check
      mengembalikan "No difference detected", exit 0, shadow DB dibersihkan lagi.
      Eksekusi job di runner menunggu CICD-19.

- [x] **CICD-09** Tambah skrip lokal `ci` di `package.json` yang menjalankan urutan
      gate yang sama (`tsc`, `lint`, `check`, `test`, `build`; e2e terpisah).
      Selesai: `typecheck`, `test:coverage`, dan `ci` ditambahkan; `bun run ci`
      lulus penuh (exit 0, termasuk coverage + build).

### Fase 2 — Deploy & migrasi produksi

- [x] **CICD-10** Tentukan satu provider (Vercel **atau** Netlify; konfigurasi
      keduanya sudah ada) dan buat alur deploy yang tidak mendahului migrasi.
      Opsi aman: `workflow_dispatch` dengan environment `production` →
      `db:migrate:deploy` → deploy hook/CLI provider → smoke test. Matikan
      auto-deploy provider sementara bila urutan belum dijamin.
      Selesai: provider **Vercel**; `.github/workflows/deploy-production.yml`
      menjalankan migrasi → `migrate status` → `vercel pull/build/deploy --prod`
      → smoke test. `vercel.json` mematikan auto-deploy `main`
      (`git.deploymentEnabled.main = false`). Bukti runtime menunggu CICD-11
      (secret) dan CICD-19 (run nyata).

- [ ] **CICD-11** Buat GitHub Environment `production` (required reviewer +
      secrets `DATABASE_URL_UNPOOLED`, kredensial provider) dan `preview`
      (database terpisah). Jangan pernah menjalankan `db:seed` di produksi.
      **Sebagian selesai:** environment `production` dan `preview` dibuat lewat
      API; `production` memakai branch policy `main`. Required reviewer ditolak
      GitHub Free untuk repo private (HTTP 422). **Keputusan:** gate produksi =
      `workflow_dispatch` manual dari `main` oleh user ber-write access; required
      reviewer diaktifkan hanya bila plan di-upgrade. Secrets produksi masih
      kosong karena nilai Vercel/Neon belum tersedia.
      Kriteria: gate manual disetujui; secret tidak muncul di log.

- [x] **CICD-12** Smoke test pasca-deploy: `GET /api/health` = 200
      `{database:"ok"}`, halaman login tampil, `db:migrate:status` up to date.
      Sertakan rencana rollback (redeploy versi sebelumnya + migrasi expand/contract).
      Selesai: `scripts/smoke-deploy.sh` memeriksa health (retry) + `/login`,
      dipanggil workflow setelah deploy; `db:migrate:status` berjalan sebelum
      deploy. Rollback aplikasi/DB didokumentasikan di `docs/DEPLOY.md`.
      Bukti runtime menunggu deploy nyata (CICD-11).

### Fase 3 — GitHub Issues, Project, dan tata kelola

- [x] **CICD-13** Tambah issue template: bug report, feature request, dan security
      (mengarah ke pelaporan privat, bukan issue publik). Tambah
      `.github/ISSUE_TEMPLATE/config.yml` dan label standar
      (`type:*`, `priority:P0–P3`, `area:auth|db|printer|ui|ci`).
      Selesai: `bug_report.yml`, `feature_request.yml`, `config.yml` (link
      private advisory), dan `.github/workflows/labels.yml`. Label otomatis
      terpasang lewat `labels: [...]` di template. Link keamanan sudah diarahkan
      ke `adhitiad/pos` oleh `scripts/siapkan-github.ts --config-only`; workflow
      label sudah dijalankan dan 15 label standar terpasang.

- [x] **CICD-14** Tambah `PULL_REQUEST_TEMPLATE.md` berisi checklist gate
      (`tsc`, `lint`, `check`, `test`, `test:e2e`, `build`), catatan migrasi,
      i18n empat bahasa, dokumentasi, dan screenshot UI. Tambah `CODEOWNERS`.
      Selesai: `.github/PULL_REQUEST_TEMPLATE.md` + `.github/CODEOWNERS`
      (`@adhitiad`); format dan lint lulus.

- [ ] **CICD-15** Buat GitHub Project (board: Backlog → Ready → In Progress →
      Review → Done) dengan field Priority/Area/Estimate, lalu buat issue dari
      item P0/P1, PRN, dan CI/CD di dokumen ini. `DAFTAR-TUGAS.md` tetap sumber
      kebenaran; issue hanya tautan kerja. **Terblokir:** token `gh` belum punya
      scope `project` (repo `adhitiad/pos` sudah ada). Persiapan selesai:
      `docs/GITHUB-SETUP.md` + `scripts/siapkan-github.ts`. Dry-run
      `bun scripts/siapkan-github.ts --dry-run` pada 2026-10-23 menemukan 5
      item CICD terbuka dan tidak menemukan item PRN terbuka; jumlah ini dapat
      berubah mengikuti checklist. Skrip melewati judul issue yang sudah ada.
      Verifikasi saat ini: `gh auth status` hanya melaporkan scope `gist`,
      `read:org`, `repo`, `workflow`, jadi pembuatan project dan penambahan
      issue ke project belum dapat dijalankan. Setelah scope diberikan:
      `gh auth refresh -h github.com -s project`, buat project/field sesuai
      `docs/GITHUB-SETUP.md`, lalu jalankan skrip dengan nomor project.

- [x] **CICD-16** Selesaikan konfigurasi keamanan dependency dan pelaporan
      kerentanan. Selesai: `SECURITY.md`, `.github/dependabot.yml`, dan
      `.github/workflows/dependency-review.yml` aktif; Dependabot alerts (`204`)
      serta automated security fixes (`200`) terverifikasi. Private vulnerability
      reporting diaktifkan pada 2026-10-23 (`GET` → `{"enabled":true}`), dan
      `SECURITY.md` mengarahkan pelapor ke form GitHub dengan fallback kanal privat
      maintainer. Dependency review menggagalkan severity `high` ke atas. CodeQL
      tetap opsional.

### Fase 4 — Operasional & konsistensi dokumen

- [ ] **CICD-17** Selesaikan checklist `docs/OPERASIONAL.md`: PITR/backup Neon +
      uji restore, uptime monitor `/api/health` + uji alert, dan observability
      Sentry atau GlitchTip (OBS-02). **Belum diverifikasi:** checklist backup,
      restore, monitor, alert, dan DSN/error event produksi memerlukan akses
      konsol layanan serta bukti uji. Jangan menandai selesai sebelum setiap
      kriteria tersebut memiliki bukti; error produksi harus dapat ditelusuri
      menggunakan `ref`.

- [x] **CICD-18** Perbaiki dokumentasi basi: `docs/OPERASIONAL.md` masih menyebut
      e2e memakai port 3000, padahal `playwright.config.ts` memakai 3100 dan
      menyalakan server sendiri. Samakan dengan perilaku CI yang baru.
      Selesai: bagian 5 kini menyebut `:3100`, `reuseExistingServer: false` di CI,
      dan reuse hanya di lokal; tidak ada lagi instruksi e2e ke `:3000`.

- [x] **CICD-19** Verifikasi dari clone bersih: jalankan seluruh job CI di GitHub,
      catat URL run yang hijau, lalu centang item ini. Jangan mengklaim CI siap
      sebelum run nyata membuktikannya. Selesai: run hijau
      `https://github.com/adhitiad/pos/actions/runs/39699156327` — quality,
      unit test, e2e, audit, dan migration/drift semuanya `success`.

- [x] **CICD-20** Higiene repo dan dokumentasi: tutup semua file `.env*` di
      `.gitignore` kecuali `.env.example`, jadikan `docs/README.md` indeks yang
      akurat, tambah `LICENSE` MIT atas nama **adhitiad** untuk aplikasi POS
      (kasir, buku besar, percetakan), dan catat aturan commit/push/deploy di
      `.agents/rules/15-git-dan-deploy.md`. Selesai 2026-10-22.

- [x] **CICD-21** Perbaiki error runtime `Unknown argument 'userId'` pada
      `prisma.printer.findMany()` di `src/server/percetakan.ts`: Prisma Client
      yang dipakai dev server sudah stale. Generate ulang (`bun run db:generate`),
      verifikasi query dengan client baru, lalu restart dev server. Hasil:
      query OK (`printer=0`), `/api/health` 200, dan server baru memakai client
      Prisma 7.10.1.

- [x] **CICD-22** Stabilkan e2e halaman owner: suite penuh membuat analytics
      `device-visit`/`kunjungan` kena rate limit 429 dan dulu dianggap error
      konsol. Filter hanya 429 analytics (bukan error server), lalu verifikasi
      ulang. Hasil: `tests/e2e/auth.spec.ts` 24 tes lulus; suite e2e penuh
      57 tes lulus.

- [x] **CICD-23** Buat PRD ganda: `docs/PRD.md` untuk manusia dan
      `docs/PRD-AI.md` untuk agen/LLM, lalu hubungkan peta dokumen
      `AGENTS.md ↔ DAFTAR-TUGAS ↔ .agents/rules/** ↔ PRD ↔ docs/**`.
      Tambah `scripts/sinkron-dokumen.ts`, `docs:sync`, `docs:check`, dan
      `predev` agar snapshot status/rute/model/test otomatis diperbarui.
      Selesai 2026-10-22.

- [x] **CICD-24** Tambah anggaran performa yang dapat digagalkan CI:
      `docs/PERFORMA.md`, `scripts/cek-performa.ts`, dan `perf:budget`
      (total JS+CSS gzip ≤600 KB, aset terbesar ≤160 KB, CSS ≤50 KB).
      Baseline build lokal 2026-10-22: 449,5 KB gzip total, aset terbesar
      108,6 KB, CSS 17,4 KB. Selesai 2026-10-22.

- [ ] **CICD-25** Ukur baseline produksi setelah deploy: Core Web Vitals
      (LCP/INP/CLS p75), p95 API baca/tulis, dan `/api/health`, lalu bandingkan
      dengan `docs/PERFORMA.md`. Jangan mengklaim target tercapai tanpa data.
      **Terblokir:** menunggu secret produksi (CICD-11) dan deploy nyata.

## FITUR — Kasir review dua-fasa (Opsi B / A1), selesai 2026-10-23

- [x] **FEAT-03** Semua posting wajib `statusKasirReview = DISETUJUI`
      (tidak hanya offline; blok `superRefine` dipindahkan keluar dari `waktuKlien`).
      Model baru: `DraftTransaksi` (stok/jurnal belum disentuh sampai review) +
      `TransaksiReviewAudit` (audit terpisah dari `AuditLog`), migrasi
      `20261023160000_add_draft_transaksi_dan_review_audit`.
- [x] Alur kasir: `buatDraftTransaksi` → `reviewTransaksi` (self-approve,
      posting atomik dalam satu transaksi DB) via server Fn dan route API:
      `POST /api/v1/transaksi-draft`, `POST /api/v1/transaksi-draft-batal`,
      `POST /api/v1/transaksi-review`; kasir checkout (`useFormKasir`) dipindah ke
      alur draft → review; `outbox.ts` offline menandai `statusKasirReview:
'DISETUJUI'` untuk replay.
- [x] Unit test diperbarui: semua pemanggilan `postingTransaksi`/`PostingTransaksiSchema.parse`
      menyertakan `statusKasirReview: 'DISETUJUI'`; 343/343 lulus.
- [x] `docs/API.md` diperbarui (endpoint draft/review), `docs/PERFORMA.md`
      baseline diubah ke 499,9 KB gzip (build 2026-10-23).

## FITUR — Audit trail ketat & notifikasi pembayaran 45 menit, selesai 2026-10-24

- [x] **FEAT-04** Audit trail ketat pada `AuditLog`: tambah kolom `catatan`
      (alasan tindakan); `catatAudit` terpanggil di `buatRetur` (refund/void)
      dan `simpanOpname` (koreksi stok) dengan aktor, timestamp, dan alasan.
      Migrasi `20261023160000_add_draft_transaksi_dan_review_audit` diperluas
      dengan `ALTER TABLE audit_log ADD COLUMN catatan`.
- [x] **FEAT-05** Notifikasi pembayaran kadaluarsa 45 menit:
      `cekPembayaranKadaluarsa` menemukan transaksi belum dibayar >45 menit,
      tandai `DIBATALKAN`, catat audit, dan kirim notifikasi ke kasir. Route
      `POST /api/v1/pembayaran-kadaluarsa` (guard `requireKasir`). Klien bisa
      membersihkan cache/order dari ID transaksi yang dikembalikan.
- [x] Unit test: 343/343 lulus (termasuk retur + opname dengan audit). Gate
      penuh (tsc, lint, check, docs, test, test:e2e, build, perf:budget)
      lulus.
- [x] Cakupan tes didokumentasikan di `vitest.config.ts`: komponen/rute React
      diuji lewat E2E Playwright, Paraglide adalah kode hasil kompilasi, dan
      wrapper `*Fn.ts` diuji lewat E2E — bukan unit. Ini keputusan sadar, bukan
      celah yang terlupa.

## FITUR — UI antrean review owner (FEAT-06), selesai 2026-10-24

- [x] **FEAT-06** UI antrean review owner untuk `TransaksiReviewAudit`.
      Halaman `/review-transaksi` (OWNER): antrean draft `MENUNGGU` lintas
      kasir, aksi setujui/tolak (dialog + catatan), riwayat keputusan, dan
      switch kebijakan `review_transaksi_mode` (`kasir` = self-approve default,
      `owner` = wajib persetujuan owner). Kasir tetap memakai alur draft →
      review seperti sebelumnya, sesuai permintaan "cust yaitu kasir".
- [x] Kebijakan & guard: `src/server/reviewPolicy.ts`
      (`bolehReviewTransaksi`) dipakai `reviewTransaksi`. Kasir tidak bisa
      memutus draft kasir lain, dan tidak bisa memutus sama sekali saat mode
      `owner`; OWNER selalu boleh. Aturan ini diuji unit tanpa database.
- [x] Audit: setiap keputusan (setuju **dan** tolak) menulis
      `TransaksiReviewAudit` (`draftId` + `transaksiId` nullable agar penolakan
      tercatat) dan `AuditLog` (`transaksi.review.setujui|tolak` + catatan).
      Pemilik transaksi tetap kasir pembuat draft; aktor kebijakan diskon
      mengikuti peninjau.
- [x] API: `GET /api/v1/transaksi-draft?semua=1` (antrean OWNER) dan
      `GET /api/v1/transaksi-review?take=` (riwayat). Server Fn:
      `listDraftMenungguFn`, `riwayatReviewTransaksiFn`,
      `setModeReviewTransaksiFn` (OWNER).
- [x] Navigasi + i18n empat bahasa (`nav_review`, `review_*`) + Paraglide
      dikompilasi; unit test `reviewPolicy` (5 kasus) → 348/348 lulus.
- [x] Gate: `tsc`, `lint`, `check`, `docs:sync`/`docs:check`, `test:vitest`,
      `test:e2e`, `build`, `perf:budget`.

## AUDIT AKHIR — Kebersihan kode, keamanan, performa, kesehatan (2026-10-24)

### Yang sudah dikerjakan

- [x] Inventaris hook: seluruh hook React berada di `src/hooks/**`; tidak ada
      file `use*.ts`/`use*.tsx` di luar folder itu.
- [x] Tipe domain dipindah ke `src/types/**/*.d.ts` (audit, laporan,
      notifikasi, pesanan, pesanan-draf, pengajuan, review, transaksi,
      rate-limit, percetakan, printer, table, produk). Modul asal tetap
      mengekspor ulang agar impor lama tidak rusak. `types/review.ts` diganti
      `types/review.d.ts`.
- [x] Skema Zod dipusatkan di `src/validations/**`: `DraftIdSchema`,
      `SetModeReviewSchema`, `JenisMasterSchema` (memakai yang sudah ada),
      `DetailTransaksiSchema`, dan `PaymentWebhookSchema` (baru:
      `validations/pembayaran.ts`).
- [x] Hapus kode mati: `src/server/pembayaranKadaluarsaFn.ts` (tidak diimpor;
      route memakai fungsi murni), `listDraftTransaksiFn`,
      `getDraftTransaksiFn`, `batalDraftTransaksiFn`,
      `tandaiNotifikasiDibacaFn`, `printerDefaultFn`, lima Fn pesanan draf yang
      tak dipakai, `dataReturFn`/`produkAktifFn`/`dataOpnameFn` (REST tetap
      tersedia), dan `urlIkonSekarang`.
- [x] Perbaikan migrasi: `20261022094437_add_nominal_disetujui` dibuat
      kondisional; migrasi baru
      `20261024000000_fix_nominal_disetujui_order`; migrasi
      `20261023160000_add_draft_transaksi_dan_review_audit` dibuat idempoten.
      `migrate resolve --rolled-back` + `migrate deploy` → seluruh 23 migrasi
      terpasang, `DraftTransaksi`/`TransaksiReviewAudit` ada.
- [x] `db:seed` ulang: 47 produk, 24 bahan, 4 user, 8 transaksi demo, jurnal
      berimbang.
- [x] `.gitignore`: hapus baris berisi spasi dan pola `audit-**.md` yang
      bertentangan dengan README (audit justru dokumen yang di-commit).
- [x] `README.md`: prasyarat PostgreSQL lokal/Neon dan catatan knip diperbaiki.
- [x] `scripts/sinkron-dokumen.ts`: pemotongan ID tugas kini membuang backtick
      agar snapshot PRD tetap valid dan stabil terhadap Prettier.

### Hasil gate (2026-10-24)

- [x] `bunx tsc --noEmit` — lolos.
- [x] `bunx eslint .` — lolos (0 error/warning).
- [x] `bunx prettier --check .` — lolos.
- [x] `bun run docs:sync` + `docs:check` — sinkron.
- [x] `bun run test:vitest` — **348/348 lolos** (54 file). Catatan: percobaan
      pertama sempat 2 timeout 5 detik pada `posting.test.ts` dan
      `percetakan.test.ts` karena beban paralel/Neon; kedua file lolos saat
      dijalankan ulang, lalu seluruh suite lolos. Bukan regresi tipe/Zod.
- [x] `bun run test:e2e` — **71/71 lolos** (Chromium, 2,8 menit).
- [x] `bun --bun run build` — lolos.
- [x] `bun run perf:budget` — 90 file, 504,5 KB gzip total, aset terbesar
      114,1 KB, CSS 18,2 KB; semua di bawah anggaran.
- [x] `bun run db:seed` — 47 produk, 24 bahan, 4 user, 8 transaksi demo,
      jurnal berimbang.
- [x] `bun run db:migrate:status` — 23 migrasi terpasang, schema up to date.

### Pengecualian sadar (bukan kelalaian)

- Tipe hasil `z.infer` tetap di samping skemanya (satu sumber kebenaran;
  memindahkan ke `types/` menciptakan impor melingkar).
- Tipe lokal internal komponen/route (mis. `type Props`) tetap di file
  pemiliknya demi enkapsulasi.
- `src/env.ts` tetap memakai Zod untuk bootstrap env (bukan input request).
- Ekspor `src/components/ui/*` yang belum dipakai adalah cadangan registry
  shadcn; aturan repo melarang menulis ulang komponen registry.
- `src/server/pembayaranWebhook.ts` adalah utilitas HMAC yang dipakai
  `src/routes/api/v1/pembayaran/webhook.ts`; skemanya dipindah ke
  `validations/pembayaran.ts` dan diekspor ulang agar impor route tetap stabil.

### Temuan kritis yang sudah diperbaiki

- [x] Urutan migrasi rusak: `add_nominal_disetujui` (09:44) berjalan sebelum
      tabel `pengajuan_pengeluaran` dibuat (16:19) sehingga instalasi baru
      gagal. Diperbaiki dengan `IF EXISTS` + migrasi penutup.
- [x] Migrasi `20261023160000` gagal parsial (enum dibuat, tabel tidak) dan
      memblokir `migrate deploy`. Diperbaiki dengan migrasi idempoten +
      `migrate resolve`.

### Backlog P0 performa (selesai 2026-10-24)

- [x] Paginasi server-side `bahanPage`/`produkPage`/`memberPage` —
      where/orderBy/skip/take/count diproses DB via `TabelQuerySchema`
      (`src/validations/pagination.ts`); tabel `/bahan`, `/produk`, `/member`
      terkendali server (URL search param = sumber kebenaran). Wrapper
      `bahanData`/`produkData`/`memberData` diperbiarkan demi pemakai lama/test.
- [x] Pisahkan `dashboardData` dari `kasirData`; `/dashboard` kini memakai
      agregat hari ini (`src/server/dashboard.ts`) — HPP dari `Transaksi.hpp`, /
      `kasir` tetap unduh katalog khusus POS.
- [x] Laporan penjualan/pajak/belanja: agregasi SQL — `laporanPajak` penuh
      `$queryRaw GROUP BY` (`to_char` per hari/minggu ISO/bulan di
      `Asia/Jakarta`, mengikuti semantik `kunciPeriode`), `laporanBelanja`
      `groupBy` per sumber + `date_trunc` bulanan, `laporanPenjualan` buang
      kueri ganda HPP (hitung dari items yang sudah dimuat hanya dengan
      `Math.round` setelah penjumlahan). Kontrak keluaran & test tetap.
- [x] `pembayaranKadaluarsa`: satu transaksi berbasis batch — `findMany`
      (`take` `BATAS_KADALUARSA_PER_SIKLUS = 100`, tertua dulu) + `updateMany`
      (ber-syarat, idempoten) + `createMany` audit; notifikasi dikirim di luar
      transaksi DB. Schedule declared di `vercel.json` tetap backlog.
- [x] Prisma pool/timeout configurable — `DB_POOL_MAX`,
      `DB_IDLE_TIMEOUT_MS`, `DB_CONNECTION_TIMEOUT_MS`,
      `DB_STATEMENT_TIMEOUT_MS` di `src/db.ts` + `src/env.ts` +
      `.env.example` dengan default aman.

### Backlog P1 performa/ketahanan (sebagian selesai 2026-10-26)

- [x] Cache sesi per request — `src/server/auth.ts` menyimpan promise
      `getPengguna()` per objek `Headers` di `WeakMap`, jadi sesi + role hanya
      dibaca sekali per request meski loader dan server function memanggilnya
      berkali-kali.
- [x] `staleTime` preload/route dan hentikan `router.invalidate()` global tiap
      20 detik di KDS. `src/routes/dapur.tsx` memakai
      `router.invalidate({ filter: routeId === '/dapur' })`; router kini memakai
      `defaultStaleTime` + `defaultPreloadStaleTime` 30 detik sehingga navigasi
      tidak mem-fetch ulang loader yang baru dijalankan, sementara aksi tulis tetap
      memanggil `router.invalidate`.
- [x] Index (bagian 1, 2026-10-24, migration
      `20261024020000_add_composite_indexes`): `Transaksi(memberId, tanggal)`,
      `PembelianBahan(supplierId, sumberBelanja, tanggal)`,
      `TransaksiItem(produkId, qty)` (PSL `@@index`) + partial SQL
      `Transaksi_terjual_tanggal_idx` (filter laporan) dan
      `Transaksi_kadaluarsa_idx` (cron); `@@index` representatif ikut masuk
      `schema.prisma` agar tidak drift. `EXPLAIN` rinci belum diverifikasi.
- [x] Index (bagian 2, 2026-10-26, migration
      `20261026090000_add_indexes_part2`): `Member(email)`, `Member(nama)`,
      `Produk(nama)`, `notifikasi(userId, createdAt)`,
      `pesanan_draf(status, createdAt)`, `Transaksi(statusPesanan, createdAt)`;
      `Printer_userId_idx` dihapus karena redundan. Idempoten
      (`IF NOT EXISTS`/`IF EXISTS`), sudah diterapkan ke Neon dev.
- [~] Rate limit health check dan endpoint publik sudah terpasang (health
  60/menit; publik 10–120/menit sesuai risiko; dine-in 10/menit per IP +
  5/menit per nomor telepon). Beban tulis limiter (satu transaksi 3 query
  per permintaan di `src/server/rateLimit.ts`) belum dikurangi — kandidat:
  cache token bucket per proses atau gabung query.
- [x] Penomoran harian atomik — diverifikasi 2026-10-26:
      `src/server/penomoran.ts` sudah memakai `UPDATE ... RETURNING` di dalam
      transaksi (tidak ada `count()`); catatan lama sudah basi.
- [x] Font self-host lewat `@fontsource` (Manrope/Fraunces) dan
      `NotificationBellLazy` untuk memuat lonceng notifikasi secara malas di
      `Header.tsx` serta halaman pesanan publik.

### Temuan keamanan (audit statis OWASP, 2026-10-24)

Tidak ditemukan SQL injection, XSS, SSRF, path traversal, atau secret
hardcoded. Kontrol yang sudah baik: HMAC webhook/QR meja + `timingSafeEqual`,
CSP nonce, header keamanan, CSRF, error aman + `ref`, audit log, body limit,
rate-limit token bucket di Postgres, validasi URL Cloudinary, sanitasi CSV.
Risiko utama ada di **otorisasi dan integritas transaksi**.

**Sudah diperbaiki pada putaran ini**

- [x] IDOR notifikasi: `tandaiNotifikasiDibacaFn` dan fungsi
      `tandaiNotifikasiDibaca(ids)` dihapus. Mark-read kini murni localStorage
      per perangkat (`src/hooks/notifikasi.ts`); `tandaiEntitasDibaca` tetap
      dibatasi `userId`.
- [x] Server function publik `buatPesananDrafFn` tanpa rate limit dihapus
      (tidak dipakai); jalur publik hanya REST `/api/v1/pesan-dinein` yang
      sudah ber-rate-limit dan berbatas body.

**P0 — fraud/otorisasi (diperbaiki 2026-10-24)**

- [x] **Kritis:** kasir dapat mengirim `statusPesanan: 'DIBATALKAN'` saat
      posting. Diperbaiki: `PostingTransaksiSchema` dan
      `BuatDraftTransaksiSchema` menolak `DIBATALKAN` (enum input menyaring
      nilai itu), dan pembatalan POS hanya lewat retur. Filter laporan tetap
      mengecualikan `DIBATALKAN`; alur pembatalan khusus owner (reversal
      stok/jurnal/pembayaran atomik) tetap backlog PLA-02.
- [x] **Tinggi:** `statusKasirReview: 'DISETUJUI'` dari klien. Diperbaiki:
      field disaring dari input publik (`PostingTransaksiSchema` strip), mode
      review `kasir`/`owner` diverifikasi di server oleh `postingTransaksi`
      (owner-mode tanpa draft disetujui ditolak), draft/keputusan review
      dicatat atomik (`opsi.tx`) + `TransaksiReviewAudit`.
- [x] **Tinggi:** `setPengaturanFn` memakai `requireKasir`. Diperbaiki:
      kunci sensitif (pajak, diskon maks, `review_transaksi_mode`, status toko)
      kini owner-only pada lapisan `setPengaturan`; peran aktor diteruskan ke
      seluruh jalur penulisan (server fn + REST).
- [x] **Tinggi:** retur bisa direfund berulang. Diperbaiki: agregasi retur
      kumulatif per `transaksiItemId` di dalam `$transaction` dengan
      `pg_advisory_xact_lock`, retur menolak transaksi belum lunas/dibatalkan,
      jurnal pembalik dikoreksi (debit Pendapatan, credit Kas).
- [x] **Tinggi:** `POST /api/v1/pesan-dinein` menerima `memberId` klien.
      Diperbaiki: `memberId` disaring dari body publik dan respons hanya
      memuat nama/tier dari lookup telepon; rate limit per nomor telepon
      5/menit (`rateLimitKunci`). Verifikasi telepon lanjutan (OTP) tetap
      backlog.

**P1 — penyalahgunaan publik (sebagian diperbaiki 2026-10-26)**

- [x] Meja dapat dikunci pesanan online tanpa pembayaran. Diperbaiki:
      dine-in publik **wajib** `mejaToken` QR bertanda tangan
      (`PesananOnlineSchema`, `BuatPesananDrafSchema`); `mejaId` mentah
      di-strip Zod dan tidak pernah dipakai; UI publik tidak lagi menerima
      pilihan meja manual (harus pindai QR). Expiry pesanan belum dibayar
      dijalankan cron ber-secret `GET /api/cron/pembayaran-kadaluarsa`
      (`Authorization: Bearer <CRON_SECRET>`, jadwal `*/15 * * * *` di
      `vercel.json`); endpoint staf `POST /api/v1/pembayaran-kadaluarsa` tetap
      ada.
- [x] Rate limit auth tidak efektif: default `TRUST_PROXY=false` mematikan IP
      tracking Better Auth; storage `memory` tidak lintas instance; `customRules`
      memakai path yang salah. **Diperbaiki 2026-10-26:** storage diganti token
      bucket PostgreSQL yang sama dengan endpoint lain (`customStorage.consume`
      → `batasi`), jadi kuota berlaku lintas instance serverless tanpa Redis;
      aturan `*` untuk `/sign-in*` 5/menit, `/sign-up*` 3/menit, `/callback*`
      20/menit; `TRUST_PROXY` otomatis `true` bila `VERCEL=1` (bisa dimatikan
      eksplisit) dengan `TRUST_PROXY_HOPS=1`. Env Vercel tetap boleh diisi
      manual sebagai dokumentasi, tetapi tidak lagi wajib.
- [x] `max_file_size` Cloudinary tidak ikut ditandatangani. Diperbaiki:
      `max_file_size` masuk parameter signature (`src/server/cloudinary.ts`)
      dan dikirim klien (`src/lib/cloudinary.ts`), sehingga batas 2 MB tidak
      bisa dilonggarkan lewat klien kustom.

**P2 — rendah (sebagian diperbaiki 2026-10-26)**

- [x] Audit `PUT /api/v1/pengaturan` tidak mengirim `aktorId` — diverifikasi
      2026-10-26: route REST dan `setPengaturanFn` sudah meneruskan id
      pengguna, dan `catatAudit` menyimpannya. Catatan lama sudah basi.
- [x] 5 advisory dependensi. Diperbaiki: `@tailwindcss/typography` (tidak
      dipakai) dihapus, `overrides.fast-uri ^3.1.9` ditambahkan; `bun audit`
      kini **No vulnerabilities found** (781 paket).
- [x] Alerting fraud: `src/server/fraudAlert.ts` mencatat `logger.warn`
      terstruktur untuk pembatalan pesanan online, retur, dan perubahan
      pengaturan sensitif (pajak/diskon/mode review/status toko), plus POST
      opsional ke `FRAUD_WEBHOOK_URL`. Tidak pernah melempar error.
- [ ] MFA untuk OWNER belum ada. **Blocker:** butuh keputusan produk
      (TOTP vs passkey), kolom/enrollment di `User`/Better Auth, UI
      pendaftaran + verifikasi, dan kode pemulihan. Belum dikerjakan.
- [x] `$queryRawUnsafe('SELECT 1')` di health check diganti `$queryRaw`
      (2026-10-26).

---

## HARDENING & SKALA — Fase 1–2 (2026-10-24) — Selesai

> Implementasi atas audit 2026-10-24: blok "Backlog P0 performa" +
> "Temuan kritis" (migrasi) + P0 fraud/otorisasi. Fase 3 (operasional:
> GlitchTip/fraud-alert, uji restore backup, MFA OWNER, `bun audit` bersih,
> e2e WebKit/mobile) masih backlog.

- [x] **HARD-SEC-01..05** Lima temuan P0 fraud/otorisasi ditutup (detail di
      seksi "Temuan keamanan" di atas): status POS `DIBATALKAN` ditolak,
      `statusKasirReview` disaring + kebijakan review dipaksa server,
      pengaturan sensitif owner-only, retur kumulatif memakai
      `pg_advisory_xact_lock` + penolakan sumber belum lunas/dibatalkan +
      jurnal pembalik dikoreksi, `pesan-dinein` tanpa `memberId` + rate limit
      per telepon.
- [x] **HARD-MIG-01** Perbaikan/idempotensi migrasi:
      `20261022094437_add_nominal_disetujui` (kondisional),
      `20261024000000_fix_nominal_disetujui_order`,
      `20261023160000_add_draft_transaksi_dan_review_audit` (idempoten).
      Semua migration diverifikasi apply bersih pada DB Neon kosong sekali-pakai
      (skrip sementara `verify-migrations.ts`, DB dibuang setelah uji).
- [x] **HARD-DB-01** Prisma pool/timeout env-configurable (lihat
      HARD-PERF-05 di "Backlog P0 performa").
- [x] **HARD-PERF-01..05** Backlog P0 performa tuntas (detail di seksi
      "Backlog P0 performa" di atas): paginasi server `/bahan`/`/produk`/
      `/member`, dashboard terpisah dari katalog kasir, agregasi SQL laporan
      penjualan/pajak/belanja, cron kadaluarsa berbatch, koneksi DB
      configurable.
- [x] **HARD-IDX-01** Migration `20261024020000_add_composite_indexes`
      (idempoten `IF NOT EXISTS`): partial `Transaksi_terjual_tanggal_idx`
      & `Transaksi_kadaluarsa_idx`, komposit `Transaksi(memberId, tanggal)`,
      `PembelianBahan(supplierId, sumberBelanja, tanggal)`,
      `TransaksiItem(produkId, qty)`; bagian representatif dicatat di
      `schema.prisma` (`@@index`) lalu `prisma generate`.
- [x] **HARD-TES-01** Flake test dituntaskan: `mejaToken` "tolak token yang
      dirusak" kini memilih pengganti karakter yang pasti berbeda (dulu bisa
      no-op saat karakter terakhir memang 'A').
- [x] **HARD-GATE** Gate penuh hijau setelah seluruh perubahan:
      `bunx tsc --noEmit` bersih, `bun run lint` 0 temuan, `bun run check`
      (Prettier) lulus, `bun run test:vitest` **355/355** (54 file),
      `bun run test:e2e` **71/71** (Chromium), `bun --bun run build` exit 0,
      `bun run perf:budget` 505,6 KB gzip < 600 KB, `db:migrate:status`
      25 migrasi up to date, `db:seed` dijalankan terakhir. Smoke DB sekali-pakai:
      laporan (pajak – `periode Minggu` `2026-W43` = minggu ISO JS; belanja;
      penjualan) dan cron (3 pembatalan + 3 audit + status `DIBATALKAN`,
      idempoten diulang).

---

## CLEANUP & ANALISIS CODEBASE (2026-10-26)

> Pemutakhiran menyeluruh: kode mati, duplikasi tipe, konfigurasi analisis,
> dan verifikasi gate penuh. Tidak ada perubahan perilaku produk.

### Yang dibersihkan / diperbaiki

- [x] Hapus route mati `src/routes/php2shell.tsx` (alat dev tanpa UI/pemakai,
      memicu 3 error lint + Prettier) dan regenerasi `src/routeTree.gen.ts`.
- [x] Hapus `src/types/shift.d.ts` — satu-satunya orphan sejati dari pemindaian
      382 modul `src` (381 terjangkau dari route/titik masuk).
- [x] Hapus 9 lokasi ekspor tipe tak terpakai: `NilaiUrut`,
      `PeriodeNotifikasi`, `PaymentWebhookInput` (2 lokasi), `DraftItemDetail`,
      `MemberSiap`, `KodeKebijakan`, `ModeReviewTransaksi`,
      `BuatDraftTransaksiInput`, `ReviewTransaksiInput`, `TandaiLunasInput`.
- [x] Deduplikasi tipe notifikasi: `TipeNotifikasi`/`PesanNotifikasi` hanya di
      `src/types/notifikasi.d.ts`; `src/server/notifikasiPesan.ts` mengimpor,
      tidak lagi mendefinisikan ulang.
- [x] Pindahkan `IdUkuranKertasTermal` ke `src/types/printer.d.ts` (diturunkan
      dari `UKURAN_KERTAS_TERMAL`); 3 pemakai diarahkan ke sana,
      `src/lib/ukuran-kertas.ts` tetap re-export untuk kompatibilitas.
- [x] `src/routes/api/v1/health.ts`: `$queryRawUnsafe('SELECT 1')` →
      `$queryRaw` tagged template.
- [x] `knip.json`: entry point nyata (route tree, router, start, scripts, tests,
      prisma, config, MCP) + `ignoreIssues` untuk `components/ui`,
      `generated`, dan `paraglide`. Sebelumnya `entry: ["src/**/*"]` membuat
      semua file dianggap terpakai sehingga orphan tidak pernah terdeteksi.
- [x] `.gitignore`: tambah `/audit-*.md`, `.vitest/`, dan `opencode.json`
      (konfigurasi agen berisi path absolut, tidak portabel).
- [x] CI e2e (`.github/workflows/ci.yml`): install browser `chromium` **dan**
      `webkit`. Sebelumnya hanya Chromium, padahal `playwright.config.ts`
      menjalankan proyek `webkit-mobile` — job e2e pasti gagal di CI.
- [x] Verifikasi struktur: seluruh hook `use*` berada di `src/hooks/` (7 file),
      seluruh skema Zod domain di `src/validations/` (29 file), tipe domain di
      `src/types/`. Sisa impor `zod` di `src/server/galat.ts` hanya untuk
      `ZodError` dan `src/env.ts` untuk skema environment — sesuai aturan.

### Hasil gate (2026-10-26)

- [x] `bunx tsc --noEmit` — bersih.
- [x] `bun run lint` — 0 temuan.
- [x] `bun run check` — Prettier bersih.
- [x] `bunx knip` — exit 0 setelah konfigurasi diperbaiki.
- [x] `bun run test:vitest` — **359/359** (55 file).
- [x] `bun run test:e2e` — **141 lulus + 1 flaky** (Chromium 71 + WebKit
      mobile 70 lulus, 1 flaky pada form produk WebKit yang lolos saat retry
      `retries: 1`; tidak ada kegagalan keras).
- [x] `bun --bun run build` — exit 0 (hanya peringatan `use client` rolldown
      dari dependensi, bukan kode aplikasi).
- [x] `bun run perf:budget` — 92 file; gzip 505,8 KB/600 KB; JS terbesar
      91,1 KB/160 KB; CSS 18,2 KB/50 KB.
- [x] `bun run db:migrate:status` — 27 migrasi, up to date; `prisma migrate
diff --from-config-datasource` kosong (tidak ada drift).
- [x] `bun run db:seed` — 47 produk, 24 bahan, 3 member, 8 transaksi,
      7 jurnal (berimbang), 4 user, 5 shift.
- [x] `bun run docs:sync` + `bun run docs:check` — sinkron.

### Temuan yang masih terbuka

- [x] **Batas file 397 baris** — 3 file terbesar sudah dipecah 2026-10-26:
      `src/server/percetakan.ts` (765 → barrel 26 baris + `printerUmum.ts`
      273 + `printerPerangkat.ts` 238 + `printJob.ts` 273),
      `src/routes/pengaturan.tsx` (597 → 41 baris + `usePengaturanForm.ts`
      231 + `BagianIdentitas.tsx` 183 + `BagianOperasional.tsx` 257), dan
      `src/components/pesanan/Pesanan.tsx` (510 → 259 baris + `usePesanan.ts`
      322). Impor publik lama tetap jalan.
      Sisa 9 file masih melebihi: `src/routes/buku-besar.tsx` (495),
      `src/routes/produk.tsx` (484), `src/server/pesananDraf.ts` (481),
      `src/routes/member.tsx` (468), `src/routes/member.$id.tsx` (441),
      `src/server/postingTransaksi.ts` (431), `src/routes/meja.tsx` (420),
      `src/routes/shift.tsx` (419), `src/routes/laporan-belanja.tsx` (419).
- [x] **Flake E2E WebKit** — `retries: 1` dipasang khusus proyek
      `webkit-mobile` (`playwright.config.ts`); Chromium tetap tanpa retry.
- [x] **Rate limit auth lintas instance** — selesai 2026-10-26 tanpa Redis:
      Better Auth memakai token bucket PostgreSQL (`customStorage`), aturan
      wildcard untuk sign-in/sign-up/callback, dan `TRUST_PROXY` otomatis aktif
      di Vercel. Detail di P1 keamanan.
- [ ] **MFA OWNER** — butuh keputusan produk + skema/enrollment (lihat P2).

### Hardening tambahan 2026-10-26

- [x] **Service worker/PWA**: `public/sw.js` + plugin build
      `precacheServiceWorker()` (`vite.config.ts`) menghasilkan
      `/sw-manifest.js` berisi seluruh aset build; registrasi hanya produksi
      lewat `src/components/DaftarServiceWorker.tsx` di `__root.tsx`.
      Navigasi offline dibatasi ke halaman publik (`/`, `/pesanan`, `/login`)
      agar HTML ber-sesi tidak pernah di-cache; `/api/**` selalu network.
- [x] **Cron expiry ber-secret**: `src/server/cronAuth.ts` (perbandingan
      `timingSafeEqual`), route `GET /api/cron/pembayaran-kadaluarsa`, env
      `CRON_SECRET`; jadwal Vercel `*/15 * * * *`.
- [x] **Cloudinary `max_file_size`** ikut ditandatangani server + dikirim klien.
- [x] **Dine-in token-only**: `mejaId` mentah dihapus dari schema publik,
      `pesananData` tidak lagi mengirim daftar meja, UI publik hanya menerima
      meja dari QR.
- [x] **Fraud alert** terstruktur untuk pembatalan/retur/pengaturan sensitif
      (`FRAUD_WEBHOOK_URL` opsional).
- [x] **Dependensi bersih**: `bun audit` 0 temuan; `@tailwindcss/typography`
      dihapus.
- [x] **Performa**: cache sesi per request (`WeakMap<Headers>`), invalidasi
      KDS terfilter, index bagian 2
      (`20261026090000_add_indexes_part2`).
- [x] **Drift migrasi lama (diperbaiki 2026-10-26)**: `DraftTransaksi` dan
      `TransaksiReviewAudit` dibuat PascalCase oleh
      `20261023160000_add_draft_transaksi_dan_review_audit`, sedangkan
      `schema.prisma` memetakan `draft_transaksi`/`transaksi_review_audit`.
      Migrasi aditif `20261026100000_fix_draft_review_table_names` me-rename
      tabel PascalCase menjadi snake_case (data ikut), atau menghapus versi
      PascalCase yang kosong bila versi snake_case sudah ada; bila keduanya
      berisi data migrasi berhenti agar tidak ada data hilang. Nama
      index/constraint disamakan dengan default Prisma, unique index
      `draft_transaksi_transaksiId_key` ditambahkan, dan
      `PembelianBahan_supplier_tanggal_idx` di-rename ke
      `PembelianBahan_supplierId_sumberBelanja_tanggal_idx`. DB dev sudah
      diterapkan; `prisma migrate diff` kini kosong. Jalur fresh-deploy diuji
      dalam transaksi rollback (nama tabel/index/constraint benar, data
      bertahan).

### Catatan analisis

- Tidak ditemukan SQL injection, XSS, SSRF, path traversal, `eval`,
  `child_process`, atau secret hardcoded di kode aplikasi. Raw SQL yang ada
  memakai tagged template/parameter; satu-satunya `$queryRawUnsafe` sudah
  dihapus. Satu-satunya `child_process` ada di `scripts/uji-beban.ts` (memanggil
  k6 dari wrapper uji beban, bukan kode yang melayani request).
- Ekspor tak terpakai yang tersisa hanya di `src/components/ui/**` (cadangan
  registry shadcn) dan `src/generated/prisma/**` (kode generator) — sengaja
  tidak disentuh sesuai aturan repo.

---

## Kesehatan jangka panjang (2026-10-26)

> Menutup item B: pemecahan file besar, sisa P1 performa, ambang cakupan,
> uji beban, dan audit aksesibilitas.

- [x] **Split file prioritas** (detail di "Temuan yang masih terbuka"):
      `percetakan.ts`, `pengaturan.tsx`, dan `Pesanan.tsx` kini di bawah batas;
      impor publik lama tetap bekerja lewat barrel/hook.
- [x] **Sisa P1 performa**: `defaultStaleTime`/`defaultPreloadStaleTime` 30
      detik di router, font Manrope/Fraunces self-host, dan
      `NotificationBellLazy` untuk memuat lonceng notifikasi secara malas.
- [x] **Ambang cakupan**: 64% statements / 54% branch / 59% functions / 66%
      lines di `vitest.config.ts`, naik dari 63/53/57/65 setelah baseline
      diukur ulang (65,04/55,57/60,96/67,56).
- [x] **Uji beban k6**: `tests/load/checkout.js` + `scripts/uji-beban.ts` +
      `bun run test:load`; sesi KASIR sementara dibuat dan dihapus otomatis,
      ambang gagal `http_req_failed < 1%`, p95 < 1,5 s, p99 < 3 s.
- [x] **Audit aksesibilitas**: `tests/e2e/a11y.spec.ts` (axe WCAG 2.1 A/AA +
      fokus keyboard) lulus 9/9 di Chromium dan WebKit mobile. Perbaikan yang
      menyertainya: label slider/select/input split payment/diskon/catatan,
      kontras `DaftarDraft`, `tabIndex` pada wadah gulir tabel/grafik,
      `aria-label` pada thumb slider, dan seeding produk khusus E2E.
- [ ] **Sisa 9 file > 397 baris** — lihat daftar di "Temuan yang masih
      terbuka"; dipecah bertahap tanpa mengubah kontrak.
- [ ] **Uji beban di staging/produksi** — angka k6 saat ini hanya regresi
      lokal; jalankan pada environment nyata sebelum mengklaim kapasitas.
- [ ] **PITR/uptime/error monitoring** — masih butuh konsol/akun eksternal
      (Neon, UptimeRobot, GlitchTip/Sentry).

## Perbaikan alur kasir (2026-10-26)

- [x] **Menu bocor saat buka Shift.** `src/routes/shift.tsx` mengirim
      `peran={undefined}` ke `DashboardLayout`, dan `RelNav` memperlakukan
      `undefined` sebagai "tanpa filter" — semua menu manajerial ikut tampil
      untuk KASIR. Route `shift`, `dapur`, `opname`, dan `retur` sekarang
      mengambil peran dari sesi loader; prop `peran` di `DashboardLayout` dan
      `RelNav` dijadikan wajib agar tidak terulang.
- [x] **Tipe pesanan eksplisit.** Select pengiriman kini selalu memuat opsi
      `Dine in - Gratis` dan `Pickup sendiri - Gratis` (plus layanan antar dari
      master bila ada). Nilai sentinel `DINE_IN`/`PICKUP` hanya nilai form dan
      dikonversi menjadi `deliveryId: undefined` sebelum payload dikirim.
- [x] **Tombol Bayar valid.** `src/lib/kasir-checkout.ts` menjadi satu sumber
      aturan: keranjang terisi, tipe pesanan dipilih, shift terbuka, tunai
      ≥ total, atau split yang jumlahnya pas. `PanelBayar` menonaktifkan tombol
      dan menampilkan alasan; `useFormKasir` menolak submit Enter dengan aturan
      yang sama.
- [x] Unit test `tests/vitest/kasir-checkout.test.ts`; e2e
      `tests/e2e/auth.spec.ts` memverifikasi menu KASIR di `/shift` tidak
      memuat tautan manajerial.

### Gate penuh (2026-10-26, setelah perubahan)

- [x] `bunx tsc --noEmit` — bersih.
- [x] `bun run lint` — 0 temuan.
- [x] `bun run check` — Prettier bersih.
- [x] `bun run docs:check` — snapshot PRD sinkron.
- [x] `bun run test:vitest` — **372/372** (57 file).
- [x] `bun run test:coverage` — ambang lulus; 65,62% statements / 55,83%
      branch / 61,96% functions / 68,17% lines.
- [x] `bun run test:e2e` — **165 lulus**, 1 flaky WebKit yang lolos saat retry
      (`/pengaturan` console error sementara atau form produk), 0 gagal keras.
      Regresi draft→bayar: `tests/e2e/review-transaksi.spec.ts` **8/8**
      (Chromium + WebKit mobile), termasuk pembuatan draft lewat API dengan
      ringkasan `subtotal`/`total`. Kasir: menu shift tersaring per peran dan
      tombol Bayar menunggu tipe pesanan + uang tunai (`auth.spec.ts`).
- [x] `tests/e2e/a11y.spec.ts` — 9/9 Chromium dan 9/9 WebKit mobile.
- [x] `bun --bun run build` — exit 0 (hanya peringatan `use client` dari
      dependensi).
- [x] `bun run perf:budget` — 99 file; gzip 533,2/600 KB; aset terbesar
      102,7/160 KB; CSS 37,4/50 KB.
- [x] `bun run db:seed` — 47 produk, 24 bahan, 3 member, 8 transaksi,
      7 jurnal berimbang, 4 user, 5 shift.
- [ ] `bun run test:load` — k6 belum terpasang di mesin pengembangan ini;
      skrip + wrapper siap dijalankan di staging/CI (lihat `docs/PERFORMA.md`).
