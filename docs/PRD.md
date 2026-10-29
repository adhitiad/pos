# PRD — POS (Dokumen untuk Manusia)

> **Dokumen hidup.** PRD ini menjelaskan _mengapa_ dan _apa_ yang dibangun.
> Status pekerjaan yang mengikat ada di [`DAFTAR-TUGAS.md`](DAFTAR-TUGAS.md),
> bukan di sini. Kontrak kerja agen ada di [`PRD-AI.md`](PRD-AI.md).
>
> Jangan edit blok `AUTO:PRD`; blok itu dihasilkan oleh `bun run docs:sync`.
> Urutan baca dan aturan sinkronisasi: [`../AGENTS.md`](../AGENTS.md) →
> [`DAFTAR-TUGAS.md`](DAFTAR-TUGAS.md) → [`../.agents/rules/`](../.agents/rules/)
> → PRD ini → [`PRD-AI.md`](PRD-AI.md) → dokumen detail di `docs/`.

## 1. Ringkasan produk

POS adalah aplikasi operasional toko/kedai yang menyatukan kasir, stok dan
resep, member, buku besar, antrean cetak, pesanan online, dan pelaporan dalam
satu sistem. Web memakai TanStack Start; data disimpan di PostgreSQL melalui
Prisma; REST `/api/v1/*` tersedia untuk klien Expo/mobile.

**Satu kalimat:** kasir cepat, stok dan jurnal tetap akurat, dan pemilik bisa
melihat kondisi usaha tanpa berpindah aplikasi.

**Bukan produk ini:** ERP multi-entitas, payroll, marketplace, atau akuntansi
pajak formal yang menggantikan konsultan pajak.

## 2. Masalah yang diselesaikan

- Transaksi kasir, stok, dan pembukuan sering terpisah sehingga angka tidak
  cocok dan rekonsiliasi dilakukan manual.
- Pemilik sulit melihat penjualan, belanja, laba kotor, dan pajak tanpa
  menggabungkan beberapa spreadsheet.
- Antrean cetak dan printer thermal punya alur sendiri; kesalahan cetak
  mengganggu layanan.
- Pesanan online, meja, dan dapur perlu masuk ke alur yang sama dengan kasir.
- Data member dan poin mudah hilang bila tidak terhubung ke transaksi.

## 3. Pengguna dan peran

| Peran    | Kebutuhan utama                                                      | Batas akses                   |
| -------- | -------------------------------------------------------------------- | ----------------------------- |
| `OWNER`  | Melihat seluruh operasi, mengelola master, laporan, pengaturan, user | Penuh                         |
| `KASIR`  | Membuat transaksi, shift, retur, opname, antrean cetak, dapur        | Operasional; bukan manajerial |
| `MEMBER` | Melihat riwayat/poin sendiri, memesan online                         | Tanpa akses kasir             |
| Publik   | Melihat menu, pesanan online, halaman legal                          | Tanpa data internal           |

