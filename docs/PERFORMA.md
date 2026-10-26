# Performa — Anggaran, Baseline, dan Prosedur

> Dokumen ini mengikat target performa POS. Angka status tugas tetap di
> [`DAFTAR-TUGAS.md`](DAFTAR-TUGAS.md); niat produk di [`PRD.md`](PRD.md);
> kontrak agen di [`PRD-AI.md`](PRD-AI.md).

## 1. Target pengguna

| Metrik        | Target      | Catatan                                                  |
| ------------- | ----------- | -------------------------------------------------------- |
| LCP p75       | ≤ 2,5 detik | Halaman utama/kasir pada 4G dan perangkat menengah       |
| INP p75       | ≤ 200 ms    | Interaksi keranjang, qty, dan pembayaran tetap responsif |
| CLS           | ≤ 0,1       | Layout tidak bergeser saat data/notifikasi masuk         |
| API baca p95  | ≤ 500 ms    | Katalog, laporan, daftar transaksi                       |
| API tulis p95 | ≤ 1 detik   | Posting transaksi, pembayaran, retur                     |
| `/api/health` | ≤ 200 ms    | Dipakai uptime monitor                                   |

Target ini belum diukur di produksi. Baseline yang ada adalah ukuran build
lokal, bukan bukti Core Web Vitals lapangan.

## 2. Baseline build lokal

Diukur dari `.output/public/assets` setelah `bun --bun run build`
(2026-10-26; 100 file JS/CSS):

| Metrik               |                Baseline |     Anggaran | Status    |
| -------------------- | ----------------------: | -----------: | --------- |
| Total JS+CSS, gzip   |                532,8 KB |     ≤ 600 KB | Lolos     |
| Aset terbesar, gzip  | 102,7 KB (`index-*.js`) |     ≤ 160 KB | Lolos     |
| CSS, gzip            |                 37,4 KB |      ≤ 50 KB | Lolos     |
| Total JS+CSS, mentah |              1.584,7 KB | tidak diikat | Informasi |

Font Manrope/Fraunces kini di-self-host lewat `@fontsource`, sehingga CSS naik
dari 18,2 KB menjadi 37,4 KB gzip (aturan `@font-face` + file font terpisah).
Kenaikan ini disengaja: tidak ada lagi request font pihak ketiga dan tidak ada
FOUT dari CDN. Angka ini adalah **total semua aset**, bukan jumlah yang diunduh
pada satu halaman. Gunakan sebagai pagar regresi; untuk initial load, periksa
network tab/build manifest dan ukur Core Web Vitals setelah deploy.

## 3. Cara memeriksa

```bash
bun --bun run build
bun run perf:budget
```

`bun run perf:budget` membaca `.output/public/assets`, menghitung ukuran gzip,
dan gagal bila salah satu anggaran di tabel bagian 2 terlampaui. Jalankan
sebelum commit bila mengubah komponen, route, dependensi, atau aset.

Pemeriksaan pendukung (bukan pengganti ukuran produksi):

```bash
bun run test:coverage    # ambang cakupan di vitest.config.ts
bun run test:load        # k6 checkout bersamaan (butuh k6 + server hidup)
bunx playwright test tests/e2e/a11y.spec.ts   # axe + keyboard
```

`test:coverage` membatasi cakupan pada `src/server/**` (kecuali wrapper
`*Fn.ts`) dan `src/validations/**`. Ambang saat ini **64% statements, 54%
branch, 59% functions, 66% lines**; naikkan saat tes bertambah, jangan turunkan
tanpa catatan alasan. Komponen/rute React diuji lewat E2E, bukan unit.

`test:load` menjalankan `tests/load/checkout.js` (k6) dengan sesi KASIR
sementara: default 10 VU × 5 iterasi, ambang `http_req_failed < 1%`, p95
< 1,5 s, p99 < 3 s, dan nol checkout gagal. Skrip memilih produk tanpa modifier
dengan stok cukup; seed ulang DB atau turunkan `VUS`/`ITERASI`/`STOK_MIN` bila
stok tidak cukup. Ini uji regresi jalur tulis (penomoran atomik, stok, jurnal,
pembayaran), bukan benchmark kapasitas produksi.

