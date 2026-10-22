# API POS — kontrak resmi web & mobile (Expo)

> **Satu-satunya kontrak data.** Web (TanStack Start) dan mobile (Expo/React Native)
> memakai endpoint yang sama di bawah ini. Server function (`*Fn`) hanya fasad
> web di atas logika murni `src/server/*.ts` — logika yang sama dipakai route REST.
> Agen: baca `AGENTS.md` → `.agents/rules/11-tanstack-db.md` → file ini sebelum coding.

## Dasar

- Base URL dev: `http://localhost:3000`. Semua path diawali `/api/`.
- Format: JSON. Uang = **integer rupiah**. Tanggal = ISO-8601 string.
- Envelope sukses: `{ "ok": true, "data": ... }`
- Envelope gagal: `{ "ok": false, "error": { "code": "...", "message": "..." } }`
- Kode error: `UNAUTHORIZED` (401, belum login) · `FORBIDDEN` (403, peran tidak
  boleh) · `BAD_REQUEST` (400) · `DOMAIN` (422, validasi/bisnis — pesan aman
  Indonesia) · `LIMIT_PERANGKAT` / `PERANGKAT_BERJOB` (409, batas perangkat) ·
  `TOO_MANY_REQUESTS` (429, kena rate limit) · `INTERNAL` (500, pesan umum + ref
  log, isi DB tidak bocor).
- Rate limit per IP+endpoint (store bersama Postgres): endpoint tulis sensitif
  (mis. `auth-social` 5/menit, `pesan` 10/menit) mengembalikan 429 +
  `Retry-After`. Server function analytics (`device-visit`, `kunjungan`) dibatasi
  di sisi server function.
- Endpoint printer/percetakan dibatasi **per user** (bukan IP): GET 60/10 detik,
  mutasi 20/10 detik. Respons 429 memuat `Retry-After`, `X-RateLimit-Limit`, dan
  `X-RateLimit-Remaining`.
- **Header keamanan** (`src/lib/csp.ts`): respons `/api/*` memakai
  `Cache-Control: no-store`; semua respons memakai `Cross-Origin-Opener-Policy` &
  `Cross-Origin-Resource-Policy: same-origin`.
- **Origin (OW-14):** request borongan (`POST`/`PUT`/`PATCH`/`DELETE`) ke `/api/*`
  dari browser harus ber-`Origin` yang cocok dengan `BETTER_AUTH_URL`/`TRUSTED_ORIGINS`;
  jika tidak → **403**. Klien non-browser (Expo) yang tidak mengirim `Origin` diizinkan.

## Auth — sesi cookie Better Auth (web + Expo)

Login Google via OAuth redirect (web):

```typescript

GET /api/auth/sign-in/social  (via authClient.signIn.social, bukan fetch manual)
GET /api/auth/callback/google → callbackURL (mis. /kasir)
GET /api/auth/get-session     → { session, user } | null
POST /api/auth/sign-out
```

Expo (fetch, tanpa WebView redirect):

```ts
// 1. Google native sign-in (expo-auth-session / @react-native-google-signin)
//    → dapatkan idToken + accessToken
// 2. Tukarkan ke sesi Better Auth:
const r = await fetch(`${BASE}/api/v1/auth-social`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-client': 'expo' },
  credentials: 'include', // simpan cookie sesi
  body: JSON.stringify({
    provider: 'google',
    idToken, // string JWT hasil native sign-in
    accessToken, // opsional
    callbackURL: '/',
  }),
})
// 3. Panggilan berikut sertakan cookie (credentials: 'include'
//    + persist cookie via expo SecureStore / react-native-cookies).
```

Body request:

| Field         | Tipe   | Wajib | Keterangan                        |
| ------------- | ------ | ----- | --------------------------------- |
| `provider`    | string | ya    | `'google'`                        |
| `idToken`     | string | ya    | Google ID JWT dari native sign-in |
| `accessToken` | string | tidak | Google access token (opsional)    |
| `callbackURL` | string | tidak | Default `'/'`                     |

Respons sukses: `{ ok: true, data: { user: { id, name, email, image }, session?: { token } } }` — `session.token` hanya disertakan bila header `x-client: expo` (web cukup cookie httpOnly, token tidak dibocorkan ke JS).
Catatan keamanan (OW-13): token itu milik sesi yang **baru** dibuat dari `idToken` Google terverifikasi (bukan eskalasi). Simpan di `expo-secure-store`, jangan di log/AsyncStorage biasa, dan utamakan cookie sesi bila memungkinkan.
Respons gagal: `{ ok: false, error: { code, message } }` — `UNAUTHORIZED` (401) bila token invalid, `FORBIDDEN` (403) bila email belum diverifikasi.

Peran (`user.role`): `OWNER` | `KASIR` | `MEMBER`. User baru = `MEMBER`,
kecuali email di `OWNER_EMAILS` → `OWNER`. Naik pangkat via Prisma Studio.

## Katalog endpoint