Matriks peran yang mengikat: `src/server/peran.ts` dan
[`API.md`](API.md#aturan-bisnis-di-server-bukan-di-klien).

## 4. Tujuan dan ukuran keberhasilan

| Tujuan                                | Ukuran                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------ |
| Transaksi cepat dan tahan gangguan    | Kasir tetap bisa membuat transaksi saat koneksi putus; outbox tersinkron saat online |
| Stok dan jurnal konsisten             | Setiap transaksi yang diposting menghasilkan jurnal seimbang; tidak ada oversell     |
| Pemilik mendapat gambaran usaha       | Laporan penjualan, belanja, pajak, dan buku besar dapat dibuka tanpa ekspor manual   |
| Operasional cetak terkendali          | Antrean cetak dan status printer terlihat; struk dapat dicetak ulang                 |
| Mobile siap memakai kontrak yang sama | Expo hanya memakai REST `/api/v1/*`, bukan Prisma langsung                           |

Metrik produk yang dipantau setelah produksi: waktu transaksi, tingkat
kegagalan cetak, selisih stok opname, dan waktu muat halaman utama. Ambang
teknis ada di [`PERFORMA.md`](PERFORMA.md).

## 5. Cakupan fungsional

Status rinci tiap kapabilitas ada di `DAFTAR-TUGAS.md`; tabel ini menjelaskan
ruang lingkup, bukan mencentang pekerjaan.

| Area          | Kemampuan yang termasuk                                                                                                                                                                               |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Autentikasi   | Login Google, sesi Better Auth, peran OWNER/KASIR/MEMBER, enrollment owner, audit perubahan peran                                                                                                     |
| Kasir         | Katalog, kategori, modifier, keranjang, diskon (KASIR dibatasi, OWNER override diaudit), pajak, poin member, pembayaran, struk, mode offline/outbox                                                   |
| Produk & stok | Produk, kategori, bahan/resep, supplier, pembelian bahan, peringatan stok menipis                                                                                                                     |
| Member        | CRUD member, poin, redeem poin, riwayat transaksi                                                                                                                                                     |
| Buku besar    | Chart of accounts, jurnal otomatis dari transaksi, neraca, rincian akun, audit log                                                                                                                    |
| Laporan       | Penjualan, belanja, pajak, produk terpopuler, kunjungan/analitik operasional                                                                                                                          |
| Cetak         | Pemindaian printer Web Serial, printer default, antrean dan cetak ulang struk (OWNER tanpa batas, KASIR maksimal 3 kali per transaksi), pilihan ukuran kertas thermal 57/58/80 mm, struk thermal, PDF |
| Pesanan       | Pesanan online publik, meja, kitchen display (KDS), status pesanan                                                                                                                                    |
| Operasional   | Shift kasir, retur, stock opname, pengaturan mode F&B, notifikasi                                                                                                                                     |
| Platform      | REST `/api/v1/*` untuk web + Expo, unggah Cloudinary lewat backend, i18n en/id/zh/ko                                                                                                                  |

### Alur utama

1. **Buka toko:** OWNER/KASIR login, membuka shift, memilih printer default.
2. **Transaksi:** kasir memilih produk/modifier, mengatur qty, tipe pesanan
   (dine in, pickup sendiri, atau layanan antar), diskon, poin, dan metode
   bayar. Tombol **Bayar** baru aktif setelah keranjang terisi, tipe pesanan
   dipilih, shift sudah dibuka, serta pembayaran lengkap (tunai ≥ total, atau
   split yang jumlahnya pas). Diskon manual KASIR dibatasi persentase yang
   diatur OWNER (default 10%); diskon di atas ambang hanya bisa diposting OWNER
   dan selalu masuk audit log.
3. **Posting atomik:** untuk transaksi POS, stok produk/bahan berkurang, jurnal
   dibuat seimbang, nomor struk harian dialokasikan, dan audit dicatat. Pesanan
   online hanya mencatat pesanan; stok, poin, jurnal, dan baris pembayaran
   menunggu konfirmasi pembayaran. Waktu resmi transaksi selalu jam server;
   `waktuKlien` dari antrean offline hanya metadata dan dibatasi ±24 jam.
4. **Cetak:** struk masuk antrean; printer mengambil, menandai selesai/gagal;
   OWNER dapat mencetak ulang tanpa batas, sedangkan KASIR maksimal tiga kali
   per transaksi. OWNER dapat memilih ukuran thermal 57 × 30 sampai 80 × 80 mm
   di pengaturan; 57 × 30 mm ditujukan untuk EDC/mini printer.
5. **Tutup shift:** rekap penjualan dan pembayaran diperiksa.
6. **Pemilik:** membuka laporan, buku besar, audit log, dan pengaturan.
7. **Pelanggan:** memesan online atau melihat riwayat/poin sebagai MEMBER.

Tautan pesanan online ditampilkan kepada pengunjung dan MEMBER, tetapi
disembunyikan dari navigasi OWNER/KASIR. Route `/pesanan` tetap mengikuti guard
dan aturan publik yang berlaku; menyembunyikan tautan bukan kontrol akses.

Pesanan online **belum** mengurangi stok, memberi poin, atau menulis jurnal saat
dibuat. Staf mengonfirmasi pembayaran lewat tombol **Tandai lunas** di KDS;
gateway pembayaran mendatang memakai webhook bertanda tangan HMAC. Efek stok,
poin, jurnal, dan pembayaran dijalankan tepat sekali saat pembayaran
dikonfirmasi. Laporan dan riwayat hanya menghitung transaksi yang sudah dibayar
dan tidak dibatalkan.

## 6. Kebutuhan non-fungsional

### 6.1 Performa

Anggaran dan baseline ada di [`PERFORMA.md`](PERFORMA.md). Target yang mengikat:

- LCP p75 ≤ 2,5 detik dan INP p75 ≤ 200 ms pada perangkat menengah.
- API baca p95 ≤ 500 ms; API tulis p95 ≤ 1 detik; `/api/health` ≤ 200 ms.
- Tidak ada N+1 pada jalur transaksi; query daftar selalu dibatasi.
- Tabel daftar memakai 10 baris secara default dengan pilihan 25, 50, atau
  100 baris, paginasi shadcn/ui, pencarian, pengurutan kolom, dan filter sesuai
  konteks data.
- Total aset klien (JS+CSS, gzip) ≤ 600 KB; aset terbesar ≤ 160 KB gzip.
- Build gagal bila anggaran klien terlampaui (`bun run perf:budget`).

### 6.2 Keamanan dan privasi

- Guard per peran di server function dan REST; klien tidak boleh dipercaya.
- Rahasia hanya di env/GitHub Environment; tidak pernah masuk log atau repo.
- Error database mentah tidak boleh sampai ke klien; gunakan pesan aman + `ref`.
- Rate limit untuk endpoint publik dan analytics; IP klien diambil dari
  `X-Forwarded-For` sisi kanan sesuai jumlah proxy tepercaya, bukan entri kiri
  yang bisa dipalsukan. Endpoint analytics juga punya batas global, dan tulis
  `device-visit` hanya menerima token bertanda tangan server.
- Perubahan peran dan aksi “cabut semua sesi” oleh owner langsung membatalkan
  token lama; pengguna harus login ulang.
- Laporan kerentanan mengikuti [`../SECURITY.md`](../SECURITY.md).

### 6.3 Keandalan dan operasional

- Transaksi dan jurnal harus atomik; kegagalan tidak boleh meninggalkan data
  setengah jadi.
- Migrasi produksi hanya lewat `bun run db:migrate:deploy` sebelum deploy.
- Auto-deploy `main` dimatikan; deploy produksi lewat workflow manual.
- Backup/PITR, uptime monitor, dan pelacakan error mengikuti
  [`OPERASIONAL.md`](OPERASIONAL.md).

### 6.4 Aksesibilitas dan internasionalisasi

- Target sentuh minimal 44 px; navigasi mobile tanpa scroll horizontal.
- Empat bahasa: en, id, zh, ko; key baru wajib ditambahkan ke keempat file
  `messages/*.json`.
- Fokus keyboard, label form, dan kontras mengikuti aturan UI repo.

## 7. Batasan dan keputusan produk

- Satu penyewa (single-tenant) per deployment; belum ada multi-cabang dalam satu
  database. Keputusan SEC-26 (2026-10-23): tetap single-tenant sampai kebutuhan
  multi-tenant disetujui secara produk. Jangan menambahkan `tokoId` sebagian;
  isolasi antar-toko baru dikerjakan bersama migrasi data dan guard per toko.
- Mata uang tunggal IDR; uang disimpan sebagai integer rupiah, nominal DB
  `Decimal(14,2)`.
- Web dan Expo memakai kontrak REST yang sama; mobile tidak mengakses Prisma.
- PostgreSQL + Prisma adalah sumber kebenaran data.
- Vercel adalah provider produksi aktif; Netlify hanya cadangan.
- Repo memakai GitHub Free, sehingga gate produksi mengandalkan dispatch manual
  dan branch policy, bukan required reviewer.

## 8. Rencana

Urutan kerja mengikuti `DAFTAR-TUGAS.md`. Ringkasnya:

- **Sekarang:** menutup kesiapan produksi (secret, backup/PITR, uptime, error
  tracking) dan menjaga regresi lewat gate CI.
- **Berikutnya:** GitHub Project untuk alur kerja, private vulnerability
  reporting bila tersedia, dan pengukuran Core Web Vitals produksi.
- **Nanti:** perluasan kanal pelanggan/mobile dan optimalisasi performa
  berdasarkan data produksi, bukan asumsi.

## 9. Risiko dan keputusan terbuka

| Risiko/keputusan                                                  | Dampak                                               | Mitigasi                                                      |
| ----------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| Secret produksi belum lengkap                                     | Deploy tidak bisa dijalankan                         | Isi GitHub Environment `production`; lihat `DEPLOY.md`        |
| Private vulnerability reporting tidak tersedia untuk repo private | Pelapor tidak punya kanal privat di GitHub           | Pakai kontak maintainer; evaluasi saat fitur tersedia         |
| Drift migration lokal butuh shadow DB                             | `db:migrate:drift` gagal tanpa `SHADOW_DATABASE_URL` | Sediakan DB kosong; CI sudah memakai port 5433                |
| Advisory transitive `postcss-selector-parser`                     | `bun audit` exit 1                                   | Pantau update `@tailwindcss/typography`; CI audit advisory    |
| Baseline performa baru dari build lokal                           | Belum mewakili jaringan/perangkat nyata              | Ukur produksi setelah deploy; bandingkan dengan `PERFORMA.md` |

## 10. Peta dokumen dan protokol update

```text
AGENTS.md
  → docs/DAFTAR-TUGAS.md          (status tugas, satu-satunya sumber centang)
  → .agents/rules/**              (aturan wajib per topik)
  → docs/PRD.md                   (niat produk — file ini)
  → docs/PRD-AI.md                (kontrak kerja agen/LLM)
  → docs/**                       (API, deploy, operasional, performa, bukti)
```

Aturan sinkronisasi:

1. Perubahan fitur/perilaku → perbarui `PRD.md` dan `PRD-AI.md` pada bagian
   yang relevan.
2. Perubahan status tugas → centang/ubah `DAFTAR-TUGAS.md`; snapshot PRD
   diperbarui dengan `bun run docs:sync`.
3. Perubahan arsitektur, keamanan, atau performa → perbarui aturan di
   `.agents/rules/` dan `PRD-AI.md`.
4. Perubahan kontrak API → perbarui `API.md` pada PR yang sama.
5. CI menjalankan `bun run docs:check`; PRD yang basi menggagalkan gate.

## 11. Snapshot otomatis

<!-- AUTO:PRD:START -->

> **Snapshot otomatis.** Dihasilkan oleh `bun run docs:sync`; jangan edit manual.

- **Item selesai:** 400/412 (97%)
- **Item terbuka:** 12
- **Terblokir / sebagian:** 3 / 1
- **Cakupan:** 31 rute · 67 file route REST · 42 model · 29 migrasi
- **Test:** 58 file unit · 9 file e2e
- **Dokumen**: 19 berkas di `docs/`

**Item yang perlu perhatian:**

- `CICD-02` · terblokir
- `CICD-15` · terblokir
- `CICD-25` · terblokir
- `CICD-11` · sebagian

Status terperinci dan kriteria tiap item: [`DAFTAR-TUGAS.md`](DAFTAR-TUGAS.md).
<!-- AUTO:PRD:END -->
