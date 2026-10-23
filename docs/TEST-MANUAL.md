# Checklist Uji Manual — Web + Backend (3–4 hari)

> Tujuan: memastikan web (kasir/admin) & REST backend benar-benar siap sebelum
> lanjut ke `E:\code\pos_mobile`. Ikuti berurutan; tandai ✅ / ❌ + catatan.
> Semua langkah memakai data seed (`bun run db:seed`).

## 0. Persiapan (30 menit)

| #   | Langkah       | Cara                                                                                                      | Catatan                                                                    |
| --- | ------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 0.1 | Env siap      | `bun run db:migrate:status` → "up to date"                                                                |                                                                            |
| 0.2 | Seed data     | `bun run db:reset` → "Seed selesai"                                                                       | Wajib bila sebelumnya `bun run test` (unit test mengosongkan tabel master) |
| 0.3 | Dev server    | `bun --bun run dev` → http://localhost:3000                                                               |                                                                            |
| 0.4 | Login OWNER   | Google dengan email di `OWNER_EMAILS` (.env.local)                                                        | Role otomatis OWNER; shift demo sudah terbuka                              |
| 0.5 | Login KASIR   | Google dengan email di `KASIR_EMAILS` (`uewfau@gmail.com`, `kirara1nr@gmail.com`)                         | Role KASIR; shift demo sudah terbuka                                       |
| 0.6 | Gate otomatis | `bunx tsc --noEmit && bun run lint && bun run check && bun run test && bun run test:e2e && bun run build` | Semua harus hijau                                                          |

**Data seed yang tersedia:** minimal 25 produk (saat ini 47 produk + 184 resep) · 24 bahan · 3 member (BRONZE/
SILVER/GOLD) · 8 transaksi (termasuk split payment, dapur, online, retur) ·
3 pembelian + 1 hutang · 2 opname · 3 print job · 8 audit log · 6 page visit ·
3 device visit · 5 shift (3 terbuka) · 2 kategori · 3 meja · 3 grup modifier ·
2 printer (1 default) · 2 supplier · 2 kurir · 7 akun buku besar · 12 pengaturan.
Akun login seed: OWNER dari `OWNER_EMAILS`, KASIR `uewfau@gmail.com` dan
`kirara1nr@gmail.com` (login Google, tanpa password).

---

## 1. Hari 1 — Auth, peran, master data

### 1.1 Login & guard peran (45 menit)

| #     | Langkah                                                                                                           | Expected                                                           |
| ----- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1.1.1 | Buka `/kasir` tanpa login                                                                                         | Redirect `/login`                                                  |
| 1.1.2 | Login OWNER → buka `/produk`, `/bahan`, `/supplier`, `/printer`, `/percetakan`, `/audit-log`, `/user`, `/laporan` | Semua terbuka                                                      |
| 1.1.3 | Login KASIR → buka `/produk`, `/supplier`, `/printer`, `/audit-log`                                               | Redirect `/kasir` (OWNER-only)                                     |
| 1.1.4 | Login KASIR → `/percetakan`, `/kasir`, `/dashboard`, `/shift`, `/retur`, `/opname`                                | Terbuka (operasional)                                              |
| 1.1.5 | Ganti peran OWNER→KASIR di `/user`                                                                                | Role berubah; semua sesi user target dicabut dan harus login ulang |
| 1.1.6 | Ubah peran akun OWNER terakhir                                                                                    | Ditolak ("minimal satu OWNER")                                     |
| 1.1.7 | Ubah peran akun sendiri                                                                                           | Ditolak ("akun sendiri")                                           |
| 1.1.8 | Klik “Cabut semua sesi” pada user lain di `/user`                                                                 | Sesi user target 401; sesi owner tetap aktif                       |

### 1.2 Master produk & bahan (1 jam)

| #     | Langkah                                                                | Expected                                                          |
| ----- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1.2.1 | `/produk` → tambah produk + resep                                      | Stok & HPP sesuai bahan                                           |
| 1.2.2 | Ubah harga produk                                                      | Harga berubah; `/audit-log` mencatat `produk.ubah` + before/after |
| 1.2.3 | Upload foto produk                                                     | Foto tampil (Cloudinary)                                          |
| 1.2.4 | Hapus produk yang sudah terjual                                        | Ditolak, atau item riwayat tetap snapshot                         |
| 1.2.5 | `/bahan` → tambah bahan, ubah harga                                    | `/audit-log` mencatat `bahan.ubah`                                |
| 1.2.6 | Tambah stok via "Tambah Stok" → pilih supplier + centang "Beli hutang" | Stok naik, stok bahan ikut naik, hutang tercatat                  |