| Method & path                                                                            | Peran                | Body / query                                                                                                                                                                                                                        | Hasil `data`                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/kasir-data`                                                                 | OWNER, KASIR         | —                                                                                                                                                                                                                                   | `{ kategori[], produk[], member[], delivery[] }` (master aktif untuk kasir)                                                                                                                                           |
| `POST /api/v1/transaksi`                                                                 | OWNER, KASIR         | `PostingTransaksi` (bawah)                                                                                                                                                                                                          | struk ringkas + `jurnalNomor`, `hpp` (201); `replay: true` bila idempotensi kicks in                                                                                                                                  |
| `GET /api/v1/transaksi/struk/{id}/pdf`                                                   | OWNER, KASIR         | `{id}` id transaksi (cuid)                                                                                                                                                                                                          | file PDF struk (attachment); isi disusun server dari snapshot transaksi                                                                                                                                               |
| `GET /api/v1/pesan`                                                                      | Publik               | —                                                                                                                                                                                                                                   | `{ produk[], meja[] }` (master menu & meja aktif untuk pesanan online)                                                                                                                                                |
| `POST /api/v1/pesan`                                                                     | Publik               | `PostingTransaksi` (tanpa member/delivery)                                                                                                                                                                                          | struk ringkas (201); `kasirId=null`, `statusPesanan=MENUNGGU`, metode `QRIS`/`TRANSFER`/`EWALLET`, hanya dine-in/take-away; bila sesi `MEMBER` aktif, pesanan ditautkan ke member (diskon/poin otomatis)              |
| `GET /api/v1/produk`                                                                     | OWNER                | —                                                                                                                                                                                                                                   | `{ produk[], kategori[], bahan[] }`                                                                                                                                                                                   |
| `POST /api/v1/produk`                                                                    | OWNER                | `ProdukInput`, atau `{ toggle: true, id, aktif }`                                                                                                                                                                                   | `{ id }` (201)                                                                                                                                                                                                        |
| `PUT /api/v1/produk`                                                                     | OWNER                | `ProdukInput & { id }` (resep diganti penuh)                                                                                                                                                                                        | `{ id }`                                                                                                                                                                                                              |
| `DELETE /api/v1/produk?id=`                                                              | OWNER                | —                                                                                                                                                                                                                                   | `{ id }` (item riwayat keep snapshot)                                                                                                                                                                                 |
| `GET /api/v1/kategori`                                                                   | OWNER                | —                                                                                                                                                                                                                                   | `kategori[]` (+ `jumlahProduk`)                                                                                                                                                                                       |
| `POST /api/v1/kategori`                                                                  | OWNER                | `{ nama, deskripsi? }`                                                                                                                                                                                                              | `{ id }` (201)                                                                                                                                                                                                        |
| `DELETE /api/v1/kategori?id=`                                                            | OWNER                | —                                                                                                                                                                                                                                   | `{ id }` (422 bila dipakai produk)                                                                                                                                                                                    |
| `GET /api/v1/member`                                                                     | OWNER                | —                                                                                                                                                                                                                                   | `member[]` (+ `poin`, `jumlahTransaksi`, `terakhir`)                                                                                                                                                                  |
| `POST /api/v1/member`                                                                    | OWNER                | `MemberInput`                                                                                                                                                                                                                       | `{ id }` (201)                                                                                                                                                                                                        |
| `PUT /api/v1/member`                                                                     | OWNER                | `MemberInput & { id }`                                                                                                                                                                                                              | `{ id }`                                                                                                                                                                                                              |
| `DELETE /api/v1/member?id=`                                                              | OWNER                | —                                                                                                                                                                                                                                   | `{ id }` (422 bila ada riwayat)                                                                                                                                                                                       |
| `GET /api/v1/member/riwayat?id=`                                                         | OWNER                | `?id= id member`                                                                                                                                                                                                                    | `{ member: {nama,poin,totalBelanja,diskonPersen,tier}, riwayatAktif: boolean, transaksi[] }` (tiap transaksi + subtotal, diskon, pajak, items[])                                                                      |
| `GET /api/v1/meja`                                                                       | OWNER, KASIR         | —                                                                                                                                                                                                                                   | `meja[]{id,nomor,nama,aktif,jumlahTransaksi}`                                                                                                                                                                         |
| `POST /api/v1/meja`                                                                      | OWNER                | `{ nomor, nama?, aktif? }`                                                                                                                                                                                                          | `{ id }` (201)                                                                                                                                                                                                        |
| `PUT /api/v1/meja`                                                                       | OWNER                | `{ id, nomor?, nama?, aktif? }`                                                                                                                                                                                                     | `{ id }`                                                                                                                                                                                                              |
| `DELETE /api/v1/meja?id=`                                                                | OWNER                | —                                                                                                                                                                                                                                   | `{ id }` (422 bila ada pesanan aktif)                                                                                                                                                                                 |
| `GET /api/v1/modifier-grup`                                                              | OWNER                | —                                                                                                                                                                                                                                   | `grup[]{id,nama,wajib,min,max,aktif,modifiers[]}`                                                                                                                                                                     |
| `POST /api/v1/modifier-grup`                                                             | OWNER                | `{ nama, wajib?, min?, max?, aktif? }`                                                                                                                                                                                              | `{ id }` (201)                                                                                                                                                                                                        |
| `PUT /api/v1/modifier-grup`                                                              | OWNER                | `{ id, nama?, wajib?, min?, max?, aktif? }`                                                                                                                                                                                         | `{ id }`                                                                                                                                                                                                              |
| `DELETE /api/v1/modifier-grup?id=`                                                       | OWNER                | —                                                                                                                                                                                                                                   | `{ id }` (422 bila dipakai produk)                                                                                                                                                                                    |
| `GET /api/v1/modifier?grupId=`                                                           | OWNER                | `?grupId=` opsional                                                                                                                                                                                                                 | `modifier[]{id,grupId,nama,hargaTambahan,aktif}`                                                                                                                                                                      |
| `POST /api/v1/modifier`                                                                  | OWNER                | `{ grupId, nama, hargaTambahan?, aktif? }`                                                                                                                                                                                          | `{ id }` (201)                                                                                                                                                                                                        |
| `PUT /api/v1/modifier`                                                                   | OWNER                | `{ id, grupId?, nama?, hargaTambahan?, aktif? }`                                                                                                                                                                                    | `{ id }`                                                                                                                                                                                                              |
| `DELETE /api/v1/modifier?id=`                                                            | OWNER                | —                                                                                                                                                                                                                                   | `{ id }` (422 bila dipakai transaksi)                                                                                                                                                                                 |
| `GET /api/v1/laporan?dari=&sampai=&akunId?`                                              | OWNER                | tanggal `YYYY-MM-DD`                                                                                                                                                                                                                | `{ akun[], pembuka[], entri[], trial[] }`                                                                                                                                                                             |
| `GET /api/v1/laporan-penjualan?dari=&sampai=&grup=&format=`                              | OWNER                | `grup=harian\|mingguan\|bulanan`, `format=csv\|xlsx\|pdf` (opsional)                                                                                                                                                                | `{ ringkasan, deret[], produkTerlaris[], performaKasir[] }`; `format` → file unduhan                                                                                                                                  |
| `GET /api/v1/laporan-pajak?dari=&sampai=&grup=&format=`                                  | OWNER                | `grup=harian\|mingguan\|bulanan` (default `bulanan`), `format=csv\|xlsx\|pdf` (opsional)                                                                                                                                            | `{ dari, sampai, grup, totalPerJenis[{jenis,jumlahTransaksi,subtotal,pajak,total}], riwayat[{periode,jenis[{jenis,pajak}]}] }`; `format` → file unduhan                                                               |
| `GET /api/v1/shift?dari=&sampai=`                                                        | OWNER, KASIR         | tanggal `YYYY-MM-DD` (default: bulan berjalan)                                                                                                                                                                                      | `{ semuaKasir, shiftAktif, riwayat[] }` — tiap shift: `{id,kasirId,kasirNama,waktuBuka,waktuTutup,kasAwal,kasAkhir,selisih,catatan,jumlahTransaksi,totalPenjualan,totalTunai,seharusnya}` (OWNER melihat semua kasir) |
| `POST /api/v1/shift`                                                                     | OWNER, KASIR         | `{ aksi: 'buka', kasAwal }` \| `{ aksi: 'tutup', kasAkhir, catatan? }`                                                                                                                                                              | buka → `{ id, waktuBuka }` (201); tutup → `{ id, kasAwal, kasAkhir, seharusnya, selisih, …ringkasan }`; maks 1 shift terbuka per kasir (422)                                                                          |
| `GET /api/v1/retur?dari=&sampai=`                                                        | OWNER, KASIR         | tanggal `YYYY-MM-DD` (default: bulan berjalan)                                                                                                                                                                                      | `{ dari, sampai, jumlahRetur, totalRetur, riwayat[{id,nomor,tanggal,transaksiNomor,kasirNama,alasan,totalRetur,items[{namaProduk,qty,subtotal}]}] }`                                                                  |
| `POST /api/v1/retur`                                                                     | OWNER, KASIR         | `BuatRetur` (bawah)                                                                                                                                                                                                                 | `{ id, nomor, totalRetur }` (201) — balik stok produk+bahan & tulis jurnal pembalik                                                                                                                                   |
| `GET /api/v1/retur/produk-aktif`                                                         | OWNER, KASIR         | —                                                                                                                                                                                                                                   | `produk[]{id,nama,stok,harga}` aktif untuk form retur                                                                                                                                                                 |
| `GET /api/v1/retur/transaksi?id=`                                                        | OWNER, KASIR         | `?id=` id transaksi (cuid)                                                                                                                                                                                                          | `{ id, nomor, tanggal, total, items[{id,produkId,namaProduk,qty,hargaSatuan}] }` (422 bila tidak ada)                                                                                                                 |
| `GET /api/v1/opname?jenis=&dari=&sampai=`                                                | OWNER, KASIR         | `jenis=PRODUK\|BAHAN` (opsional); tanggal opsional                                                                                                                                                                                  | `{ dari, sampai, jumlahOpname, riwayat[{id,nomor,tanggal,jenis,kasirNama,catatan,items[{nama,stokTercatat,stokFisik,selisih}]}] }`                                                                                    |
| `POST /api/v1/opname`                                                                    | OWNER, KASIR         | `SimpanOpname` (bawah)                                                                                                                                                                                                              | `{ id, nomor, jenis }` (201) — koreksi stok sistem ke stok fisik                                                                                                                                                      |
| `GET /api/v1/opname/master?jenis=`                                                       | OWNER, KASIR         | `jenis=PRODUK\|BAHAN` (wajib)                                                                                                                                                                                                       | `produk[]{id,nama,stok}` atau `bahan[]{id,nama,stok,satuan}` aktif                                                                                                                                                    |
| `GET /api/v1/pengaturan`                                                                 | OWNER, KASIR         | —                                                                                                                                                                                                                                   | `{ modeFnb, riwayatBelanja, namaToko, judulApp, logoUrl, ikonUrl, strukOtomatis, deskripsiApp, pajakRestoPersen, pajakRetailPersen, semua }`                                                                          |
| `PUT /api/v1/pengaturan`                                                                 | OWNER                | `{ kunci: 'mode_fnb'\|'riwayat_belanja_aktif'\|'nama_toko'\|'printer_escpos'\|'struk_otomatis'\|'judul_app'\|'logo_url'\|'ikon_url'\|'deskripsi_app'\|'pajak_persen'\|'pajak_resto_persen'\|'pajak_retail_persen', nilai: string }` | `{ kunci, nilai }`; `struk_otomatis` hanya menerima `nonaktif\|cetak\|pdf`; `logo_url`/`ikon_url` wajib URL `https://res.cloudinary.com/` milik cloud kita                                                            |
| `GET /api/v1/notifikasi`                                                                 | OWNER, KASIR, MEMBER | —                                                                                                                                                                                                                                   | OWNER: `notifikasi[]` stok habis + pendapatan harian/mingguan/bulanan; KASIR: stok habis + pesanan online `MENUNGGU`; MEMBER: 5 transaksi terakhir + status 5 pesanan online miliknya                                 |
| `POST /api/v1/unggah`                                                                    | OWNER                | —                                                                                                                                                                                                                                   | `{ cloudName, apiKey, timestamp, folder, allowedFormats, maxFileSize, signature }` — server membuat tanda tangan upload (secret tetap di server)                                                                      |
| `DELETE /api/v1/unggah`                                                                  | OWNER                | `{ url: string }` (secure_url Cloudinary milik folder kita)                                                                                                                                                                         | `{ hasil }` — hapus aset (422 bila URL bukan milik kita)                                                                                                                                                              |
| `GET /api/v1/unggah/unduh?url=`                                                          | OWNER                | `url=` secure_url Cloudinary                                                                                                                                                                                                        | file (attachment) — diunduh lewat server, bukan browser                                                                                                                                                               |
| `GET /api/v1/bahan`                                                                      | OWNER                | —                                                                                                                                                                                                                                   | `bahan[]` (+ `menipis`, `dipakaiProduk`)                                                                                                                                                                              |
| `POST /api/v1/bahan`                                                                     | OWNER                | `BahanInput`                                                                                                                                                                                                                        | `{ id }` (201)                                                                                                                                                                                                        |
| `PUT /api/v1/bahan`                                                                      | OWNER                | `BahanInput & { id }`                                                                                                                                                                                                               | `{ id }`                                                                                                                                                                                                              |
| `DELETE /api/v1/bahan?id=`                                                               | OWNER                | —                                                                                                                                                                                                                                   | `{ id }` (422 bila dipakai resep)                                                                                                                                                                                     |
| `GET /api/v1/supplier`                                                                   | OWNER                | —                                                                                                                                                                                                                                   | `supplier[]{id,nama,kontak,alamat,catatan,aktif,jumlahPembelian,totalBelanja,hutang}`                                                                                                                                 |
| `GET /api/v1/supplier?hutang=`                                                           | OWNER                | `?hutang=` id supplier                                                                                                                                                                                                              | `hutang[]{pembelianBahanId,tanggal,bahanNama,totalHarga,belumDibayar}` (pembelian yang belum lunas)                                                                                                                   |
| `POST /api/v1/supplier`                                                                  | OWNER                | `SupplierInput`, atau `{ bayar: { pembelianBahanId, jumlah, catatan? } }`                                                                                                                                                           | `{ id }` (201); `bayar` → `{ id, supplierId, belumDibayar }` (201) — kurangi sisa hutang                                                                                                                              |
| `PUT /api/v1/supplier`                                                                   | OWNER                | `SupplierInput & { id }`                                                                                                                                                                                                            | `{ id }`                                                                                                                                                                                                              |
| `DELETE /api/v1/supplier?id=`                                                            | OWNER                | —                                                                                                                                                                                                                                   | `{ id }` (422 bila punya riwayat pembelian)                                                                                                                                                                           |
| `GET /api/v1/laporan-belanja?dari=&sampai=&supplierId=&sumberBelanja=&format=`           | OWNER                | tanggal `YYYY-MM-DD`; `supplierId` & `sumberBelanja` (`SUPPLIER`\|`PASAR_ONLINE`\|`PASAR_OFFLINE`) opsional; `format=csv\|xlsx\|pdf` (opsional)                                                                                     | `{ dari, sampai, totalBelanja, jumlahPembelian, totalHutang, perSumber[], perBulan[], detail[] }`; `format` → file unduhan                                                                                            |
| `GET /api/v1/audit-log?entitas=&aksi=&aktorId=&dari=&sampai=&take=&skip=`                | OWNER                | filter opsional (entitas = `Produk`\|`Kategori`\|`Bahan`\|`Supplier`\|`PembelianBahan`\|`User`\|`Pengaturan`)                                                                                                                       | `{ rows[{id,aksi,entitas,entitasId,aktorId,aktorNama,sebelum,sesudah,waktu}], total }`                                                                                                                                |
| `GET /api/v1/percetakan?status=&printerId=&take=`                                        | OWNER, KASIR         | `status=MENUNGGU\|DIPROSES\|DICETAK\|GAGAL` (opsional); `printerId` opsional; `take` ≤ 50                                                                                                                                           | `printJob[]{id,printerId,printerNama,transaksiId,tipe,status,percobaan,pesanGalat,dicetakPada,diambilPada,createdAt,payload}` — `payload` = isi struk siap render                                                     |
| `POST /api/v1/percetakan`                                                                | OWNER, KASIR         | `{ printerId?, transaksiId, tipe?, idempotencyKey? }`                                                                                                                                                                               | `printJob` (201) — payload disusun server dari transaksi; `idempotencyKey` membuat retry tak menghasilkan job ganda                                                                                                   |
| `POST /api/v1/percetakan/$id/ambil`                                                      | OWNER, KASIR         | —                                                                                                                                                                                                                                   | `printJob` (status `MENUNGGU` → `DIPROSES`; 422 bila sudah diambil)                                                                                                                                                   |
| `POST /api/v1/percetakan/$id/selesai`                                                    | OWNER, KASIR         | —                                                                                                                                                                                                                                   | `printJob` (status `DICETAK`)                                                                                                                                                                                         |
| `POST /api/v1/percetakan/$id/gagal`                                                      | OWNER, KASIR         | `{ pesan? }`                                                                                                                                                                                                                        | `printJob` (status `GAGAL` + `pesanGalat`)                                                                                                                                                                            |
| `GET /api/v1/printer`                                                                    | OWNER                | —                                                                                                                                                                                                                                   | `printer[]{id,userId,nama,tipe,lokasi,perangkat,koneksi,vendorId,vendorName,serialNumber,productName,dipindaiPada,terakhirDipakai,default,defaultPengguna,aktif}`                                                     |
| `POST /api/v1/printer`                                                                   | OWNER                | `{ nama, tipe?, lokasi?, perangkat?, koneksi?, vendorId?, vendorName?, serialNumber?, productName?, default?, aktif? }`                                                                                                             | `{ id }` (201)                                                                                                                                                                                                        |
| `PUT /api/v1/printer`                                                                    | OWNER                | `{ id, nama, tipe?, lokasi?, perangkat?, koneksi?, vendorId?, vendorName?, serialNumber?, productName?, default?, aktif? }`                                                                                                         | `{ id }` — `default: true` memindahkan status default ke printer ini                                                                                                                                                  |
| `DELETE /api/v1/printer?id=`                                                             | OWNER                | —                                                                                                                                                                                                                                   | `{ id }` (422 bila punya riwayat cetak)                                                                                                                                                                               |
| `GET /api/v1/printer/perangkat`                                                          | OWNER, KASIR         | —                                                                                                                                                                                                                                   | `printer[]` milik pengguna yang login (aktif, terbaru dipindai lebih dulu)                                                                                                                                            |
| `POST /api/v1/printer/perangkat`                                                         | OWNER, KASIR         | `{ nama, tipe?, lokasi?, perangkat, koneksi, vendorId?, vendorName?, serialNumber?, productName? }`                                                                                                                                 | printer tersimpan (201) — upsert per `(userId, perangkat)`, `userId` dari sesi; maksimal 20 perangkat/user (`409 LIMIT_PERANGKAT`)                                                                                    |
| `DELETE /api/v1/printer/perangkat/$id`                                                   | OWNER, KASIR         | `?permanen=1` opsional                                                                                                                                                                                                              | `{ id, dihapus }` — default nonaktif (`dihapus:false`); permanen hanya tanpa riwayat cetak (`409 PERANGKAT_BERJOB`); perangkat user lain → 422                                                                        |
| `PATCH /api/v1/printer/perangkat/$id/default`                                            | OWNER, KASIR         | —                                                                                                                                                                                                                                   | `printer` — jadikan default milik pengguna; default pengguna lain tidak berubah; perangkat nonaktif/milik user lain → 422                                                                                             |
| `GET /api/v1/printer/default`                                                            | OWNER, KASIR         | —                                                                                                                                                                                                                                   | printer default aktif (atau printer aktif pertama) — `null` bila belum ada                                                                                                                                            |
| `GET /api/v1/saya`                                                                       | OWNER, KASIR, MEMBER | —                                                                                                                                                                                                                                   | `{ member: {id,nama,telepon,poin,totalBelanja,diskonPersen,tier} \| null, riwayatAktif: boolean, transaksi[] }` — profil & riwayat milik pengguna yang login (dicocokkan via email)                                   |
| `GET /api/v1/identitas`                                                                  | publik               | —                                                                                                                                                                                                                                   | `{ judul, ikonUrl, logoUrl, deskripsi }` — identitas publik untuk web & Expo (ikon fallback ke logo, lalu inisial judul)                                                                                              |
| `GET /api/v1/app-icon`                                                                   | publik               | —                                                                                                                                                                                                                                   | **SVG** (bukan envelope): ikon 512×512 dari `ikon_url` Cloudinary, fallback ikon inisial judul; dipakai favicon/manifest                                                                                              |
| `GET /api/v1/manifest`                                                                   | publik               | —                                                                                                                                                                                                                                   | **manifest.json** (bukan envelope): `name`/`short_name` dari judul app + ikon Cloudinary 192/512 + SVG                                                                                                                |
| `GET /api/auth/get-session`                                                              | publik               | —                                                                                                                                                                                                                                   | sesi atau `null`                                                                                                                                                                                                      |
| `POST /api/v1/auth-social`                                                               | publik               | `{ provider, idToken, accessToken?, callbackURL? }`                                                                                                                                                                                 | `{ user, session? }` — set cookie sesi; `session.token` hanya bila header `x-client: expo`                                                                                                                            |
| `POST /api/v1/device-visit`                                                              | publik               | `DeviceVisit` (`src/validations/device-visit.ts`) — `userId` diabaikan (dari sesi)                                                                                                                                                  | `{ id }` — dibatasi 30/menit per IP                                                                                                                                                                                   |
| `GET /api/v1/device-visit?deviceId=&userId=&userType=&klasifikasi=&dari=&sampai=&limit=` | OWNER                | `limit` opsional ≤ 500                                                                                                                                                                                                              | `deviceVisit[]` (+ ringkasan)                                                                                                                                                                                         |
| `POST /api/v1/kunjungan`                                                                 | publik               | path dari `Referer` (fallback header `x-path`); `userId` dari sesi (anonim → `non-member`); OWNER/KASIR dikecualikan server                                                                                                         | `{ ok: true }` — dibatasi 120/menit per IP                                                                                                                                                                            |
| `GET /api/v1/kunjungan/data?dari=&sampai=&grup=`                                         | OWNER                | `grup=harian\|mingguan\|bulanan\|tahunan`                                                                                                                                                                                           | `{ total, deret[], halamanTerpopuler[], perKlasifikasi[] }`                                                                                                                                                           |
| `ANY /api/v1/*` (tidak dikenal)                                                          | publik               | —                                                                                                                                                                                                                                   | `{ ok: false, error: { code: 'NOT_FOUND', message: 'Endpoint tidak ditemukan' } }` (404) — envelope JSON, bukan HTML, supaya klien Expo tak gagal parse                                                               |

