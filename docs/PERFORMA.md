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
(2026-10-22; 79 file JS/CSS):

| Metrik               |                Baseline |     Anggaran | Status    |
| -------------------- | ----------------------: | -----------: | --------- |
| Total JS+CSS, gzip   |                449,5 KB |     ≤ 600 KB | Lolos     |
| Aset terbesar, gzip  | 108,6 KB (`index-*.js`) |     ≤ 160 KB | Lolos     |
| CSS, gzip            |                 17,4 KB |      ≤ 50 KB | Lolos     |
| Total JS+CSS, mentah |              1.371,2 KB | tidak diikat | Informasi |

Angka ini adalah **total semua aset**, bukan jumlah yang diunduh pada satu
halaman. Gunakan sebagai pagar regresi; untuk initial load, periksa network
tab/build manifest dan ukur Core Web Vitals setelah deploy.

## 3. Cara memeriksa

```bash
bun --bun run build
bun run perf:budget
```

`bun run perf:budget` membaca `.output/public/assets`, menghitung ukuran gzip,
dan gagal bila salah satu anggaran di tabel bagian 2 terlampaui. Jalankan
sebelum commit bila mengubah komponen, route, dependensi, atau aset.

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
- `TXT-04`: route `pesanan` memakai komponen terpisah + `lazyRouteComponent`.
- Aset gambar Cloudinary memakai transformasi `w_*,q_auto,f_auto`.

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
- `index-*.js` adalah aset terbesar (107,3 KB gzip); pertumbuhan dependensi
  client akan langsung terlihat di sini.
- PITR/backup dan uptime monitor belum diverifikasi; kegagalan database juga
  berdampak pada persepsi performa.
- `bun audit` masih memiliki advisory transitive yang diketahui; audit baru
  tetap harus ditinjau.

## 7. Kapan memperbarui dokumen ini

Perbarui baseline dan/atau anggaran bila:

- build klien berubah signifikan (>10% gzip);
- menambah halaman/dependensi besar;
- mengubah alur transaksi atau query laporan;
- sudah ada pengukuran produksi (LCP/INP/CLS, p95 API).

Setelah mengubah angka, jalankan `bun run docs:sync` agar snapshot PRD ikut
diperbarui, lalu commit dokumen bersama perubahan kode.