`tests/e2e/a11y.spec.ts` memindai `/`, `/login`, `/pesanan`, `/dashboard`,
`/kasir`, `/produk`, `/pengaturan` dengan axe (tag WCAG 2.1 A/AA) dan
menggagalkan temuan `serious`/`critical`, plus uji fokus keyboard di login dan
tombol produk kasir. Audit otomatis tidak menangkap semua masalah; uji manual
pembaca layar tetap diperlukan.

Untuk query DB:

- Tambah `@@index` untuk FK/filter baru di `prisma/schema.prisma`.
- Verifikasi dengan `EXPLAIN (ANALYZE, BUFFERS)` pada data yang menyerupai
  produksi, bukan tabel kosong.
- Jangan memakai `count()` di dalam transaksi tulis untuk penomoran; gunakan
  `NomorHarian` (`src/server/penomoran.ts`).
- Query daftar wajib memakai `select` ramping dan batas (`take`) atau pagination.

## 4. Pola yang sudah diterapkan

- `PERF-01`: posting transaksi tidak lagi menulis modifier/stok dalam loop N+1;
  update stok memakai satu `UPDATE ... FROM (VALUES ...)` per tabel.
- `PERF-02`: laporan memakai `groupBy`/agregasi DB dan `select` minimal, bukan
  agregasi seluruh tabel di JS.
- `PERF-03`: index FK/filter ditambahkan untuk transaksi, item, pembayaran,
  jurnal, produk, bahan, modifier, sesi, dan akun.
- `PERF-04`: hasil `transaksi.create` dipakai langsung; tidak ada query ulang.
- `PERF-05`: `produkData`, `kasirData`, dan laporan memakai `select`; endpoint
  kategori memakai `kategoriData()` khusus.
- `PERF-06`: nomor struk harian memakai `NomorHarian` atomik, bukan `count()` di
  jalur panas.
- `PRN-PERF-01`..`05`: printer default/perangkat memakai partial unique index,
  `take`, index komposit, dan write `dipindaiPada` yang dibatasi.
- Hardening & skala 2026-10-24: paginasi server `/bahan`, `/produk`, `/member`
  (`TabelQuerySchema` + `*Page`, URL search param sumber kebenaran); agregasi
  SQL laporan pajak (`$queryRaw GROUP BY`, periode `Asia/Jakarta`, minggu ISO
  `IYYY-"W"IW`) dan belanja (`groupBy` + `date_trunc`); dashboard terpisah
  dari katalog kasir; cron kadaluarsa berbatch (satu transaksi:
  `findMany take 100` + `updateMany` + `createMany` audit); koneksi DB
  lewat env `DB_POOL_MAX`/`DB_IDLE_TIMEOUT_MS`/`DB_CONNECTION_TIMEOUT_MS`/
  `DB_STATEMENT_TIMEOUT_MS`.