## Skema DTO utama

```ts
// POST /api/v1/transaksi
PostingTransaksi = {
  items: [{ produkId: string, qty: int > 0 }], // min 1
  memberId?: string,
  deliveryId?: string,   // tarif diambil dari master, bukan dari klien
  diskon?: int >= 0,    // nominal Rp, diclamp ke subtotal; ditolak bila diskon
                        // total (manual+poin+member) melebihi subtotal
  pajak?: int >= 0,     // DIABAIKAN (deprecated): server menghitung pajak dari
                        // pengaturan (pajak_resto_persen untuk mode F&B → PB1,
                        // pajak_retail_persen untuk retail → PPN) atas
                        // (subtotal − diskon − poin); pajak ditambahkan ke total
                        // (dibebankan ke pelanggan) dan jenisnya disimpan.
  tukarPoin?: int >= 0, // butuh memberId; 1 poin = Rp100, dibulatkan ke bawah
  metodeBayar?: 'TUNAI' | 'QRIS' | 'TRANSFER' | 'KARTU' | 'EWALLET',
  uangDiterima?: int >= 0, // metode tunggal TUNAI → kembalian dihitung server
  pembayaran?: [{ metode, jumlah: int > 0, uangDiterima?: int >= 0 }],
  // pembayaran mengesampingkan metodeBayar (split payment); Σ jumlah wajib = total,
  // kalau tidak → error. Kembalian server = Σ uangDiterima TUNAI − Σ jumlah TUNAI.
  mejaId?: string,            // meja dalam mode F&B (opsional; kosong = take away)
  statusPesanan?: 'MENUNGGU' | 'DIPROSES' | 'SELESAI' | 'DIBATALKAN',
  items: [{ produkId: string, qty: int > 0,
            modifiers?: [{ modifierId: string, qty: int > 0, catatan?: string }] }],
  catatan?: string,     // max 500
  // ─── Offline (antrean luring) ───
  idempotencyKey?: string(8–64), // kunci stabil buatan klien. Retry dengan
                        // kunci sama → server mengembalikan transaksi yang
                        // sudah ada (`replay: true`), stok/pendapatan tak
                        // terpotong dua kali.
  dibuatOffline?: boolean = false, // penanda transaksi dari antrean offline
  waktuKlien?: string,   // ISO-8601 waktu klien membuat transaksi
}
// → 201 { transaksiId, nomor, tanggal, subtotal, diskon, diskonMember, pajak,
//         ongkir, total, metodeBayar, mejaId, statusPesanan, uangDiterima,
//         kembalian, pembayaran[], itemCount,
//         items[{nama,qty,harga,modifiers[{modifier,tambahan,qty,catatan}]}],
//         jurnalId, jurnalNomor, hpp,
//         memberNama?, memberTotalBelanja?, memberTier? }

// GET /api/v1/notifikasi — bentuk item tergantung `tipe` & peran
Notifikasi =
  | { id, tipe: 'stok', nama, stok, satuan, stokMinimum, tanggal }
  | { id, tipe: 'pendapatan', periode: 'harian'|'mingguan'|'bulanan',
      dari, sampai, total, jumlahTransaksi, tanggal }
  | { id, tipe: 'transaksi', nomor, total, poinDapat, tanggal }
  | { id, tipe: 'pesanan', untuk: 'kasir'|'member', nomor, total,
      status: 'MENUNGGU'|'DIPROSES'|'SELESAI'|'DIBATALKAN'|'LUNAS',
      jumlahItem, meja: string|null, pelanggan: string|null, tanggal }
// OWNER: stok + pendapatan. KASIR: stok + pesanan online MENUNGGU.
// MEMBER: transaksi terakhir + status pesanan online miliknya.

ProdukInput = {
  nama: string(1–100), sku?: string, gambar?: string /* URL Cloudinary (secure_url) */,
  harga: int >= 0, stok: int >= 0, kategoriId?: string,
  aktif: boolean = true,
  resep: [{ bahanId: string, jumlah: number > 0 }] = [], // per 1 pcs
}

MemberInput = {
  nama: string(1–100), telepon?: string /* unik */, email?: string, alamat?: string,
}

BahanInput = {
  nama: string(1–100), satuan: string(1–10), stok: number >= 0,
  stokMinimum: number >= 0 = 0, hargaSatuan: number >= 0 = 0,
}

// POST/PUT /api/v1/supplier
SupplierInput = {
  nama: string(1–100), kontak?: string(≤120), alamat?: string(≤200),
  catatan?: string(≤200), aktif: boolean = true,
}

// POST /api/v1/supplier — pelunasan hutang usaha
PembayaranHutang = {
  pembelianBahanId: string,   // pembelian bahan yang belum lunas
  jumlah: number > 0,         // ≤ sisa hutang pembelian tersebut
  catatan?: string(≤200),
}

// POST /api/v1/pembelian-bahan (server fn `pembelianBahanFn`)
PembelianBahanInput = {
  bahanId: string,
  jumlah: number > 0,
  hargaSatuan: number >= 0,
  catatan?: string(≤200),
  supplierId?: string,        // id supplier (harus ada & aktif)
  hutang?: boolean = false,   // true → seluruh nominal jadi hutang usaha
  sumberBelanja?: 'SUPPLIER' | 'PASAR_ONLINE' | 'PASAR_OFFLINE' = 'SUPPLIER',
  // Tanpa supplier → sumberBelanja wajib 'PASAR_ONLINE'/'PASAR_OFFLINE'
  // (belanja ke pasar, supplier belum terdaftar). Dengan supplier, server
  // memaksa sumberBelanja = 'SUPPLIER'.
  tempatBelanja?: string(≤100), // nama pasar/toko, mis. "Pasar Kebayoran"
}

// POST /api/v1/printer
PrinterInput = {
  nama: string(1–80), tipe?: 'ESC_POS' | 'RAW' = 'ESC_POS',
  lokasi?: string(≤80), perangkat?: string(≤200), // id/alamat perangkat
  koneksi?: 'USB' | 'BLUETOOTH' | 'WIFI' | 'SERIAL' = 'USB',
  vendorId?: string(≤120), vendorName?: string(≤120),
  serialNumber?: string(≤160), productName?: string(≤160),
  default?: boolean = false,  // printer default global (dipakai bila klien tak menyebut printer)
  aktif?: boolean = true,
  // Metadata vendor/serial hanya informatif; bukan identitas atau dasar akses.
}

// Respons printer menyertakan `defaultPengguna` (default per akun hasil scan).
// `GET /api/v1/printer/default` memilih defaultPengguna user dulu, lalu default
// global, lalu printer aktif pertama. `terakhirDipakai` diperbarui saat job
// cetak dibuat dengan printer tersebut; `dipindaiPada` tetap waktu scan.

// POST /api/v1/printer/perangkat — pendaftaran hasil pindai mobile/desktop
PrinterDeviceInput = {
  nama: string(1–80), tipe?: 'ESC_POS' | 'RAW' = 'ESC_POS',
  lokasi?: string(≤80), perangkat: string(1–200),
  koneksi: 'USB' | 'BLUETOOTH' | 'WIFI' | 'SERIAL',
  vendorId?: string(≤120), vendorName?: string(≤120),
  serialNumber?: string(≤160), productName?: string(≤160),
  // userId TIDAK diterima dari body; server memakai sesi OWNER/KASIR.
  // vendorId/vendorName/serialNumber/productName = metadata informatif dari
  // klien, BUKAN bukti identitas/otorisasi. Jangan dipakai untuk keputusan akses
  // atau query mentah. Karakter kontrol ditolak.
}

// POST /api/v1/percetakan
BuatPrintJob = {
  printerId?: string,          // default: printer default aktif
  transaksiId: string,         // sumber isi struk (disusun server)
  tipe?: 'STRUK' | 'LABEL' | 'OPNAME' = 'STRUK',
  idempotencyKey?: string(8–64), // retry tak menghasilkan job ganda
}

// POST /api/v1/retur
BuatRetur = {
  transaksiId: string,          // transaksi asal (wajib)
  alasan: string(1–500),
  items: [{ produkId: string, qty: int > 0 }], // min 1
  // CATATAN: di sini `produkId` = id baris `TransaksiItem` transaksi asal
  // (internal dipakai server untuk cari harga & qty dibeli; qty retur tak
  // boleh melebihi qty dibeli).
}

// POST /api/v1/opname
SimpanOpname = {
  jenis: 'PRODUK' | 'BAHAN',    // jenis induk — menentukan tabel id di items
  catatan?: string (≤500),
  items: [{ jenis: 'PRODUK' | 'BAHAN', id: string, stokFisik: number >= 0 }], // min 1
  // `jenis` per item wajib di schema tetapi diabaikan server (pakai `jenis` induk);
  // `id` = id produk atau bahan; koreksi = stok sistem diset ke stokFisik.
}
```