---

## 2. Hari 2 — Kasir, transaksi, Struk

### 2.1 Transaksi biasa (1 jam)

| #     | Langkah                                                         | Expected                                           |
| ----- | --------------------------------------------------------------- | -------------------------------------------------- |
| 2.1.1 | `/kasir` → cari produk (nama/SKU/barcode) → tambah ke keranjang | Grid & badge qty sesuai                            |
| 2.1.2 | Ganti metode bayar + uang diterima                              | Kembalian dihitung server                          |
| 2.1.3 | Split payment (TUNAI + QRIS)                                    | Σ jumlah = total, kembalian benar                  |
| 2.1.4 | Bayar dengan member + tukar poin                                | Diskon member & poin terpakai, sisa poin berkurang |
| 2.1.5 | Batal / ubah qty / kosongkan keranjang                          | Toast jelas, tanpa error                           |
| 2.1.6 | Cek `/buku-besar`                                               | Jurnal berimbang (debit = kredit) per transaksi    |
| 2.1.7 | Cek `/dashboard`                                                | Omzet, laba kotor, chart per jam sesuai            |
| 2.1.8 | Login KASIR → diskon di atas batas (default 10%)                | Ditolak; OWNER bisa posting dan muncul di audit    |

### 2.2 Struk & pencetakan (45 menit)

| #     | Langkah                                | Expected                                                   |
| ----- | -------------------------------------- | ---------------------------------------------------------- |
| 2.2.1 | Selesaikan transaksi → struk tampil    | Nomor struk, total, item, pembayaran                       |
| 2.2.2 | Klik "Cetak" (Web Serial, Chrome/Edge) | Printer thermal mencetak (kalau ada printer)               |
| 2.2.3 | `/percetakan` → lihat antrean          | Job `MENUNGGU` muncul, "Lihat struk" menampilkan isi struk |
| 2.2.4 | Klik "Ambil" pada job                  | Status jadi `DIPROSES`, percobaan +1                       |
| 2.2.5 | Klik "Tandai dicetak"                  | Status `DICETAK`                                           |
| 2.2.6 | Job lain → "Tandai gagal" + alasan     | Status `GAGAL` + pesan tampil                              |
| 2.2.7 | KASIR cetak ulang struk 3×             | Tiga job dibuat; percobaan ke-4 ditolak + pesan batas      |
| 2.2.8 | OWNER cetak ulang struk 4×             | Semua job dibuat; kolom hitung cetak OWNER bertambah       |

### 2.3 Master printer (30 menit)

| #     | Langkah                                                              | Expected                                                   |
| ----- | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| 2.3.1 | `/printer` → tambah printer (nama, tipe, lokasi, perangkat, koneksi) | Tabel menampilkan + badge koneksi                          |
| 2.3.2 | Centang "Printer default"                                            | Printer lain otomatis kehilangan status default            |
| 2.3.3 | Matikan printer (nonaktif)                                           | Badge "Nonaktif"                                           |
| 2.3.4 | Hapus printer tanpa riwayat                                          | Berhasil                                                   |
| 2.3.5 | Hapus printer yang punya job                                         | Ditolak ("nonaktifkan saja")                               |
| 2.3.6 | Login OWNER/KASIR → pindai printer → cek daftar perangkat            | Metadata tersimpan; jalur USB/Bluetooth/WiFi/serial tampil |

---

## 3. Hari 3 — Laporan, supplier, hutang, mode F&B

### 3.1 Laporan & ekspor (1 jam)

| #     | Langkah                                            | Expected                                                            |
| ----- | -------------------------------------------------- | ------------------------------------------------------------------- |
| 3.1.1 | `/laporan` (penjualan) filter tanggal              | Deret, produk terlaris, performa kasir sesuai                       |
| 3.1.2 | Unduh CSV / Excel / PDF                            | File terunduh, angka sama dengan layar                              |
| 3.1.3 | `/laporan-pajak`                                   | Rekap PB1/PPN sesuai pengaturan                                     |
| 3.1.4 | `/laporan-belanja`                                 | Rekap per supplier/pasar + rincian pembelian                        |
| 3.1.5 | Ubah tarif pajak di `/pengaturan` → transaksi baru | Pajak mengikuti tarif baru; `/audit-log` mencatat `pengaturan.ubah` |
| 3.1.6 | Ubah batas diskon kasir di `/pengaturan`           | Nilai tersimpan; KASIR mengikuti batas baru                         |
| 3.1.7 | Kosongkan/isi pajak dengan `abc`/`101` → Simpan    | Ditolak, tarif lama tidak berubah; isi 0 → minta konfirmasi         |

