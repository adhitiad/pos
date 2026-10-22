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

| Area          | Kemampuan yang termasuk                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| Autentikasi   | Login Google, sesi Better Auth, peran OWNER/KASIR/MEMBER, enrollment owner, audit perubahan peran          |
| Kasir         | Katalog, kategori, modifier, keranjang, diskon, pajak, poin member, pembayaran, struk, mode offline/outbox |
| Produk & stok | Produk, kategori, bahan/resep, supplier, pembelian bahan, peringatan stok menipis                          |
| Member        | CRUD member, poin, redeem poin, riwayat transaksi                                                          |
| Buku besar    | Chart of accounts, jurnal otomatis dari transaksi, neraca, rincian akun, audit log                         |
| Laporan       | Penjualan, belanja, pajak, produk terpopuler, kunjungan/analitik operasional                               |
| Cetak         | Pemindaian printer Web Serial, printer default, antrean cetak, struk thermal, PDF                          |
| Pesanan       | Pesanan online publik, meja, kitchen display (KDS), status pesanan                                         |
| Operasional   | Shift kasir, retur, stock opname, pengaturan mode F&B, notifikasi                                          |
| Platform      | REST `/api/v1/*` untuk web + Expo, unggah Cloudinary lewat backend, i18n en/id/zh/ko                       |

### Alur utama

1. **Buka toko:** OWNER/KASIR login, membuka shift, memilih printer default.
2. **Transaksi:** kasir memilih produk/modifier, mengatur qty, diskon, poin,
   metode bayar, lalu memposting transaksi.
3. **Posting atomik:** stok produk/bahan berkurang, jurnal dibuat seimbang,
   nomor struk harian dialokasikan, dan audit dicatat.
4. **Cetak:** struk masuk antrean; printer mengambil, menandai selesai/gagal;
   kasir dapat mencetak ulang.
5. **Tutup shift:** rekap penjualan dan pembayaran diperiksa.
6. **Pemilik:** membuka laporan, buku besar, audit log, dan pengaturan.
7. **Pelanggan:** memesan online atau melihat riwayat/poin sebagai MEMBER.

## 6. Kebutuhan non-fungsional

### 6.1 Performa

Anggaran dan baseline ada di [`PERFORMA.md`](PERFORMA.md). Target yang mengikat:

- LCP p75 ≤ 2,5 detik dan INP p75 ≤ 200 ms pada perangkat menengah.
- API baca p95 ≤ 500 ms; API tulis p95 ≤ 1 detik; `/api/health` ≤ 200 ms.
- Tidak ada N+1 pada jalur transaksi; query daftar selalu dibatasi.
- Total aset klien (JS+CSS, gzip) ≤ 600 KB; aset terbesar ≤ 160 KB gzip.
- Build gagal bila anggaran klien terlampaui (`bun run perf:budget`).

### 6.2 Keamanan dan privasi

- Guard per peran di server function dan REST; klien tidak boleh dipercaya.
- Rahasia hanya di env/GitHub Environment; tidak pernah masuk log atau repo.
- Error database mentah tidak boleh sampai ke klien; gunakan pesan aman + `ref`.
- Rate limit untuk endpoint publik dan analytics.
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
  database.
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

- **Item selesai:** 237/243 (98%)
- **Item terbuka:** 6
- **Terblokir / sebagian:** 3 / 2
- **Cakupan:** 28 rute · 50 file route REST · 37 model · 12 migrasi
- **Test:** 43 file unit · 5 file e2e
- **Dokumen / aturan:** 16 / 16

**Item yang perlu perhatian:**

- `CICD-02` · terblokir
- `CICD-15` · terblokir
- `CICD-25` · terblokir
- `CICD-11` · sebagian
- `CICD-16` · sebagian

Status terperinci dan kriteria tiap item: [`DAFTAR-TUGAS.md`](DAFTAR-TUGAS.md).
<!-- AUTO:PRD:END -->