## Server Function (`*Fn.ts`)

Semua logika data lives in `src/server/*.ts` (fungsi murni, tanpa HTTP/framework) sehingga bisa dipakai web, REST, dan unit-test. File `*Fn.ts` adalah wrapper TanStack Start `createServerFn` yang hanya: guard → validasi → panggil fungsi murni → kembalikan hasil. Envelope JSON ditangani route REST (`src/routes/api/v1/*`) dan `ok`/`gagal` dari `src/server/api.ts`.

| Server Function           | Metode | Guard              | Validator                                                          | Mengembalikan                                                                                                                                | Endpoint REST                               |
| ------------------------- | ------ | ------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `getSessionFn`            | GET    | publik (tidak ada) | —                                                                  | `{ session, user } \| null`                                                                                                                  | `GET /api/auth/get-session`                 |
| `kasirDataFn`             | GET    | `requireOwner`     | —                                                                  | master kasir (kategori, produk, member, delivery, penjualan hari ini)                                                                        | `GET /api/v1/kasir-data`                    |
| `laporanFn`               | GET    | `requireOwner`     | `LaporanSchema` (dari, sampai, akunId?)                            | `{ akun[], pembuka[], entri[], trial[] }`                                                                                                    | `GET /api/v1/laporan?dari=&sampai=&akunId?` |
| `postingTransaksiFn`      | POST   | `requireKasir`     | `PostingTransaksiSchema`                                           | struk ringkas + `uangDiterima`, `kembalian`, `pembayaran[]`, `hpp`                                                                           | `POST /api/v1/transaksi`                    |
| `laporanPenjualanFn`      | GET    | `requireOwner`     | `LaporanPenjualanSchema` (dari, sampai, grup)                      | `{ ringkasan, deret[], produkTerlaris[], performaKasir[] }`                                                                                  | `GET /api/v1/laporan-penjualan`             |
| `pengaturanDataFn`        | GET    | `requireKasir`     | —                                                                  | `{ modeFnb, riwayatBelanja, namaToko, judulApp, logoUrl, ikonUrl, strukOtomatis, deskripsiApp, pajakRestoPersen, pajakRetailPersen, semua }` | `GET /api/v1/pengaturan`                    |
| `identitasAppFn`          | GET    | publik (tidak ada) | —                                                                  | `{ judul, ikonUrl, logoUrl, deskripsi }`                                                                                                     | `GET /api/v1/identitas`                     |
| `notifikasiFn`            | GET    | `requireSemua`     | —                                                                  | `notifikasi[]` sesuai peran: OWNER stok+pendapatan, KASIR stok+pesanan online, MEMBER transaksi+status pesanan                               | `GET /api/v1/notifikasi`                    |
| `setPengaturanFn`         | POST   | `requireOwner`     | `SetPengaturanSchema`                                              | `{ kunci, nilai }`                                                                                                                           | `PUT /api/v1/pengaturan`                    |
| `produkDataFn`            | GET    | `requireOwner`     | —                                                                  | `{ produk[], kategori[], bahan[] }`                                                                                                          | `GET /api/v1/produk`                        |
| `createProdukFn`          | POST   | `requireOwner`     | `ProdukInputSchema`                                                | `{ id }`                                                                                                                                     | `POST /api/v1/produk`                       |
| `updateProdukFn`          | POST   | `requireOwner`     | `UpdateProdukSchema`                                               | `{ id }`                                                                                                                                     | `PUT /api/v1/produk`                        |
| `toggleProdukFn`          | POST   | `requireOwner`     | `{ id, aktif }`                                                    | `{ id }`                                                                                                                                     | `POST /api/v1/produk` (toggle)              |
| `hapusProdukFn`           | POST   | `requireOwner`     | `{ id }`                                                           | `{ id }`                                                                                                                                     | `DELETE /api/v1/produk?id=`                 |
| `produkTerpopulerFn`      | GET    | `requireOwner`     | `{ limit? }`                                                       | `produk[]{id,nama,harga,gambar,terjual}` (urutan terbanyak dulu)                                                                             | `GET /api/v1/produk-terpopuler`             |
| `produkLandingFn`         | GET    | publik (tidak ada) | —                                                                  | `{ populer[], baru[], campuran[] }` produk aktif; populer+mix fallback acak, baru = `createdAt desc`, maks 8/baris                           | — (web `/`)                                 |
| `createKategoriFn`        | POST   | `requireOwner`     | `KategoriInputSchema`                                              | `{ id }`                                                                                                                                     | `POST /api/v1/kategori`                     |
| `hapusKategoriFn`         | POST   | `requireOwner`     | `{ id }`                                                           | `{ id }`                                                                                                                                     | `DELETE /api/v1/kategori?id=`               |
| `memberDataFn`            | GET    | `requireOwner`     | —                                                                  | `member[]` (+ poin, totalBelanja, diskonPersen, tier, transaksi, terakhir)                                                                   | `GET /api/v1/member`                        |
| `createMemberFn`          | POST   | `requireOwner`     | `MemberInputSchema`                                                | `{ id }`                                                                                                                                     | `POST /api/v1/member`                       |
| `updateMemberFn`          | POST   | `requireOwner`     | `UpdateMemberSchema`                                               | `{ id }`                                                                                                                                     | `PUT /api/v1/member`                        |
| `hapusMemberFn`           | POST   | `requireOwner`     | `{ id }`                                                           | `{ id }`                                                                                                                                     | `DELETE /api/v1/member?id=`                 |
| `memberRiwayatFn`         | GET    | `requireOwner`     | `{ id }`                                                           | `{ member: {...}, riwayatAktif: boolean, transaksi[] }`                                                                                      | `GET /api/v1/member/riwayat?id=`            |
| `mejaDataFn`              | GET    | `requireKasir`     | —                                                                  | `meja[]{id,nomor,nama,aktif,jumlahTransaksi}`                                                                                                | `GET /api/v1/meja`                          |
| `createMejaFn`            | POST   | `requireOwner`     | `MejaInputSchema`                                                  | `{ id }`                                                                                                                                     | `POST /api/v1/meja`                         |
| `updateMejaFn`            | POST   | `requireOwner`     | `UpdateMejaSchema`                                                 | `{ id }`                                                                                                                                     | `PUT /api/v1/meja`                          |
| `hapusMejaFn`             | POST   | `requireOwner`     | `{ id }`                                                           | `{ id }`                                                                                                                                     | `DELETE /api/v1/meja?id=`                   |
| `toggleMejaFn`            | POST   | `requireOwner`     | `{ id, aktif }`                                                    | `{ id, aktif }`                                                                                                                              | `PUT /api/v1/meja`                          |
| `modifierGrupDataFn`      | GET    | `requireOwner`     | —                                                                  | `grup[]{id,nama,wajib,min,max,aktif,modifiers[]}`                                                                                            | `GET /api/v1/modifier-grup`                 |
| `createModifierGrupFn`    | POST   | `requireOwner`     | `ModifierGrupInputSchema`                                          | `{ id }`                                                                                                                                     | `POST /api/v1/modifier-grup`                |
| `updateModifierGrupFn`    | POST   | `requireOwner`     | `UpdateModifierGrupSchema`                                         | `{ id }`                                                                                                                                     | `PUT /api/v1/modifier-grup`                 |
| `hapusModifierGrupFn`     | POST   | `requireOwner`     | `{ id }`                                                           | `{ id }`                                                                                                                                     | `DELETE /api/v1/modifier-grup?id=`          |
| `toggleModifierGrupFn`    | POST   | `requireOwner`     | `{ id, aktif }`                                                    | `{ id, aktif }`                                                                                                                              | `PUT /api/v1/modifier-grup`                 |
| `modifierDataFn`          | GET    | `requireOwner`     | `{ grupId? }`                                                      | `modifier[]{id,grupId,nama,hargaTambahan,aktif}`                                                                                             | `GET /api/v1/modifier?grupId=`              |
| `createModifierFn`        | POST   | `requireOwner`     | `ModifierInputSchema`                                              | `{ id }`                                                                                                                                     | `POST /api/v1/modifier`                     |
| `updateModifierFn`        | POST   | `requireOwner`     | `UpdateModifierSchema`                                             | `{ id }`                                                                                                                                     | `PUT /api/v1/modifier`                      |
| `hapusModifierFn`         | POST   | `requireOwner`     | `{ id }`                                                           | `{ id }`                                                                                                                                     | `DELETE /api/v1/modifier?id=`               |
| `toggleModifierFn`        | POST   | `requireOwner`     | `{ id, aktif }`                                                    | `{ id, aktif }`                                                                                                                              | `PUT /api/v1/modifier`                      |
| `dapurDataFn`             | GET    | `requireOwner`     | —                                                                  | `transaksi[]{id,nomor,statusPesanan,total,meja,member,items[],pembayaran[]}`                                                                 | KDS: pesanan aktif                          |
| `updateStatusPesananFn`   | POST   | `requireOwner`     | `{ id, statusPesanan }`                                            | `{ id, statusPesanan }`                                                                                                                      | KDS ubah status                             |
| `bahanDataFn`             | GET    | `requireOwner`     | —                                                                  | `bahan[]` (+ menipis, dipakaiProduk)                                                                                                         | `GET /api/v1/bahan`                         |
| `createBahanFn`           | POST   | `requireOwner`     | `BahanInputSchema`                                                 | `{ id }`                                                                                                                                     | `POST /api/v1/bahan`                        |
| `updateBahanFn`           | POST   | `requireOwner`     | `UpdateBahanSchema`                                                | `{ id }`                                                                                                                                     | `PUT /api/v1/bahan`                         |
| `hapusBahanFn`            | POST   | `requireOwner`     | `{ id }`                                                           | `{ id }`                                                                                                                                     | `DELETE /api/v1/bahan?id=`                  |
| `laporanPajakFn`          | GET    | `requireOwner`     | `LaporanPajakSchema` (dari, sampai, grup)                          | `{ dari, sampai, grup, totalPerJenis[], riwayat[] }`                                                                                         | `GET /api/v1/laporan-pajak`                 |
| `laporanShiftFn`          | GET    | `requireOwner`     | `{ dari, sampai }`                                                 | rekap shift per periode (halaman `/laporan`)                                                                                                 | — (web `/laporan`)                          |
| `shiftDataFn`             | GET    | `requireKasir`     | `ShiftDataSchema` (dari?, sampai?)                                 | `{ semuaKasir, shiftAktif, riwayat[] }`                                                                                                      | `GET /api/v1/shift`                         |
| `bukaShiftFn`             | POST   | `requireKasir`     | `BukaShiftSchema` (kasAwal)                                        | `{ id, waktuBuka }`                                                                                                                          | `POST /api/v1/shift` (`aksi:'buka'`)        |
| `tutupShiftFn`            | POST   | `requireKasir`     | `TutupShiftSchema` (kasAkhir, catatan?)                            | `{ id, kasAwal, kasAkhir, seharusnya, selisih, …ringkasan }`                                                                                 | `POST /api/v1/shift` (`aksi:'tutup'`)       |
| `dataReturFn`             | GET    | `requireKasir`     | `DataReturSchema` (dari?, sampai?)                                 | `{ dari, sampai, jumlahRetur, totalRetur, riwayat[] }` (ringkasan)                                                                           | `GET /api/v1/retur?dari=&sampai=`           |
| `buatReturFn`             | POST   | `requireKasir`     | `BuatReturSchema`                                                  | `{ id, nomor, totalRetur }` (stok + jurnal pembalik)                                                                                         | `POST /api/v1/retur`                        |
| `produkAktifFn`           | GET    | `requireKasir`     | —                                                                  | `produk[]{id,nama,stok,harga}` aktif untuk form retur                                                                                        | `GET /api/v1/retur/produk-aktif`            |
| `detailTransaksiFn`       | GET    | `requireKasir`     | `{ id }`                                                           | `{ id, nomor, tanggal, total, items[] }` (422 bila tidak ada)                                                                                | `GET /api/v1/retur/transaksi?id=`           |
| `dataOpnameFn`            | GET    | `requireKasir`     | `DataOpnameSchema` (jenis?, dari?, sampai?)                        | `{ dari, sampai, jumlahOpname, riwayat[] }` (ringkasan)                                                                                      | `GET /api/v1/opname?jenis=&dari=&sampai=`   |
| `simpanOpnameFn`          | POST   | `requireKasir`     | `SimpanOpnameSchema`                                               | `{ id, nomor, jenis }` (koreksi stok tercatat → fisik)                                                                                       | `POST /api/v1/opname`                       |
| `masterAktifFn`           | GET    | `requireKasir`     | `{ jenis: 'PRODUK' \| 'BAHAN' }`                                   | `produk[]{id,nama,stok}` / `bahan[]{id,nama,stok,satuan}` aktif                                                                              | `GET /api/v1/opname/master?jenis=`          |
| `supplierDataFn`          | GET    | `requireOwner`     | —                                                                  | `supplier[]{id,nama,kontak,alamat,catatan,aktif,jumlahPembelian,totalBelanja,hutang}`                                                        | `GET /api/v1/supplier`                      |
| `supplierOpsiFn`          | GET    | `requireOwner`     | —                                                                  | `supplier[]{id,nama}` aktif (form pembelian bahan)                                                                                           | — (web `/bahan`)                            |
| `createSupplierFn`        | POST   | `requireOwner`     | `SupplierInputSchema`                                              | `{ id }`                                                                                                                                     | `POST /api/v1/supplier`                     |
| `updateSupplierFn`        | POST   | `requireOwner`     | `UpdateSupplierSchema`                                             | `{ id }`                                                                                                                                     | `PUT /api/v1/supplier`                      |
| `hapusSupplierFn`         | POST   | `requireOwner`     | `{ id }`                                                           | `{ id }`                                                                                                                                     | `DELETE /api/v1/supplier?id=`               |
| `hutangSupplierFn`        | GET    | `requireOwner`     | `{ supplierId }`                                                   | `hutang[]{pembelianBahanId,tanggal,bahanNama,totalHarga,belumDibayar}`                                                                       | `GET /api/v1/supplier?hutang=`              |
| `catatPembayaranHutangFn` | POST   | `requireOwner`     | `PembayaranHutangSchema`                                           | `{ id, supplierId, belumDibayar }`                                                                                                           | `POST /api/v1/supplier` (`bayar`)           |
| `laporanBelanjaFn`        | GET    | `requireOwner`     | `LaporanBelanjaSchema` (dari, sampai, supplierId?, sumberBelanja?) | `{ dari, sampai, totalBelanja, jumlahPembelian, totalHutang, perSumber[], perBulan[], detail[] }`                                            | `GET /api/v1/laporan-belanja`               |
| `auditLogDataFn`          | GET    | `requireOwner`     | `AuditLogQuerySchema`                                              | `{ rows[], total }`                                                                                                                          | `GET /api/v1/audit-log`                     |