### 3.2 Supplier, pasar online/offline, hutang (1 jam)

| #     | Langkah                                                                           | Expected                                |
| ----- | --------------------------------------------------------------------------------- | --------------------------------------- |
| 3.2.1 | `/bahan` → Tambah Stok → **Tanpa supplier** → pilih "Pasar Offline" + nama tempat | Tercatat; sumber = Pasar Offline        |
| 3.2.2 | Tambah Stok tanpa supplier & tanpa pilih sumber                                   | Ditolak ("Pilih sumber belanja")        |
| 3.2.3 | Tambah Stok dengan supplier                                                       | Sumber = supplier                       |
| 3.2.4 | `/supplier` → buat supplier, edit, nonaktifkan                                    | Tabel & rekap sesuai                    |
| 3.2.5 | `/supplier` → "Bayar hutang" → pilih pembelian → nominal sebagian                 | Sisa hutang berkurang, riwayat tercatat |
| 3.2.6 | Bayar melebihi sisa                                                               | Ditolak                                 |
| 3.2.7 | Hapus supplier yang punya pembelian                                               | Ditolak (nonaktifkan)                   |

### 3.3 Mode F&B (1 jam)

| #     | Langkah                                                | Expected                                                                |
| ----- | ------------------------------------------------------ | ----------------------------------------------------------------------- |
| 3.3.1 | `/pengaturan` → aktifkan Mode F&B                      | Nav `/meja` & `/dapur` muncul                                           |
| 3.3.2 | `/meja` → CRUD meja                                    | Meja aktif/nonaktif                                                     |
| 3.3.3 | `/kasir` → pilih meja + modifier (Tingkat Manis wajib) | Modifier wajib divalidasi, tak bisa checkout tanpa pilih                |
| 3.3.4 | Pesanan dine-in → `/dapur`                             | KDS menampilkan pesanan aktif, ubah status                              |
| 3.3.5 | `/pesanan` → buat pesanan online                       | Stok belum berkurang, poin belum bertambah, muncul "Belum bayar" di KDS |
| 3.3.6 | KDS → "Tandai Lunas" pada pesanan online               | Stok/poin/jurnal/pembayaran dibuat sekali; badge berubah "Lunas"        |
| 3.3.7 | `/pengaturan` → matikan Mode F&B                       | Nav F&B hilang, data tetap ada                                          |

---

## 4. Hari 4 — Backend REST + uji manual perangkat (2 hari penuh, 4–8 jam/hari)

> Backend diuji lewat REST (bagian 4) memakai skrip/cURL, lalu pengujian
> manual perangkat & printer (bagian 5). Mobile (Expo) **belum** diuji di sini.

### 4.1 Smoke REST (45 menit) —semua lewat Bearer token

```bash
# 1) Login native → token
#    Prasyarat: GOOGLE_NATIVE_CLIENT_ID diisi dan berbeda dari GOOGLE_CLIENT_ID;
#    ID token harus diterbitkan untuk client native tersebut (aud cocok).
curl -X POST http://localhost:3000/api/v1/auth-native \
  -H 'content-type: application/json' \
  -d '{"provider":"google","idToken":"<ID_TOKEN>","callbackURL":"pos://auth"}'
# → data.session.token

# Regresi: token web ke endpoint native harus 401, dan header x-client palsu
# pada /api/v1/auth-social tidak boleh menghasilkan session.token.

export TOKEN=<token>
export BASE=http://localhost:3000
```