- Migration `20261024020000_add_composite_indexes`: partial
  `Transaksi_terjual_tanggal_idx` & `Transaksi_kadaluarsa_idx`, komposit
  `Transaksi(memberId, tanggal)`, `PembelianBahan(supplierId, sumberBelanja,
tanggal)`, `TransaksiItem(produkId, qty)`. Eksekusi `EXPLAIN` pada
  data mirip produksi masih backlog (aturan #5 di atas).
- Migration `20261026090000_add_indexes_part2`: `Member(email)`,
  `Member(nama)`, `Produk(nama)`, `notifikasi(userId, createdAt)`,
  `pesanan_draf(status, createdAt)`, `Transaksi(statusPesanan, createdAt)`;
  index `Printer(userId)` tunggal dihapus karena sudah tercakup index
  perangkat. Idempoten agar aman di DB yang sudah berisi index sebagian.
- Cache sesi per request: `src/server/auth.ts` menyimpan promise sesi per
  objek `Headers` di `WeakMap`, jadi loader dan server function dalam satu
  request tidak membaca sesi berulang kali.
- KDS `/dapur` memakai `router.invalidate({ filter })` sehingga polling 20
  detik hanya memuat ulang route tersebut, bukan seluruh halaman.
- Service worker produksi mem-precache aset ber-hash dari `/sw-manifest.js`;
  dokumen HTML hanya di-cache untuk halaman publik dan `/api/**` selalu
  network, sehingga tidak ada HTML ber-sesi yang tersimpan di cache.
- `TXT-04`: route `pesanan` memakai komponen terpisah + `lazyRouteComponent`.
- Router memakai `defaultStaleTime`/`defaultPreloadStaleTime` 30 detik: data
  loader yang baru diambil tidak di-fetch ulang saat navigasi/preload dekat,
  sehingga perpindahan halaman kasir terasa instan tanpa mengorbankan validasi
  setelah aksi tulis (aksi tulis tetap memanggil `router.invalidate`).
- Notifikasi lonceng dimuat malas (`NotificationBellLazy`) agar bundle awal
  halaman publik dan kasir tidak membawa polling notifikasi.
- Font Manrope/Fraunces di-self-host lewat `@fontsource` (nama family persis),
  menghapus request pihak ketiga dan layout shift dari font swap.
- Aset gambar Cloudinary memakai transformasi `w_*,q_auto,f_auto`.
- File besar dipecah agar tetap < 397 baris tanpa mengubah impor publik:
  `src/server/percetakan.ts` → barrel `printerUmum.ts`/`printerPerangkat.ts`/
  `printJob.ts`; `src/routes/pengaturan.tsx` → `usePengaturanForm` +
  `BagianIdentitas`/`BagianOperasional`; `src/components/pesanan/Pesanan.tsx` →
  `usePesanan` + komponen render tipis.

## 5. Aturan untuk perubahan baru

1. **Ukur dulu.** Catat query/ukuran sebelum mengubah; jangan mengklaim optimasi
   tanpa angka.
2. **Jangan tambah N+1.** Bila menulis beberapa baris, gunakan nested create,
   `createMany`, atau update teragregasi dalam transaksi yang sama.
3. **Jangan over-fetch.** Pilih kolom yang dipakai; jangan mengirim seluruh
   model ke klien.
4. **Batasi daftar.** Endpoint daftar tanpa batas/pagination adalah bug
   performa.
5. **Index harus dibuktikan.** Setelah menambah index, jalankan `EXPLAIN` dan
   pastikan planner memakainya pada query nyata.
6. **Code-split halaman berat.** Gunakan lazy route/komponen; jangan menambah
   dependensi besar ke bundle awal tanpa alasan.
7. **Hormati anggaran.** `perf:budget` merah = perbaiki atau buat keputusan
   eksplisit untuk menaikkan anggaran (disertai alasan dan persetujuan manusia).

## 6. Risiko saat ini

- Baseline build lokal tidak sama dengan latensi jaringan, cold start Vercel,
  atau perangkat pengguna.
- `index-*.js` adalah aset terbesar (102,7 KB gzip); pertumbuhan dependensi
  client akan langsung terlihat di sini.
- PITR/backup dan uptime monitor belum diverifikasi; kegagalan database juga
  berdampak pada persepsi performa.
- `bun audit` bersih per 2026-10-26, tetapi audit baru tetap harus ditinjau
  setiap kali dependensi berubah.
- Index baru belum diuji dengan `EXPLAIN (ANALYZE, BUFFERS)` pada data mirip
  produksi; verifikasi itu masih backlog.
- Uji beban k6 belum dijalankan pada infrastruktur produksi/staging; angkanya
  baru valid sebagai regresi lokal.
- Audit axe hanya mencakup 7 rute utama dan level `serious`/`critical`; temuan
  `moderate`/`minor`, halaman lain, dan pembaca layar nyata belum tercakup.

## 7. Kapan memperbarui dokumen ini

Perbarui baseline dan/atau anggaran bila:

- build klien berubah signifikan (>10% gzip);
- menambah halaman/dependensi besar;
- mengubah alur transaksi atau query laporan;
- sudah ada pengukuran produksi (LCP/INP/CLS, p95 API).

Setelah mengubah angka, jalankan `bun run docs:sync` agar snapshot PRD ikut
diperbarui, lalu commit dokumen bersama perubahan kode.