Role: `user.role` = `OWNER` (penuh), `KASIR` (transaksi POS), `MEMBER` (pelanggan).
Peran punya **dua sumber**:

- **Halaman `/user`** (OWNER) — pilihan manual; ditandai `user.roleManual = true` sehingga
  otomatis env tak pernah menimpanya.
- **`OWNER_EMAILS` / `KASIR_EMAILS`** — default saat akun dibuat, dan disinkronkan
  ulang tiap kali sign-in untuk akun yang **bukan** manual (akun lama yang dibuat
  sebelum env diisi bisa naik ke OWNER/KASIR; OWNER tidak pernah diturunkan otomatis).

`requireOwner` = hanya OWNER; `requireKasir` = OWNER atau KASIR.

Pesan error dari fungsi murni sudah dalam Bahasa Indonesia dan aman untuk klien (tidak bocorkan isi perut DB) — dibungkus `apiError` menjadi envelope `{ ok: false, error: { code, message } }`.

## Aturan bisnis (di server, bukan di klien)

1. Stok produk & bahan dicek lalu dikurangi atomik; kurang → seluruh transaksi rollback.
2. Harga/ongkir/tarif selalu dari DB — klien tidak boleh mengirim nominal akhir.
3. Redeem: `tukarPoin ≤ saldo`, nilai dibulatkan ke bawah kelipatan Rp100;
   `total = subtotal − diskon − diskonPoin + pajak + ongkir`. Pajak dibebankan ke
   pelanggan (eksklusif), diambil dari pengaturan: **PB1** (`pajak_resto_persen`)
   saat `mode_fnb` aktif (restoran/cafe), **PPN** (`pajak_retail_persen`) saat
   retail; nilai `pajak` dari klien selalu diabaikan. Jenis pajak disimpan di
   `Transaksi.pajakJenis`.