| #      | Panggilan                                                | Expected                                |
| ------ | -------------------------------------------------------- | --------------------------------------- |
| 4.1.1  | `GET /api/v1/kasir-data`                                 | 200 + master kasir                      |
| 4.1.2  | `GET /api/v1/kasir-data` tanpa token                     | 401                                     |
| 4.1.3  | `POST /api/v1/transaksi` (2× **idempotencyKey sama**)    | 201, `transaksiId` sama, `replay: true` |
| 4.1.4  | `POST /api/v1/transaksi` dengan `idempotencyKey` berbeda | 201, transaksi berbeda                  |
| 4.1.5  | `POST /api/v1/transaksi` dengan `pajak` dari klien       | Pajak diabaikan (server hitung)         |
| 4.1.6  | `GET /api/v1/laporan-penjualan?dari=&sampai=`            | 200 + ringkasan                         |
| 4.1.7  | `GET /api/v1/percetakan?status=MENUNGGU`                 | 200 + job                               |
| 4.1.8  | `POST /api/v1/percetakan` (2× idempotencyKey sama)       | 201, `id` job sama                      |
| 4.1.9  | `POST /api/v1/percetakan/$id/ambil` 2×                   | 200 lalu 422                            |
| 4.1.10 | `POST /api/v1/percetakan/$id/selesai`                    | 200, status DICETAK                     |
| 4.1.11 | `GET /api/v1/saya`                                       | 200 + profil member (email seed)        |
| 4.1.12 | `GET /api/v1/audit-log?entitas=Produk`                   | 200 + log                               |
| 4.1.13 | `GET /api/v1/health`                                     | 200                                     |
| 4.1.14 | `OPTIONS /api/v1/transaksi` + Origin tepercaya           | 204 + header CORS                       |
| 4.1.15 | `OPTIONS /api/v1/transaksi` + Origin asing               | 403 (tanpa header CORS)                 |
| 4.1.16 | `POST /api/v1/transaksi` tanpa `Origin` (klien native)   | Tidak ditolak (OW-14)                   |
| 4.1.17 | `GET /api/health`                                        | 200, `database=ok`, `app=healthy`       |
| 4.1.18 | `POST /api/v1/device-visit-token` → POST `device-visit`  | 200, satu baris per perangkat           |
| 4.1.19 | `POST /api/v1/device-visit` dengan token palsu           | 422, tidak menambah baris               |
| 4.1.20 | `POST /api/v1/transaksi` KASIR diskon > batas            | 422 + audit `transaksi.diskon.ditolak`  |

### 4.2 Uji beban ringan (30 menit)

| #     | Langkah                                                    | Expected                                   |
| ----- | ---------------------------------------------------------- | ------------------------------------------ |
| 4.2.1 | 20 transaksi beruntun (script)                             | Semua 201, stok & jurnal konsisten         |
| 4.2.2 | 2x POST transaksi **bersamaan** dengan idempotencyKey sama | 1 transaksi saja (tidak dobel)             |
| 4.2.3 | 2x POST transaksi **bersamaan** tanpa idempotencyKey       | 2 transaksi (memang 2 penjualan berbeda)   |
| 4.2.4 | Burst 200 request health check                             | Rate limit kicks in (429) sesuai kebijakan |

### 4.3 Offline (60 menit)

| #     | Langkah                                                                      | Expected                                         |
| ----- | ---------------------------------------------------------------------------- | ------------------------------------------------ |
| 4.3.1 | Matikan jaringan (devtools offline) → buat transaksi di `/kasir`             | Masuk antrean, banner "offline"                  |
| 4.3.2 | Nyalakan jaringan                                                            | Antrean terkirim otomatis, toast jumlah terkirim |
| 4.3.3 | Matikan jaringan **saat** respons server hilang (devtools: block lalu kirim) | Retry tak membuat transaksi ganda (idempotensi)  |
| 4.3.4 | Kirim `waktuKlien` +25 jam dari jam server                                   | Ditolak validasi, tidak ada transaksi            |

---

## 5. Uji manual perangkat (oprional, bila ada hardware)

| #   | Perangkat                              | Expected                                               |
| --- | -------------------------------------- | ------------------------------------------------------ |
| 5.1 | Printer thermal 58mm (ESC/POS)         | `/percetakan` → ambil job → cetak → "Tandai dicetak"   |
| 5.2 | Ponsel Android (Chrome)                | Layout responsif, nav bawah, tak ada scroll horizontal |
| 5.3 | Tablet iPad                            | Grid produk 3 kolom, panel bayar tetap                 |
| 5.4 | Koneksi lambat (3G, throttle devtools) | Kasir tetap responsif, spinner tidak freeze            |

---

## 6. Penutup

| #   | Langkah                                              | Expected                                       |
| --- | ---------------------------------------------------- | ---------------------------------------------- |
| 6.1 | `bun run db:migrate:status`                          | up to date                                     |
| 6.2 | `bunx tsc --noEmit && bun run lint && bun run check` | 0 error, 0 warning                             |
| 6.3 | `bun run test`                                       | Semua lulus                                    |
| 6.4 | `bun run test:e2e`                                   | Semua lulus                                    |
| 6.5 | `bun run build`                                      | Sukses                                         |
| 6.6 | Catat temuan di `docs/DAFTAR-TUGAS.md` (item `[ ]`)  | Siap dikerjakan sebelum lanjut ke `pos_mobile` |

## Kenapa checklist ini penting untuk `pos_mobile`

Kontrak yang sudah dipakai checklist ini (Bearer auth, idempotensi offline,
antrean cetak, envelope `{ ok, data }`) **sama** dengan yang akan dipakai
aplikasi Expo — jadi regresi yang ketahuan di tahap ini tidak akan terulang
di tahap mobile.