4. Tiap transaksi menulis **satu jurnal berimbang** (assert debit = kredit di server).
5. Hapus produk → `TransaksiItem.produkId` null (snapshot nama/harga tetap).
   Hapus kategori/member yang dipakai → 422.
6. Poin: +1 tiap Rp10.000 (`RUPIAH_PER_POIN`), −sesuai `tukarPoin`; tersimpan
   `poinPakai`/`poinDapat` per transaksi.
7. Pembayaran: `pembayaran[]` (split) mengesampingkan `metodeBayar`; Σ `jumlah`
   wajib = `total`. Baris TUNAI boleh kirim `uangDiterima` (≥ jumlah); kembalian
   server = Σ `uangDiterima` TUNAI − Σ `jumlah` TUNAI. Klien DILARANG mengirim
   `kembalian`. Metode: TUNAI, QRIS, TRANSFER, KARTU, EWALLET.
8. Member: `tier` diturunkan dari `totalBelanja` (BRONZE < 3jt, SILVER ≥ 3jt,
   GOLD ≥ 10jt) dan diperbarui tiap transaksi. `diskonPersen` (opsional, 0–100)
   diberikan otomatis sebagai diskon tambahan atas subtotal setelah diskon manual.
   Klien DILARANG mengirim `totalBelanja` atau `tier` — dihitung server.
9. Printer struk ESC/POS via Web Serial bersifat klien-side eksperimental, diaktifkan
   lewat pengaturan `printer_escpos` (GET/PUT /api/v1/pengaturan). Tidak ada endpoint
   cetak terpusat — browser berkomunikasi langsung ke printer melalui `navigator.serial`.
   Setelah pembayaran sukses, `struk_otomatis` (`nonaktif`/`cetak`/`pdf`) memicu
   `window.print()` atau unduhan `GET /api/v1/transaksi/struk/{id}/pdf` di klien.
10. Mode F&B / restoran (`mode_fnb`): `Transaksi.mejaId` dan `statusPesanan`
    (MENUNGGU/DIPROSES/SELESAI/DIBATALKAN), serta `modifier` per item. KDS di
    `/dapur` menampilkan pesanan aktif. Entri nav `/meja` dan `/dapur` hanya muncul
    bila `mode_fnb` aktif.
11. Shift kas (`Shift`): kasir membuka shift (kas awal) sebelum bertransaksi; posting
    mengikat `Transaksi.shiftId` ke shift terbuka kasir tersebut (soft — transaksi tetap
    boleh tanpa shift, mis. OWNER). Tutup shift menyimpan kas akhir fisik dan `selisih`
    vs `kasSeharusnya` (kas awal + penjualan TUNAI shift). Maks 1 shift terbuka per kasir
    (unique parsial di DB).
12. Retur pasca-jual & stok opname (web `/retur`, `/opname`): retur membalik stok + jurnal
    pembalik dan menautkan `Retur.transaksiId`; opname menyimpan stok tercatat vs fisik +
    selisih lalu mengoreksi stok. Endpoint REST keduanya menyusul (lihat `docs/DAFTAR-TUGAS.md`).
13. Supplier & hutang usaha (web `/supplier`, `/laporan-belanja`): pembelian bahan boleh
    menunjuk supplier (harus ada & aktif) dan ditandai `hutang` → seluruh nominal jadi
    `PembelianBahan.belumDibayar`. Pelunasan dicatat per pembelian (`PembayaranHutang`),
    tidak boleh melebihi sisa hutang, dan langsung mengurangi sisa tersebut. Supplier
    yang sudah punya riwayat pembelian tidak bisa dihapus (nonaktifkan saja).
14. Sumber belanja pembelian bahan (`PembelianBahan.sumberBelanja`): `SUPPLIER` bila ada
    supplier terdaftar (server memaksa nilai ini), `PASAR_ONLINE` / `PASAR_OFFLINE` bila
    belanja ke pasar tanpa supplier. Tanpa supplier, klien **wajib** memilih sumber pasar
    (422 bila tidak); `tempatBelanja` menyimpan nama pasar/toko sebagai keterangan.
    Laporan belanja mengelompokkan rekap per sumber (`perSumber`) dan bisa difilter
    per sumber.
15. Audit log (`AuditLog`): mutasi sensitif (perubahan harga/stok produk & bahan, ubah
    role user, hapus produk/kategori/bahan/supplier, ubah pengaturan, bayar hutang) menulis
    satu baris berisi pelaku, aksi, entitas, dan snapshot `before`/`after` (hanya field
    yang berubah). Kegagalan menulis log tidak menggagalkan mutasi bisnis. Log dibaca di
    halaman `/audit-log` (OWNER) dan `GET /api/v1/audit-log`.
16. Offline & printer (mobile): transaksi boleh memakai `idempotencyKey` — kunci unik
    per transaksi di tabel `Transaksi`, jadi retry dari antrean luring mengembalikan
    transaksi yang sama (`replay: true`) tanpa memotong stok lagi. `dibuatOffline` +
    `waktuKlien` menyimpan jejak offline. Cetak ke printer perangkat dilakukan lewat
    antrean job: `POST /api/v1/percetakan` (isi struk disusun server), klien
    pencetak mengambil job (`POST /percetakan/$id/ambil` → `DIPROSES`), lalu
    melaporkan `selesai` (`DICETAK`) atau `gagal` (`GAGAL` + pesan). Job juga idempoten
    lewat `idempotencyKey`.
17. Halaman web printer & antrean cetak: `/printer` (master printer, OWNER) dan
    `/percetakan` (antrean job, OWNER + KASIR) memakai server fn yang sama dengan
    REST (`src/server/percetakanFn.ts`), jadi perilaku web & mobile identik.

## Aktivasi / Nonaktifkan Mode F&B (`mode_fnb`)

Mode F&B (restoran/café) dikendalikan oleh sebuah flag boolean `mode_fnb` di
model `Pengaturan` (key-value). Flag ini **hanya dapat diubah oleh peran
OWNER**.

### Via UI — halaman `/pengaturan`

1. Login sebagai **OWNER**, buka `/pengaturan`.
2. Scroll ke kartu **"Mode F&B / Restaurant mode"** (`pengaturan_mode_fnb`).
3. Klik **toggle**:
   - **Aktif** (`true`): kartu-kartu Meja, Modifier Grup, dan KDS `/dapur`
     muncul di sidebar (RelNav). Nav `/meja` dan `/dapur` ditampilkan untuk
     OWNER dan KASIR.
   - **Nonaktif** (`false`): nav F&B disembunyikan; route `/meja` dan
     `/dapur` tidak muncul di sidebar.
4. Klik **"Simpan"** (Save) untuk menulis perubahan ke database.

Toggle menulis nilai string `'true'` / `'false'` (bukan boolean JSON) karena
model `Pengaturan.nilai` bertipe `String`.

### Via API — `PUT /api/v1/pengaturan`

```ts
// Aktifkan
await fetch('/api/v1/pengaturan', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ kunci: 'mode_fnb', nilai: 'true' }),
})

// Nonaktifkan
await fetch('/api/v1/pengaturan', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ kunci: 'mode_fnb', nilai: 'false' }),
})
```

Guard: `requireOwner`. Membaca flag: `GET /api/v1/pengaturan` mengembalikan
`modFnb: boolean` (parsed dari string `'true'`/`'false'`).

### Efek samping

| Komponen        | `mode_fnb = true`                 | `mode_fnb = false`                     |
| --------------- | --------------------------------- | -------------------------------------- |
| RelNav sidebar  | `/meja`, `/dapur` muncul          | disembunyikan                          |
| Halaman `/meja` | CRUD meja & modifier aktif        | tetap accessible via URL (guard OWNER) |
| `/dapur` (KDS)  | menampilkan pesanan aktif         | tetap accessible via URL (guard OWNER) |
| Transaksi kasir | dukung `mejaId` + `statusPesanan` | tanpa meja (take-away)                 |

> **Catatan**: Menonaktifkan `mode_fnb` tidak menghapus data Meja/Modifier yang
> sudah ada — hanya menyembunyikan entri navigasi. Data tetap tersimpan dan
> bisa diaktifkan kembali kapan saja.

## Kesiapan Expo (klien native)

Klien native (Android/iOS) tak punya cookie jar, jadi **wajib** memakai sesi
berbearer:

```http
GET /api/v1/kasir-data
Authorization: Bearer <session.token>
```

`session.token` diperoleh dari `POST /api/v1/auth-social` (header
`x-client: expo`). Plugin `bearer` Better Auth (`src/lib/auth.ts`) menerjemahkan
header itu jadi sesi; tanpa plugin ini semua request mobile akan 401
(cookie httpOnly tak bisa dibaca React Native).

CORS hanya relevan untuk Expo Web (`react-native-web`, browser mengirim
`Origin`): backend membalas `Access-Control-Allow-Origin` + preflight
`OPTIONS` → 204 **hanya** untuk origin yang ada di `TRUSTED_ORIGINS`
(mis. `http://localhost:8081` untuk Expo dev). Panduan lengkap integrasi
mobile: `docs/EXPO.md`.

## Kesehatan

`GET /api/health` (publik, rate limit 60/menit) dipakai uptime monitor. Respons
ini sengaja **bukan envelope** agar langsung dibaca alat monitoring:

```json
{ "database": "ok", "app": "healthy" }
```

- `database`: `ok` bila `SELECT 1` berhasil, `gagal` bila koneksi/query gagal.
- `app`: `healthy` saat database `ok`, `degraded` saat database `gagal`.
- HTTP `200` saat sehat, `503` saat database gagal.
- Endpoint lama `GET /api/v1/health` tetap tersedia dengan envelope lama.

## Aturan untuk agen (mengikat)

1. Fitur data baru **WAJIB** lewat endpoint di tabel atas, atau tambah endpoint
   baru + dokumentasikan di file ini dalam PR yang sama.
2. Logika di `src/server/*.ts` murni (tanpa HTTP/framework) agar dipakai web,
   REST, dan unit-test. Route hanya: guard → parse/validasi → panggil → envelope.
3. Pesan error domain Bahasa Indonesia, tanpa bocoran DB (lihat
   `.agents/rules/05-error-handling.md`).
4. Uang integer rupiah di semua DTO; `Decimal(14,2)` hanya di dalam DB.
5. Mobile Expo DILARANG akses Prisma langsung / meniru hitungan server —
   selalu panggil endpoint ini.

## Peta docs (saling terhubung)

`README.md` (mulai) → `AGENTS.md` (aturan agen) → `docs/DAFTAR-TUGAS.md`
(status) → `.agents/rules/` (detail) → `docs/PRD.md` (niat produk) →
`docs/PRD-AI.md` (kontrak agen) → `docs/API.md` (kontrak, file ini) →
`docs/PERFORMA.md` (anggaran) → `docs/execution-plan.md` (urutan) →
`docs/setup-google-oauth.md` (kredensial).
