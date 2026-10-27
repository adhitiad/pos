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
  boleh) · `BAD_REQUEST` (400) · `PAYLOAD_TOO_LARGE` (413) · `DOMAIN` (422,
  validasi/bisnis — pesan aman Indonesia) · `LIMIT_PERANGKAT` /
  `PERANGKAT_BERJOB` (409, batas perangkat) · `SUDAH_DIBAYAR` /
  `PAYMENT_REF_DIGUNAKAN` (409, konflik pembayaran) · `TOO_MANY_REQUESTS` (429,
  kena rate limit) · `INTERNAL` (500, pesan umum + ref log, isi DB tidak bocor).
- Rate limit memakai token bucket bersama di Postgres. Bucket per
  IP+endpoint (atau per user untuk printer dan endpoint terautentikasi),
  kapasitas default **100 token**, isi ulang **100 token/menit**, dan baris idle
  **30 menit** dimulai lagi dari bucket penuh. Saat `TRUST_PROXY=true`,
  `X-Forwarded-For` dibaca dari **kanan** sebanyak `TRUST_PROXY_HOPS` (Vercel =
  `1`); entri kiri yang bisa dipalsukan klien diabaikan. Endpoint sensitif
  memakai kapasitas lebih kecil (mis. `auth-social`/`auth-native` 5/menit, `pesan` 10/menit,
  `app-icon` 60/menit) dan tetap membalas 429 + `Retry-After`. Server function
  analytics (`device-visit`, `kunjungan`) dibatasi di sisi server function.
  Endpoint publik yang menerima JSON memakai batas body eksplisit
  (`pesan`/`transaksi` 256 KB, `device-visit`/webhook 16 KB); body berlebih →
  413 `PAYLOAD_TOO_LARGE`.
- Endpoint printer/percetakan dibatasi **per user** (bukan IP): GET 60/menit,
  mutasi 20/menit. Respons 429 memuat `Retry-After`, `X-RateLimit-Limit`, dan
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
GET /api/auth/get-session     → { session, user } | null (tanpa session.token)
GET /api/auth/list-sessions   → session[] (tanpa token)
POST /api/auth/sign-out
```

Expo (fetch, tanpa WebView redirect):

```ts
// 1. Google native sign-in (expo-auth-session / @react-native-google-signin)
//    → dapatkan idToken + accessToken
// 2. Tukarkan ke sesi POS lewat endpoint native:
const r = await fetch(`${BASE}/api/v1/auth-native`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    provider: 'google',
    idToken, // string JWT hasil native sign-in
    accessToken, // opsional
    callbackURL: '/',
  }),
})
const { data } = await r.json() // data.session.token
// 3. Simpan token di expo-secure-store (bukan AsyncStorage), lalu kirim
//    Authorization: Bearer <token> pada request berikutnya.
```

> `/api/v1/auth-native` hanya aktif bila `GOOGLE_NATIVE_CLIENT_ID` diisi dan
> berbeda dari `GOOGLE_CLIENT_ID`. Endpoint memeriksa klaim `aud` Google ID
> token harus client ID native; token yang diterbitkan untuk client web ditolak
> `401`. Web memakai `/api/v1/auth-social`, yang hanya mengembalikan `{ user }`
> dan cookie httpOnly — tidak pernah bearer token. Header `x-client` bukan
> security boundary dan tidak dipakai lagi.

Body request:

| Field         | Tipe   | Wajib | Keterangan                        |
| ------------- | ------ | ----- | --------------------------------- |
| `provider`    | string | ya    | `'google'`                        |
| `idToken`     | string | ya    | Google ID JWT dari native sign-in |
| `accessToken` | string | tidak | Google access token (opsional)    |
| `callbackURL` | string | tidak | Default `'/'`                     |

Respons sukses: `{ ok: true, data: { user: { id, name, email, image } } }` untuk
`/api/v1/auth-social` (cookie httpOnly di-set), dan
`{ ok: true, data: { user, session: { token } } }` untuk `/api/v1/auth-native`.
Catatan keamanan (OW-13): token itu milik sesi yang **baru** dibuat dari `idToken`
Google terverifikasi (bukan eskalasi). Simpan di `expo-secure-store`, jangan di
log/AsyncStorage biasa, dan jangan pernah menaruhnya di localStorage web.
Respons gagal: `{ ok: false, error: { code, message } }` — `UNAUTHORIZED` (401)
bila token invalid/audiens bukan client native, `FORBIDDEN` (403) bila email
belum diverifikasi, `NOT_CONFIGURED` (503) bila login native belum diaktifkan.
`session.token` juga dihapus dari respons Better Auth `/api/auth/get-session`
dan `/api/auth/list-sessions`, dan header `set-auth-token` dihapus dari semua
respons Better Auth (plugin `sembunyikanTokenSesi`), sehingga web yang punya
cookie httpOnly tidak bisa menukarnya menjadi bearer lewat XSS.

### Rate limit autentikasi

Better Auth memakai token bucket PostgreSQL yang sama dengan endpoint lain
(`src/lib/auth.ts` → `src/server/rateLimit.ts`), jadi kuota berlaku lintas
instance serverless tanpa Redis: `/sign-in*` 5/menit, `/sign-up*` 3/menit, dan
`/callback*` 20/menit per kunci (IP + path). Pola `*` mencakup sub-path seperti
`/sign-in/social` dan `/callback/google`. IP hanya dipercaya bila
`TRUST_PROXY` aktif; di Vercel nilainya otomatis `true` (matikan eksplisit
dengan `TRUST_PROXY=false`), dengan `TRUST_PROXY_HOPS=1` untuk satu lapis proxy.

Peran (`user.role`): `OWNER` | `KASIR` | `MEMBER`. User baru = `MEMBER`,
kecuali email di `OWNER_EMAILS` → `OWNER`. Naik pangkat via Prisma Studio.

## Katalog endpoint

| Method & path                                                                            | Peran                | Body / query                                                                                                                                                                                                                                                                                 | Hasil `data`                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/v1/kasir-data`                                                                 | OWNER, KASIR         | —                                                                                                                                                                                                                                                                                            | `{ kategori[], produk[], member[], delivery[] }` (master aktif untuk kasir)                                                                                                                                                                                                                                                                                                                                                          |
| `POST /api/v1/transaksi`                                                                 | OWNER, KASIR         | `PostingTransaksi` (bawah) — `statusKasirReview` diabaikan/disiapkan server; posting via **draft → review** (lihat `POST /api/v1/transaksi-draft` & `/api/v1/transaksi-review`)                                                                                                              | struk ringkas + `jurnalNomor`, `hpp` (201); `replay: true` bila idempotensi kicks in                                                                                                                                                                                                                                                                                                                                                 |
| `POST /api/v1/transaksi-draft`                                                           | OWNER, KASIR         | `BuatDraftTransaksi` — draft transaksi POS (stok/jurnal belum disentuh); wajib `subtotal` & `total` sebagai ringkasan antrean (angka final dihitung ulang saat review); harus disetujui kasir lewat `/api/v1/transaksi-review` sebelum dipost                                                | `{ id, nomor, status, subtotal, total, metodeBayar, dibuatOffline, createdAt, updatedAt }` (201)                                                                                                                                                                                                                                                                                                                                     |
| `GET /api/v1/transaksi-draft?semua=1`                                                    | OWNER, KASIR         | `semua=1` (khusus OWNER) → antrean draft MENUNGGU lintas kasir                                                                                                                                                                                                                               | `{id,nomor,status,subtotal,total,metodeBayar,dibuatOffline,createdAt,kasirId,kasirNama}[]`; tanpa `semua=1` → draft milik sendiri                                                                                                                                                                                                                                                                                                    |
| `POST /api/v1/transaksi-draft-batal`                                                     | OWNER, KASIR         | `{ draftId }` — batalkan draft milik sendiri yang masih MENUNGGU                                                                                                                                                                                                                             | `{ ok: true }` (200)                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `POST /api/v1/transaksi-review`                                                          | OWNER, KASIR         | `{ draftId, keputusan: 'DISETUJUI'                                                                                                                                                                                                                                                           | 'DITOLAK', catatan? }`— kasir menyetujui/tolak draft; DISETUJUI memposting atomik (stok, jurnal, poin) lalu dicatat ke`TransaksiReviewAudit` (audit terpisah)                                                                                                                                                                                                                                                                        | `{ draftId, keputusan, transaksiId, hasil }` (201)                                                                                                                                                                                                                                                                                                                                                                     |
| `GET /api/v1/transaksi-review?take=`                                                     | OWNER                | `take` ≤ 50 (default 50)                                                                                                                                                                                                                                                                     | `{id,status,catatan,createdAt,peninjauId,peninjauNama,draftNomor,transaksiNomor}[]` — riwayat keputusan review, termasuk draft yang ditolak                                                                                                                                                                                                                                                                                          |
| `GET /api/v1/transaksi/struk/{id}/pdf`                                                   | OWNER, KASIR         | `{id}` id transaksi (cuid)                                                                                                                                                                                                                                                                   | file PDF struk (attachment); isi disusun server dari snapshot transaksi                                                                                                                                                                                                                                                                                                                                                              |
| `GET /api/v1/pesan`                                                                      | Publik               | `?mejaToken=` opsional (token QR meja)                                                                                                                                                                                                                                                       | `{ produk[], delivery[], mejaDariToken? }` — master menu, layanan antar aktif, dan `mejaDariToken` bila token QR valid; token rusak/kedaluwarsa diabaikan dan menu tetap dimuat; daftar meja **tidak** dikirim agar meja tak bisa dipilih tanpa QR                                                                                                                                                                                   |
| `POST /api/v1/pesan`                                                                     | Publik               | `PesananOnline` (lihat DTO) — maks 100 baris, 20 modifier/baris, qty ≤ 9.999; body ≤ 256 KB                                                                                                                                                                                                  | struk ringkas (201); `sumber=ONLINE`, `kasirId=null`, `statusPesanan=MENUNGGU`, `dibayarPada=null`; stok, poin, jurnal, dan baris pembayaran **belum** dibuat sampai pembayaran dikonfirmasi; metode `QRIS`/`TRANSFER`/`EWALLET`, take-away/antar, atau dine-in **wajib** `mejaToken` QR bertanda tangan (mejaId mentah dibuang); ongkir selalu dari master Delivery di server; sesi `MEMBER` ditautkan tanpa efek poin sampai lunas |
| `GET /api/v1/pesan-dinein`                                                               | OWNER, KASIR         | —                                                                                                                                                                                                                                                                                            | draft dine-in berstatus `MENUNGGU` (antrean kasir); rate limit 100/menit                                                                                                                                                                                                                                                                                                                                                             |
| `POST /api/v1/pesan-dinein`                                                              | Publik               | `BuatPesananDraf` — `{ mejaToken, telepon?, nama?, catatan?, items[{produkId, qty, modifiers?}] }`; maks 100 baris, 20 modifier/baris; body ≤ 256 KB                                                                                                                                         | draft publik (201): `{ id, mejaId, mejaNomor, nama, telepon, catatan, status, itemCount, subtotal, dibuatPada }`; `mejaToken` **wajib** dan `mejaId` mentah tidak diterima; `memberId`/diskon/pajak dari klien diabaikan; rate limit 10/menit per IP + 5/menit per nomor telepon                                                                                                                                                     |
| `GET /api/v1/pesan-dinein/{id}`                                                          | OWNER, KASIR         | `{id}` id draft                                                                                                                                                                                                                                                                              | detail draft (item, modifier, meja, member) untuk layar kasir                                                                                                                                                                                                                                                                                                                                                                        |
| `PATCH /api/v1/pesan-dinein/{id}`                                                        | OWNER, KASIR         | `UpdatePesananDraf` — `{ items[{produkId, qty, modifiers?}], catatan? }`; `qty: 0` menghapus baris                                                                                                                                                                                           | draft setelah diubah; hanya draft `MENUNGGU`                                                                                                                                                                                                                                                                                                                                                                                         |
| `POST /api/v1/pesan-dinein/{id}/finalisasi`                                              | OWNER, KASIR         | body opsional `{ mejaId? }` (16 KB) — `mejaId` hanya untuk staf yang memilihkan meja tanpa QR; meja harus aktif                                                                                                                                                                              | transaksi POS penuh (stok, jurnal, poin) + draft `FINAL`; 422 bila draft kosong/bukan `MENUNGGU` atau meja nonaktif                                                                                                                                                                                                                                                                                                                  |
| `POST /api/v1/pesan-dinein/{id}/batal`                                                   | OWNER, KASIR         | `{id}` id draft                                                                                                                                                                                                                                                                              | `{ ok: true }`; hanya draft `MENUNGGU`                                                                                                                                                                                                                                                                                                                                                                                               |
| `GET /api/v1/meja-qr?id=`                                                                | OWNER                | `?id=` id meja (cuid)                                                                                                                                                                                                                                                                        | `{ mejaId, nomor, nama, token, url, berlakuSampai, qrDataUrl }` — QR SVG data URL untuk cetak/tempel; token HMAC berlaku 30 hari; rate limit 30/menit per user                                                                                                                                                                                                                                                                       |
| `POST /api/v1/pesanan/{id}/bayar`                                                        | OWNER, KASIR         | `{id}` id transaksi online; tanpa body                                                                                                                                                                                                                                                       | struk ringkas — tandai lunas manual (idempoten); memotong stok, memberi poin, menulis jurnal + satu baris pembayaran bila belum ada; 422 bila bukan pesanan online atau sudah dibatalkan; rate limit 30/menit per user                                                                                                                                                                                                               |
| `POST /api/v1/pembayaran/webhook`                                                        | Publik (HMAC)        | header `x-payment-signature: sha256=<hex>`; body `PaymentWebhook` (lihat DTO); maks 16 KB                                                                                                                                                                                                    | `{ diterima, diproses, transaksiId?, nomor? }`; hanya `payment.paid` yang memfinalkan; 401 tanda tangan salah, 503 bila `PAYMENT_WEBHOOK_SECRET` kosong; idempoten per pesanan, `reference` disimpan unik                                                                                                                                                                                                                            |
| `GET /api/v1/produk`                                                                     | OWNER                | `?take=&skip=` (opsional; default semua)                                                                                                                                                                                                                                                     | `{ produk[], total, kategori[], bahan[] }` — sortir `nama`, pencarian/filter khusus UI web                                                                                                                                                                                                                                                                                                                                           |
| `POST /api/v1/produk`                                                                    | OWNER                | `ProdukInput`, atau `{ toggle: true, id, aktif }`                                                                                                                                                                                                                                            | `{ id }` (201)                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `PUT /api/v1/produk`                                                                     | OWNER                | `ProdukInput & { id }` (resep diganti penuh)                                                                                                                                                                                                                                                 | `{ id }`                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `DELETE /api/v1/produk?id=`                                                              | OWNER                | —                                                                                                                                                                                                                                                                                            | `{ id }` (item riwayat keep snapshot)                                                                                                                                                                                                                                                                                                                                                                                                |
| `GET /api/v1/kategori`                                                                   | OWNER                | —                                                                                                                                                                                                                                                                                            | `kategori[]` (+ `jumlahProduk`)                                                                                                                                                                                                                                                                                                                                                                                                      |
| `POST /api/v1/kategori`                                                                  | OWNER                | `{ nama, deskripsi? }`                                                                                                                                                                                                                                                                       | `{ id }` (201)                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `DELETE /api/v1/kategori?id=`                                                            | OWNER                | —                                                                                                                                                                                                                                                                                            | `{ id }` (422 bila dipakai produk)                                                                                                                                                                                                                                                                                                                                                                                                   |
| `GET /api/v1/member`                                                                     | OWNER                | `?take=&skip=` (opsional; default semua)                                                                                                                                                                                                                                                     | `member[]` (+ `poin`, `jumlahTransaksi`, `terakhir`) — sortir `nama`                                                                                                                                                                                                                                                                                                                                                                 |
| `POST /api/v1/member`                                                                    | OWNER                | `MemberInput`                                                                                                                                                                                                                                                                                | `{ id }` (201)                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `PUT /api/v1/member`                                                                     | OWNER                | `MemberInput & { id }`                                                                                                                                                                                                                                                                       | `{ id }`                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `DELETE /api/v1/member?id=`                                                              | OWNER                | —                                                                                                                                                                                                                                                                                            | `{ id }` (422 bila ada riwayat)                                                                                                                                                                                                                                                                                                                                                                                                      |
| `GET /api/v1/member/riwayat?id=`                                                         | OWNER                | `?id= id member`                                                                                                                                                                                                                                                                             | `{ member: {nama,poin,totalBelanja,diskonPersen,tier}, riwayatAktif: boolean, transaksi[] }` (tiap transaksi + subtotal, diskon, pajak, items[])                                                                                                                                                                                                                                                                                     |
| `GET /api/v1/meja`                                                                       | OWNER, KASIR         | —                                                                                                                                                                                                                                                                                            | `meja[]{id,nomor,nama,aktif,jumlahTransaksi}`                                                                                                                                                                                                                                                                                                                                                                                        |
| `POST /api/v1/meja`                                                                      | OWNER                | `{ nomor, nama?, aktif? }`                                                                                                                                                                                                                                                                   | `{ id }` (201)                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `PUT /api/v1/meja`                                                                       | OWNER                | `{ id, nomor?, nama?, aktif? }`                                                                                                                                                                                                                                                              | `{ id }`                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `DELETE /api/v1/meja?id=`                                                                | OWNER                | —                                                                                                                                                                                                                                                                                            | `{ id }` (422 bila ada pesanan aktif)                                                                                                                                                                                                                                                                                                                                                                                                |
| `GET /api/v1/modifier-grup`                                                              | OWNER                | —                                                                                                                                                                                                                                                                                            | `grup[]{id,nama,wajib,min,max,aktif,modifiers[]}`                                                                                                                                                                                                                                                                                                                                                                                    |
| `POST /api/v1/modifier-grup`                                                             | OWNER                | `{ nama, wajib?, min?, max?, aktif? }`                                                                                                                                                                                                                                                       | `{ id }` (201)                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `PUT /api/v1/modifier-grup`                                                              | OWNER                | `{ id, nama?, wajib?, min?, max?, aktif? }`                                                                                                                                                                                                                                                  | `{ id }`                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `DELETE /api/v1/modifier-grup?id=`                                                       | OWNER                | —                                                                                                                                                                                                                                                                                            | `{ id }` (422 bila dipakai produk)                                                                                                                                                                                                                                                                                                                                                                                                   |
| `GET /api/v1/modifier?grupId=`                                                           | OWNER                | `?grupId=` opsional                                                                                                                                                                                                                                                                          | `modifier[]{id,grupId,nama,hargaTambahan,aktif}`                                                                                                                                                                                                                                                                                                                                                                                     |
| `POST /api/v1/modifier`                                                                  | OWNER                | `{ grupId, nama, hargaTambahan?, aktif? }`                                                                                                                                                                                                                                                   | `{ id }` (201)                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `PUT /api/v1/modifier`                                                                   | OWNER                | `{ id, grupId?, nama?, hargaTambahan?, aktif? }`                                                                                                                                                                                                                                             | `{ id }`                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `DELETE /api/v1/modifier?id=`                                                            | OWNER                | —                                                                                                                                                                                                                                                                                            | `{ id }` (422 bila dipakai transaksi)                                                                                                                                                                                                                                                                                                                                                                                                |
| `GET /api/v1/laporan?dari=&sampai=&akunId?`                                              | OWNER                | tanggal `YYYY-MM-DD`                                                                                                                                                                                                                                                                         | `{ akun[], pembuka[], entri[], trial[] }`                                                                                                                                                                                                                                                                                                                                                                                            |
| `GET /api/v1/laporan-penjualan?dari=&sampai=&grup=&format=`                              | OWNER                | `grup=harian\|mingguan\|bulanan`, `format=csv\|xlsx\|pdf` (opsional)                                                                                                                                                                                                                         | `{ ringkasan, deret[], produkTerlaris[], performaKasir[] }`; `format` → file unduhan                                                                                                                                                                                                                                                                                                                                                 |
| `GET /api/v1/laporan-pajak?dari=&sampai=&grup=&format=`                                  | OWNER                | `grup=harian\|mingguan\|bulanan` (default `bulanan`), `format=csv\|xlsx\|pdf` (opsional)                                                                                                                                                                                                     | `{ dari, sampai, grup, totalPerJenis[{jenis,jumlahTransaksi,subtotal,pajak,total}], riwayat[{periode,jenis[{jenis,pajak}]}] }`; `format` → file unduhan                                                                                                                                                                                                                                                                              |
| `GET /api/v1/shift?dari=&sampai=`                                                        | OWNER, KASIR         | tanggal `YYYY-MM-DD` (default: bulan berjalan)                                                                                                                                                                                                                                               | `{ semuaKasir, shiftAktif, riwayat[] }` — tiap shift: `{id,kasirId,kasirNama,waktuBuka,waktuTutup,kasAwal,kasAkhir,selisih,catatan,jumlahTransaksi,totalPenjualan,totalTunai,seharusnya}` (OWNER melihat semua kasir)                                                                                                                                                                                                                |
| `POST /api/v1/shift`                                                                     | OWNER, KASIR         | `{ aksi: 'buka', kasAwal }` \| `{ aksi: 'tutup', kasAkhir, catatan? }`                                                                                                                                                                                                                       | buka → `{ id, waktuBuka }` (201); tutup → `{ id, kasAwal, kasAkhir, seharusnya, selisih, …ringkasan }`; maks 1 shift terbuka per kasir (422)                                                                                                                                                                                                                                                                                         |
| `GET /api/v1/retur?dari=&sampai=`                                                        | OWNER, KASIR         | tanggal `YYYY-MM-DD` (default: bulan berjalan)                                                                                                                                                                                                                                               | `{ dari, sampai, jumlahRetur, totalRetur, riwayat[{id,nomor,tanggal,transaksiNomor,kasirNama,alasan,totalRetur,items[{namaProduk,qty,subtotal}]}] }`                                                                                                                                                                                                                                                                                 |
| `POST /api/v1/retur`                                                                     | OWNER, KASIR         | `BuatRetur` (bawah)                                                                                                                                                                                                                                                                          | `{ id, nomor, totalRetur }` (201) — balik stok produk+bahan & tulis jurnal pembalik                                                                                                                                                                                                                                                                                                                                                  |
| `GET /api/v1/retur/produk-aktif`                                                         | OWNER, KASIR         | —                                                                                                                                                                                                                                                                                            | `produk[]{id,nama,stok,harga}` aktif untuk form retur                                                                                                                                                                                                                                                                                                                                                                                |
| `GET /api/v1/retur/transaksi?id=`                                                        | OWNER, KASIR         | `?id=` id transaksi (cuid)                                                                                                                                                                                                                                                                   | `{ id, nomor, tanggal, total, items[{id,produkId,namaProduk,qty,hargaSatuan}] }` (422 bila tidak ada)                                                                                                                                                                                                                                                                                                                                |
| `GET /api/v1/opname?jenis=&dari=&sampai=`                                                | OWNER, KASIR         | `jenis=PRODUK\|BAHAN` (opsional); tanggal opsional                                                                                                                                                                                                                                           | `{ dari, sampai, jumlahOpname, riwayat[{id,nomor,tanggal,jenis,kasirNama,catatan,items[{nama,stokTercatat,stokFisik,selisih}]}] }`                                                                                                                                                                                                                                                                                                   |
| `POST /api/v1/opname`                                                                    | OWNER, KASIR         | `SimpanOpname` (bawah)                                                                                                                                                                                                                                                                       | `{ id, nomor, jenis }` (201) — koreksi stok sistem ke stok fisik                                                                                                                                                                                                                                                                                                                                                                     |
| `GET /api/v1/opname/master?jenis=`                                                       | OWNER, KASIR         | `jenis=PRODUK\|BAHAN` (wajib)                                                                                                                                                                                                                                                                | `produk[]{id,nama,stok}` atau `bahan[]{id,nama,stok,satuan}` aktif                                                                                                                                                                                                                                                                                                                                                                   |
| `GET /api/v1/pengaturan`                                                                 | OWNER, KASIR         | —                                                                                                                                                                                                                                                                                            | `{ modeFnb, riwayatBelanja, namaToko, judulApp, logoUrl, ikonUrl, strukOtomatis, ukuranKertasTermal, deskripsiApp, pajakRestoPersen, pajakRetailPersen, semua }`                                                                                                                                                                                                                                                                     |
| `PUT /api/v1/pengaturan`                                                                 | OWNER                | `{ kunci: 'mode_fnb'\|'riwayat_belanja_aktif'\|'nama_toko'\|'printer_escpos'\|'ukuran_kertas_termal'\|'struk_otomatis'\|'judul_app'\|'logo_url'\|'ikon_url'\|'deskripsi_app'\|'pajak_persen'\|'pajak_resto_persen'\|'pajak_retail_persen'\|'diskon_kasir_maks_persen'\|'stok_dikurangi_saat' | 'review_transaksi_mode', nilai: string }`                                                                                                                                                                                                                                                                                                                                                                                            | `{ kunci, nilai }`; `pajak_*` wajib angka 0–100 (kosong ditolak, bukan 0); `diskon_kasir_maks_persen` angka 0–100; `mode_fnb` menerima `true\|false`; `stok_dikurangi_saat` menerima `order\|payment`; `ukuran_kertas_termal` menerima `57x30\|57x37\|58x37\|58x40\|57x47\|58x50\|80x40\|80x47\|80x50\|80x60\|80x70\|80x80`; `struk_otomatis` menerima `nonaktif\|cetak\|pdf`; `review_transaksi_mode` menerima `kasir | owner`; `logo_url`/`ikon_url`wajib URL`https://res.cloudinary.com/` milik cloud kita |
| `GET /api/v1/notifikasi`                                                                 | OWNER, KASIR, MEMBER | —                                                                                                                                                                                                                                                                                            | OWNER: `notifikasi[]` stok habis + pendapatan harian/mingguan/bulanan; KASIR: stok habis + pesanan online `MENUNGGU`; MEMBER: 5 transaksi terakhir + status 5 pesanan online miliknya                                                                                                                                                                                                                                                |
| `POST /api/v1/unggah`                                                                    | OWNER                | —                                                                                                                                                                                                                                                                                            | `{ cloudName, apiKey, timestamp, folder, allowedFormats, maxFileSize, signature }` — server membuat tanda tangan upload (secret tetap di server)                                                                                                                                                                                                                                                                                     |
| `DELETE /api/v1/unggah`                                                                  | OWNER                | `{ url: string }` (secure_url Cloudinary milik folder kita)                                                                                                                                                                                                                                  | `{ hasil }` — hapus aset (422 bila URL bukan milik kita)                                                                                                                                                                                                                                                                                                                                                                             |
| `GET /api/v1/unggah/unduh?url=`                                                          | OWNER                | `url=` secure_url Cloudinary                                                                                                                                                                                                                                                                 | file (attachment) — diunduh lewat server, bukan browser                                                                                                                                                                                                                                                                                                                                                                              |
| `GET /api/v1/bahan`                                                                      | OWNER                | `?take=&skip=` (opsional; default semua)                                                                                                                                                                                                                                                     | `bahan[]` (+ `menipis`, `dipakaiProduk`) — sortir `nama`                                                                                                                                                                                                                                                                                                                                                                             |
| `POST /api/v1/bahan`                                                                     | OWNER                | `BahanInput`                                                                                                                                                                                                                                                                                 | `{ id }` (201)                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `PUT /api/v1/bahan`                                                                      | OWNER                | `BahanInput & { id }`                                                                                                                                                                                                                                                                        | `{ id }`                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `DELETE /api/v1/bahan?id=`                                                               | OWNER                | —                                                                                                                                                                                                                                                                                            | `{ id }` (422 bila dipakai resep)                                                                                                                                                                                                                                                                                                                                                                                                    |
| `GET /api/v1/supplier`                                                                   | OWNER                | —                                                                                                                                                                                                                                                                                            | `supplier[]{id,nama,kontak,alamat,catatan,aktif,jumlahPembelian,totalBelanja,hutang}`                                                                                                                                                                                                                                                                                                                                                |
| `GET /api/v1/supplier?hutang=`                                                           | OWNER                | `?hutang=` id supplier                                                                                                                                                                                                                                                                       | `hutang[]{pembelianBahanId,tanggal,bahanNama,totalHarga,belumDibayar}` (pembelian yang belum lunas)                                                                                                                                                                                                                                                                                                                                  |
| `POST /api/v1/supplier`                                                                  | OWNER                | `SupplierInput`, atau `{ bayar: { pembelianBahanId, jumlah, catatan? } }`                                                                                                                                                                                                                    | `{ id }` (201); `bayar` → `{ id, supplierId, belumDibayar }` (201) — kurangi sisa hutang                                                                                                                                                                                                                                                                                                                                             |
| `PUT /api/v1/supplier`                                                                   | OWNER                | `SupplierInput & { id }`                                                                                                                                                                                                                                                                     | `{ id }`                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `DELETE /api/v1/supplier?id=`                                                            | OWNER                | —                                                                                                                                                                                                                                                                                            | `{ id }` (422 bila punya riwayat pembelian)                                                                                                                                                                                                                                                                                                                                                                                          |
| `GET /api/v1/laporan-belanja?dari=&sampai=&supplierId=&sumberBelanja=&format=`           | OWNER                | tanggal `YYYY-MM-DD`; `supplierId` & `sumberBelanja` (`SUPPLIER`\|`PASAR_ONLINE`\|`PASAR_OFFLINE`) opsional; `format=csv\|xlsx\|pdf` (opsional)                                                                                                                                              | `{ dari, sampai, totalBelanja, jumlahPembelian, totalHutang, perSumber[], perBulan[], detail[] }`; `format` → file unduhan                                                                                                                                                                                                                                                                                                           |
| `POST /api/v1/pembayaran-kadaluarsa`                                                     | OWNER, KASIR         | — (batas 45 menit)                                                                                                                                                                                                                                                                           | `{ menit, batas, dibatalkan, transaksi[{id,nomor,kasirId}] }` — transaksi belum dibayar >45 menit dibatalkan otomatis, dicatat audit, dan dikirim notifikasi ke kasir; diproses berbasis batch dalam satu transaksi DB, maks 100 transaksi tertua per siklus (`BATAS_KADALUARSA_PER_SIKLUS`), sisanya diproses siklus cron berikutnya                                                                                                |
| `GET /api/cron/pembayaran-kadaluarsa`                                                    | Cron (Bearer)        | header `Authorization: Bearer <CRON_SECRET>`; tanpa body                                                                                                                                                                                                                                     | hasil sama dengan `POST /api/v1/pembayaran-kadaluarsa`; 401 bila token salah, 503 bila `CRON_SECRET` kosong; dijadwalkan Vercel tiap 15 menit (`vercel.json`)                                                                                                                                                                                                                                                                        |
| `GET /api/v1/audit-log?entitas=&aksi=&aktorId=&q=&dari=&sampai=&take=&skip=`             | OWNER                | filter opsional; `q` mencari aksi, entitas, ID entitas, dan nama aktor                                                                                                                                                                                                                       | `{ rows[{id,aksi,entitas,entitasId,aktorId,aktorNama,sebelum,sesudah,catatan,waktu}], total }`                                                                                                                                                                                                                                                                                                                                       |
| `GET /api/v1/percetakan?status=&printerId=&take=`                                        | OWNER, KASIR         | `status=MENUNGGU\|DIPROSES\|DICETAK\|GAGAL` (opsional); `printerId` opsional; `take` ≤ 50                                                                                                                                                                                                    | `printJob[]{id,printerId,printerNama,transaksiId,tipe,status,percobaan,pesanGalat,dicetakPada,diambilPada,createdAt,cetakOwner,cetakKasir,payload}` — `payload` = isi struk siap render                                                                                                                                                                                                                                              |
| `POST /api/v1/percetakan`                                                                | OWNER, KASIR         | `{ printerId?, transaksiId, tipe?, idempotencyKey? }`                                                                                                                                                                                                                                        | `printJob` (201) — payload disusun server dari transaksi; idempotency mencegah job ganda; job `STRUK` menaikkan penghitung cetak secara atomik: OWNER tanpa batas, KASIR maksimal 3 kali per transaksi (`DOMAIN` setelah batas)                                                                                                                                                                                                      |
| `POST /api/v1/percetakan/$id/ambil`                                                      | OWNER, KASIR         | —                                                                                                                                                                                                                                                                                            | `printJob` (status `MENUNGGU` → `DIPROSES`; 422 bila sudah diambil)                                                                                                                                                                                                                                                                                                                                                                  |
| `POST /api/v1/percetakan/$id/selesai`                                                    | OWNER, KASIR         | —                                                                                                                                                                                                                                                                                            | `printJob` (status `DICETAK`)                                                                                                                                                                                                                                                                                                                                                                                                        |
| `POST /api/v1/percetakan/$id/gagal`                                                      | OWNER, KASIR         | `{ pesan? }`                                                                                                                                                                                                                                                                                 | `printJob` (status `GAGAL` + `pesanGalat`)                                                                                                                                                                                                                                                                                                                                                                                           |
| `GET /api/v1/printer`                                                                    | OWNER                | —                                                                                                                                                                                                                                                                                            | `printer[]{id,userId,nama,tipe,lokasi,perangkat,koneksi,vendorId,vendorName,serialNumber,productName,dipindaiPada,terakhirDipakai,default,defaultPengguna,aktif}`                                                                                                                                                                                                                                                                    |
| `POST /api/v1/printer`                                                                   | OWNER                | `{ nama, tipe?, lokasi?, perangkat?, koneksi?, vendorId?, vendorName?, serialNumber?, productName?, default?, aktif? }`                                                                                                                                                                      | `{ id }` (201)                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `PUT /api/v1/printer`                                                                    | OWNER                | `{ id, nama, tipe?, lokasi?, perangkat?, koneksi?, vendorId?, vendorName?, serialNumber?, productName?, default?, aktif? }`                                                                                                                                                                  | `{ id }` — `default: true` memindahkan status default ke printer ini                                                                                                                                                                                                                                                                                                                                                                 |
| `DELETE /api/v1/printer?id=`                                                             | OWNER                | —                                                                                                                                                                                                                                                                                            | `{ id }` (422 bila punya riwayat cetak)                                                                                                                                                                                                                                                                                                                                                                                              |
| `GET /api/v1/printer/perangkat`                                                          | OWNER, KASIR         | —                                                                                                                                                                                                                                                                                            | `printer[]` milik pengguna yang login (aktif, terbaru dipindai lebih dulu)                                                                                                                                                                                                                                                                                                                                                           |
| `POST /api/v1/printer/perangkat`                                                         | OWNER, KASIR         | `{ nama, tipe?, lokasi?, perangkat, koneksi, vendorId?, vendorName?, serialNumber?, productName? }`                                                                                                                                                                                          | printer tersimpan (201) — upsert per `(userId, perangkat)`, `userId` dari sesi; maksimal 20 perangkat/user (`409 LIMIT_PERANGKAT`)                                                                                                                                                                                                                                                                                                   |
| `DELETE /api/v1/printer/perangkat/$id`                                                   | OWNER, KASIR         | `?permanen=1` opsional                                                                                                                                                                                                                                                                       | `{ id, dihapus }` — default nonaktif (`dihapus:false`); permanen hanya tanpa riwayat cetak (`409 PERANGKAT_BERJOB`); perangkat user lain → 422                                                                                                                                                                                                                                                                                       |
| `PATCH /api/v1/printer/perangkat/$id/default`                                            | OWNER, KASIR         | —                                                                                                                                                                                                                                                                                            | `printer` — jadikan default milik pengguna; default pengguna lain tidak berubah; perangkat nonaktif/milik user lain → 422                                                                                                                                                                                                                                                                                                            |
| `GET /api/v1/printer/default`                                                            | OWNER, KASIR         | —                                                                                                                                                                                                                                                                                            | printer default aktif (atau printer aktif pertama) — `null` bila belum ada                                                                                                                                                                                                                                                                                                                                                           |
| `GET /api/v1/saya`                                                                       | OWNER, KASIR, MEMBER | —                                                                                                                                                                                                                                                                                            | `{ member: {id,nama,telepon,poin,totalBelanja,diskonPersen,tier} \| null, riwayatAktif: boolean, transaksi[] }` — profil & riwayat milik pengguna yang login (dicocokkan via email)                                                                                                                                                                                                                                                  |
| `GET /api/v1/identitas`                                                                  | publik               | —                                                                                                                                                                                                                                                                                            | `{ judul, ikonUrl, logoUrl, deskripsi }` — identitas publik untuk web & Expo (ikon fallback ke logo, lalu inisial judul)                                                                                                                                                                                                                                                                                                             |
| `GET /api/v1/app-icon`                                                                   | publik               | —                                                                                                                                                                                                                                                                                            | **SVG** (bukan envelope): ikon 512×512 dari `ikon_url` Cloudinary, fallback ikon inisial judul; dipakai favicon/manifest; rate limit 60/menit per IP + cache 10 menit (gagal 1 menit)                                                                                                                                                                                                                                                |
| `GET /api/v1/manifest`                                                                   | publik               | —                                                                                                                                                                                                                                                                                            | **manifest.json** (bukan envelope): `name`/`short_name` dari judul app + ikon Cloudinary 192/512 + SVG                                                                                                                                                                                                                                                                                                                               |
| `GET /api/auth/get-session`                                                              | publik               | —                                                                                                                                                                                                                                                                                            | sesi atau `null`                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `POST /api/v1/auth-social`                                                               | publik               | `{ provider, idToken, accessToken?, callbackURL? }`                                                                                                                                                                                                                                          | `{ user }` — set cookie sesi httpOnly; tidak pernah mengembalikan token bearer                                                                                                                                                                                                                                                                                                                                                       |
| `POST /api/v1/auth-native`                                                               | publik               | `{ provider, idToken, accessToken?, callbackURL? }`                                                                                                                                                                                                                                          | `{ user, session: { token } }` — hanya bila `aud` ID token = `GOOGLE_NATIVE_CLIENT_ID`; `401` bila token web, `503` bila belum dikonfigurasi                                                                                                                                                                                                                                                                                         |
| `POST /api/v1/device-visit-token`                                                        | publik               | —                                                                                                                                                                                                                                                                                            | `{ token, berlakuSampai }` — token HMAC perangkat; 10/menit per IP + 120/menit global                                                                                                                                                                                                                                                                                                                                                |
| `POST /api/v1/device-visit`                                                              | publik               | `{ token }` (`DeviceVisit`, `src/validations/device-visit.ts`); `userId` dari sesi; IP/OS/klasifikasi/lokasi diturunkan server; body ≤ 16 KB                                                                                                                                                 | `DeviceVisitRow` — upsert per `deviceId`; 20/menit per IP + 600/menit global                                                                                                                                                                                                                                                                                                                                                         |
| `GET /api/v1/device-visit?deviceId=&userId=&userType=&klasifikasi=&dari=&sampai=&limit=` | OWNER                | `limit` opsional ≤ 500                                                                                                                                                                                                                                                                       | `deviceVisit[]` (+ ringkasan)                                                                                                                                                                                                                                                                                                                                                                                                        |
| `POST /api/v1/kunjungan`                                                                 | publik               | path dari `Referer` (fallback header `x-path`); `userId` dari sesi (anonim → `non-member`); OWNER/KASIR dikecualikan server                                                                                                                                                                  | `{ ok: true }` — dibatasi 120/menit per IP                                                                                                                                                                                                                                                                                                                                                                                           |
| `GET /api/v1/kunjungan/data?dari=&sampai=&grup=`                                         | OWNER                | `grup=harian\|mingguan\|bulanan\|tahunan`                                                                                                                                                                                                                                                    | `{ total, deret[], halamanTerpopuler[], perKlasifikasi[] }`                                                                                                                                                                                                                                                                                                                                                                          |
| `ANY /api/v1/*` (tidak dikenal)                                                          | publik               | —                                                                                                                                                                                                                                                                                            | `{ ok: false, error: { code: 'NOT_FOUND', message: 'Endpoint tidak ditemukan' } }` (404) — envelope JSON, bukan HTML, supaya klien Expo tak gagal parse                                                                                                                                                                                                                                                                              |

## Skema DTO utama

```ts
// POST /api/v1/transaksi
PostingTransaksi = {
  items: [{ produkId: string, qty: 1..9999 }], // maks 100 baris
  memberId?: string,
  deliveryId?: string,   // tarif diambil dari master, bukan dari klien
  diskon?: int >= 0,    // nominal Rp, diclamp ke subtotal; ditolak bila diskon
                        // total (manual+poin+member) melebihi subtotal.
                        // KASIR dibatasi `diskon_kasir_maks_persen` (default 10%
                        // subtotal) → 422 bila melebihi. OWNER boleh melewati,
                        // tetapi diskon di atas ambang dicatat ke AuditLog.
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
  statusPesanan?: 'MENUNGGU' | 'DIPROSES' | 'SELESAI' | 'DIBATALKAN' | 'LUNAS',
  statusKasirReview?: 'PENDING' | 'DISETUJUI' = 'PENDING', // wajib DISETUJUI sebelum dipost
  items: [{ produkId: string, qty: 1..9999, // maks 100 baris
            modifiers?: [{ modifierId: string, qty: 1..9999, catatan?: string }] }], // maks 20 modifier/baris
  catatan?: string,     // max 500
  // ─── Offline (antrean luring) ───
  idempotencyKey?: string(8–64), // kunci stabil buatan klien. Retry dengan
                        // kunci sama → server mengembalikan transaksi yang
                        // sudah ada (`replay: true`), stok/pendapatan tak
                        // terpotong dua kali.
  dibuatOffline?: boolean = false, // penanda transaksi dari antrean offline;
                        // wajib disertai idempotencyKey
  waktuKlien?: string,   // ISO-8601; hanya metadata, wajib dalam ±24 jam dari
                        // jam server. Laporan resmi memakai `tanggal`/`diterimaPada`.
}
// → 201 { transaksiId, nomor, tanggal, subtotal, diskon, diskonMember, pajak,
//         ongkir, alamat, deliveryId, total, metodeBayar, mejaId,
//         statusPesanan, uangDiterima, kembalian, pembayaran[], itemCount,
//         items[{nama,qty,harga,modifiers[{modifier,tambahan,qty,catatan}]}],
//         jurnalId: string|null, jurnalNomor: string|null, hpp,
//         memberNama?, memberTotalBelanja?, memberTier? }
//         (jurnalId/jurnalNomor null untuk pesanan online yang belum lunas)

// POST /api/v1/pesan
PesananOnline = {
  items: [{ produkId: string, qty: 1..9999,
            modifiers?: [{ modifierId: string, qty: 1..9999,
                           catatan?: string }] }], // maks 100 baris; 20 modifier/baris
  mejaToken?: string,           // WAJIB untuk dine-in; token QR meja (HMAC),
                                // server menurunkan mejaId. Ditolak bila deliveryId diisi.
  deliveryId?: string,          // layanan antar aktif; tarif ongkir dari master,
                                // bukan dari klien
  alamat?: string,              // wajib bila deliveryId; max 300 karakter
  metodeBayar?: 'QRIS' | 'TRANSFER' | 'EWALLET',
  catatan?: string, // max 500
}
// Body ≤ 256 KB. `mejaId` mentah tidak ada di schema (di-strip Zod) — meja
// hanya bisa dipakai lewat token QR. `mejaToken` dan `deliveryId` saling
// eksklusif; `deliveryId` wajib diiringi `alamat`. Stok/poin/jurnal/pembayaran
// baru dibuat saat lunas.

### Kontrak QR meja (FIT-01)

- Token QR meja stateless (tidak disimpan di DB): payload `{"v":1,"m":mejaId,"e":expiryMs}` ditandatangani HMAC-SHA256 dengan `BETTER_AUTH_SECRET`, diformat `isi.tanda`.
- Masa berlaku: 30 hari dari pembuatan. Token kedaluwarsa ditolak (`422`).
- Token diamankan dengan `timingSafeEqual`; panjang maksimal 512 karakter.
- Rute publik yang mengonsumsi token: `GET /api/v1/pesan?mejaToken=` (membaca menu, meja diabaikan bila token rusak) dan `POST /api/v1/pesan` (menurunkan `mejaId`; 422 bila token tidak valid/kedaluwarsa/meja nonaktif). Dine-in **wajib** token; `mejaId` mentah di-strip dan tidak pernah dipakai. `POST /api/v1/pesan-dinein` (draft kasir) juga mewajibkan `mejaToken`. Satu-satunya jalur `mejaId` mentah adalah finalisasi oleh staf (`POST /api/v1/pesan-dinein/{id}/finalisasi`), untuk meja yang belum punya QR — meja diverifikasi aktif di server dan route ber-guard `OWNER`/`KASIR`.
- Rate limit sudah berlaku: `GET /api/v1/pesan` 60/menit per IP, `POST /api/v1/pesan` 10/menit per IP, `GET /api/v1/meja-qr` 30/menit per user (owner).
- Owner melalui `GET /api/v1/meja-qr?id=` atau halaman `/meja` menghasilkan SVG QR yang menaut ke `/pesanan?meja=<token>`. Memutar ulang `BETTER_AUTH_SECRET` mencabut semua QR lama.

// POST /api/v1/pembayaran/webhook — HMAC-SHA256 atas body mentah
PaymentWebhook = {
  event: 'payment.paid' | 'payment.failed' | 'payment.expired',
  orderId: string,      // id transaksi online
  reference: string,    // unik per pembayaran (idempotensi)
  amount?: int,         // opsional; bila ada wajib sama dengan total
}

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

// Pengajuan pengeluaran kasir (server fn `*Fn.ts`, tanpa REST)
PengajuanRingkas = {
  id: string,
  kasirId: string,
  kasirNama: string,
  nominal: int > 0,          // nominal yang diminta kasir (Rp)
  nominalDisetujui: int|null, // isi setelah owner menyetujui (boleh < nominal)
  jenis: 'belanja'|'operasional_kasir'|'ambil_owner'|'pembayaran_utang'|
         'operasional_toko'|'lainnya',
  jenisLabel: string,
  keterangan: string|null,
  status: 'PENDING'|'DISETUJUI'|'DITOLAK',
  alasanPenolakan: string|null,
  jurnalNomor: string|null,  // nomor jurnal saat disetujui
  createdAt: string,         // ISO-8601
  disetujuiPada: string|null,
  ditolakPada: string|null,
}

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

| Server Function           | Metode | Guard               | Validator                                                                                     | Mengembalikan                                                                                                                                                    | Endpoint REST                               |
| ------------------------- | ------ | ------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `getSessionFn`            | GET    | publik (tidak ada)  | —                                                                                             | `{ session, user } \| null`                                                                                                                                      | `GET /api/auth/get-session`                 |
| `kasirDataFn`             | GET    | `requireOwner`      | —                                                                                             | master kasir (kategori, produk, member, delivery, penjualan hari ini)                                                                                            | `GET /api/v1/kasir-data`                    |
| `laporanFn`               | GET    | `requireOwner`      | `LaporanSchema` (dari, sampai, akunId?)                                                       | `{ akun[], pembuka[], entri[], trial[] }`                                                                                                                        | `GET /api/v1/laporan?dari=&sampai=&akunId?` |
| `catatPengeluaranFn`      | POST   | `requireOwner`      | `PengeluaranSchema` (tanggal, nominal, jenis, keterangan?)                                    | `{ jurnal{id, nomor, tanggal, keterangan, entri[]} }` — jurnal pengeluaran owner, berimbang                                                                      | — (web `/buku-besar`, server fn saja)       |
| `buatPengajuanFn`         | POST   | `requireHanyaKasir` | `AjuanPengeluaranSchema` (nominal, jenis, keterangan?)                                        | ringkasan pengajuan (status `PENDING`) — kasir mengajukan, jurnal belum dibuat                                                                                   | — (web `/kasir`, server fn saja)            |
| `daftarPengajuanFn`       | GET    | `requireKasir`      | —                                                                                             | `pengajuan[]` (OWNER: seluruh ajuan, KASIR: miliknya; `PENDING` didahulukan, lalu terbaru)                                                                       | — (web `/pengajuan`, server fn saja)        |
| `setujuiPengajuanFn`      | POST   | `requireOwner`      | `SetujuiPengajuanSchema` (id, nominal?)                                                       | `{ pengajuan, jurnal }` — jurnal pengeluaran dibuat berimbangs saat owner menyetujui                                                                             | — (web `/pengajuan`, server fn saja)        |
| `tolakPengajuanFn`        | POST   | `requireOwner`      | `TolakPengajuanSchema` (id, alasan?)                                                          | ringkasan pengajuan (status `DITOLAK`)                                                                                                                           | — (web `/pengajuan`, server fn saja)        |
| `postingTransaksiFn`      | POST   | `requireKasir`      | `PostingTransaksiSchema`                                                                      | struk ringkas + `uangDiterima`, `kembalian`, `pembayaran[]`, `hpp`                                                                                               | `POST /api/v1/transaksi`                    |
| `laporanPenjualanFn`      | GET    | `requireOwner`      | `LaporanPenjualanSchema` (dari, sampai, grup)                                                 | `{ ringkasan, deret[], produkTerlaris[], performaKasir[] }`                                                                                                      | `GET /api/v1/laporan-penjualan`             |
| `pengaturanDataFn`        | GET    | `requireKasir`      | —                                                                                             | `{ modeFnb, riwayatBelanja, namaToko, judulApp, logoUrl, ikonUrl, strukOtomatis, ukuranKertasTermal, deskripsiApp, pajakRestoPersen, pajakRetailPersen, semua }` | `GET /api/v1/pengaturan`                    |
| `identitasAppFn`          | GET    | publik (tidak ada)  | —                                                                                             | `{ judul, ikonUrl, logoUrl, deskripsi }`                                                                                                                         | `GET /api/v1/identitas`                     |
| `notifikasiFn`            | GET    | `requireSemua`      | —                                                                                             | `notifikasi[]` sesuai peran: OWNER stok+pendapatan, KASIR stok+pesanan online, MEMBER transaksi+status pesanan                                                   | `GET /api/v1/notifikasi`                    |
| `setPengaturanFn`         | POST   | `requireOwner`      | `SetPengaturanSchema`                                                                         | `{ kunci, nilai }`                                                                                                                                               | `PUT /api/v1/pengaturan`                    |
| `produkDataFn`            | GET    | `requireOwner`      | `ProdukQuerySchema` (q?, take=10, skip=0, sort, arah, status?, kategoriId?) — paginasi server | `{ produk[], total, kategori[], bahan[] }`                                                                                                                       | `GET /api/v1/produk`                        |
| `createProdukFn`          | POST   | `requireOwner`      | `ProdukInputSchema`                                                                           | `{ id }`                                                                                                                                                         | `POST /api/v1/produk`                       |
| `updateProdukFn`          | POST   | `requireOwner`      | `UpdateProdukSchema`                                                                          | `{ id }`                                                                                                                                                         | `PUT /api/v1/produk`                        |
| `toggleProdukFn`          | POST   | `requireOwner`      | `{ id, aktif }`                                                                               | `{ id }`                                                                                                                                                         | `POST /api/v1/produk` (toggle)              |
| `hapusProdukFn`           | POST   | `requireOwner`      | `{ id }`                                                                                      | `{ id }`                                                                                                                                                         | `DELETE /api/v1/produk?id=`                 |
| `produkTerpopulerFn`      | GET    | `requireOwner`      | `{ limit? }`                                                                                  | `produk[]{id,nama,harga,gambar,terjual}` (urutan terbanyak dulu)                                                                                                 | `GET /api/v1/produk-terpopuler`             |
| `produkLandingFn`         | GET    | publik (tidak ada)  | —                                                                                             | `{ populer[], baru[], campuran[] }` produk aktif; populer+mix fallback acak, baru = `createdAt desc`, maks 8/baris                                               | — (web `/`)                                 |
| `createKategoriFn`        | POST   | `requireOwner`      | `KategoriInputSchema`                                                                         | `{ id }`                                                                                                                                                         | `POST /api/v1/kategori`                     |
| `hapusKategoriFn`         | POST   | `requireOwner`      | `{ id }`                                                                                      | `{ id }`                                                                                                                                                         | `DELETE /api/v1/kategori?id=`               |
| `memberDataFn`            | GET    | `requireOwner`      | `MemberQuerySchema` (q?, take=10, skip=0, sort, arah) — paginasi server                       | `{ baris[], total }` (+ poin, totalBelanja, diskonPersen, tier, transaksi, terakhir per baris)                                                                   | `GET /api/v1/member`                        |
| `createMemberFn`          | POST   | `requireOwner`      | `MemberInputSchema`                                                                           | `{ id }`                                                                                                                                                         | `POST /api/v1/member`                       |
| `updateMemberFn`          | POST   | `requireOwner`      | `UpdateMemberSchema`                                                                          | `{ id }`                                                                                                                                                         | `PUT /api/v1/member`                        |
| `hapusMemberFn`           | POST   | `requireOwner`      | `{ id }`                                                                                      | `{ id }`                                                                                                                                                         | `DELETE /api/v1/member?id=`                 |
| `memberRiwayatFn`         | GET    | `requireOwner`      | `{ id }`                                                                                      | `{ member: {...}, riwayatAktif: boolean, transaksi[] }`                                                                                                          | `GET /api/v1/member/riwayat?id=`            |
| `mejaDataFn`              | GET    | `requireKasir`      | —                                                                                             | `meja[]{id,nomor,nama,aktif,jumlahTransaksi}`                                                                                                                    | `GET /api/v1/meja`                          |
| `createMejaFn`            | POST   | `requireOwner`      | `MejaInputSchema`                                                                             | `{ id }`                                                                                                                                                         | `POST /api/v1/meja`                         |
| `updateMejaFn`            | POST   | `requireOwner`      | `UpdateMejaSchema`                                                                            | `{ id }`                                                                                                                                                         | `PUT /api/v1/meja`                          |
| `hapusMejaFn`             | POST   | `requireOwner`      | `{ id }`                                                                                      | `{ id }`                                                                                                                                                         | `DELETE /api/v1/meja?id=`                   |
| `toggleMejaFn`            | POST   | `requireOwner`      | `{ id, aktif }`                                                                               | `{ id, aktif }`                                                                                                                                                  | `PUT /api/v1/meja`                          |
| `modifierGrupDataFn`      | GET    | `requireOwner`      | —                                                                                             | `grup[]{id,nama,wajib,min,max,aktif,modifiers[]}`                                                                                                                | `GET /api/v1/modifier-grup`                 |
| `createModifierGrupFn`    | POST   | `requireOwner`      | `ModifierGrupInputSchema`                                                                     | `{ id }`                                                                                                                                                         | `POST /api/v1/modifier-grup`                |
| `updateModifierGrupFn`    | POST   | `requireOwner`      | `UpdateModifierGrupSchema`                                                                    | `{ id }`                                                                                                                                                         | `PUT /api/v1/modifier-grup`                 |
| `hapusModifierGrupFn`     | POST   | `requireOwner`      | `{ id }`                                                                                      | `{ id }`                                                                                                                                                         | `DELETE /api/v1/modifier-grup?id=`          |
| `toggleModifierGrupFn`    | POST   | `requireOwner`      | `{ id, aktif }`                                                                               | `{ id, aktif }`                                                                                                                                                  | `PUT /api/v1/modifier-grup`                 |
| `modifierDataFn`          | GET    | `requireOwner`      | `{ grupId? }`                                                                                 | `modifier[]{id,grupId,nama,hargaTambahan,aktif}`                                                                                                                 | `GET /api/v1/modifier?grupId=`              |
| `createModifierFn`        | POST   | `requireOwner`      | `ModifierInputSchema`                                                                         | `{ id }`                                                                                                                                                         | `POST /api/v1/modifier`                     |
| `updateModifierFn`        | POST   | `requireOwner`      | `UpdateModifierSchema`                                                                        | `{ id }`                                                                                                                                                         | `PUT /api/v1/modifier`                      |
| `hapusModifierFn`         | POST   | `requireOwner`      | `{ id }`                                                                                      | `{ id }`                                                                                                                                                         | `DELETE /api/v1/modifier?id=`               |
| `toggleModifierFn`        | POST   | `requireOwner`      | `{ id, aktif }`                                                                               | `{ id, aktif }`                                                                                                                                                  | `PUT /api/v1/modifier`                      |
| `dapurDataFn`             | GET    | `requireOwner`      | —                                                                                             | `transaksi[]{id,nomor,statusPesanan,total,meja,member,items[],pembayaran[]}`                                                                                     | KDS: pesanan aktif                          |
| `updateStatusPesananFn`   | POST   | `requireOwner`      | `{ id, statusPesanan }`                                                                       | `{ id, statusPesanan }`                                                                                                                                          | KDS ubah status                             |
| `bahanDataFn`             | GET    | `requireOwner`      | `BahanQuerySchema` (q?, take=10, skip=0, sort, arah, filter?) — paginasi server               | `{ bahan[], total, menipis }` (+ `dipakaiProduk` per baris)                                                                                                      | `GET /api/v1/bahan`                         |
| `createBahanFn`           | POST   | `requireOwner`      | `BahanInputSchema`                                                                            | `{ id }`                                                                                                                                                         | `POST /api/v1/bahan`                        |
| `updateBahanFn`           | POST   | `requireOwner`      | `UpdateBahanSchema`                                                                           | `{ id }`                                                                                                                                                         | `PUT /api/v1/bahan`                         |
| `hapusBahanFn`            | POST   | `requireOwner`      | `{ id }`                                                                                      | `{ id }`                                                                                                                                                         | `DELETE /api/v1/bahan?id=`                  |
| `laporanPajakFn`          | GET    | `requireOwner`      | `LaporanPajakSchema` (dari, sampai, grup)                                                     | `{ dari, sampai, grup, totalPerJenis[], riwayat[] }`                                                                                                             | `GET /api/v1/laporan-pajak`                 |
| `laporanShiftFn`          | GET    | `requireOwner`      | `{ dari, sampai }`                                                                            | rekap shift per periode (halaman `/laporan`)                                                                                                                     | — (web `/laporan`)                          |
| `shiftDataFn`             | GET    | `requireKasir`      | `ShiftDataSchema` (dari?, sampai?)                                                            | `{ semuaKasir, shiftAktif, riwayat[] }`                                                                                                                          | `GET /api/v1/shift`                         |
| `bukaShiftFn`             | POST   | `requireKasir`      | `BukaShiftSchema` (kasAwal)                                                                   | `{ id, waktuBuka }`                                                                                                                                              | `POST /api/v1/shift` (`aksi:'buka'`)        |
| `tutupShiftFn`            | POST   | `requireKasir`      | `TutupShiftSchema` (kasAkhir, catatan?)                                                       | `{ id, kasAwal, kasAkhir, seharusnya, selisih, …ringkasan }`                                                                                                     | `POST /api/v1/shift` (`aksi:'tutup'`)       |
| `buatReturFn`             | POST   | `requireKasir`      | `BuatReturSchema`                                                                             | `{ id, nomor, totalRetur }` (stok + jurnal pembalik)                                                                                                             | `POST /api/v1/retur`                        |
| `detailTransaksiFn`       | GET    | `requireKasir`      | `{ id }`                                                                                      | `{ id, nomor, tanggal, total, items[] }` (422 bila tidak ada)                                                                                                    | `GET /api/v1/retur/transaksi?id=`           |
| `simpanOpnameFn`          | POST   | `requireKasir`      | `SimpanOpnameSchema`                                                                          | `{ id, nomor, jenis }` (koreksi stok tercatat → fisik)                                                                                                           | `POST /api/v1/opname`                       |
| `masterAktifFn`           | GET    | `requireKasir`      | `{ jenis: 'PRODUK' \| 'BAHAN' }`                                                              | `produk[]{id,nama,stok}` / `bahan[]{id,nama,stok,satuan}` aktif                                                                                                  | `GET /api/v1/opname/master?jenis=`          |
| `supplierDataFn`          | GET    | `requireOwner`      | —                                                                                             | `supplier[]{id,nama,kontak,alamat,catatan,aktif,jumlahPembelian,totalBelanja,hutang}`                                                                            | `GET /api/v1/supplier`                      |
| `supplierOpsiFn`          | GET    | `requireOwner`      | —                                                                                             | `supplier[]{id,nama}` aktif (form pembelian bahan)                                                                                                               | — (web `/bahan`)                            |
| `createSupplierFn`        | POST   | `requireOwner`      | `SupplierInputSchema`                                                                         | `{ id }`                                                                                                                                                         | `POST /api/v1/supplier`                     |
| `updateSupplierFn`        | POST   | `requireOwner`      | `UpdateSupplierSchema`                                                                        | `{ id }`                                                                                                                                                         | `PUT /api/v1/supplier`                      |
| `hapusSupplierFn`         | POST   | `requireOwner`      | `{ id }`                                                                                      | `{ id }`                                                                                                                                                         | `DELETE /api/v1/supplier?id=`               |
| `hutangSupplierFn`        | GET    | `requireOwner`      | `{ supplierId }`                                                                              | `hutang[]{pembelianBahanId,tanggal,bahanNama,totalHarga,belumDibayar}`                                                                                           | `GET /api/v1/supplier?hutang=`              |
| `catatPembayaranHutangFn` | POST   | `requireOwner`      | `PembayaranHutangSchema`                                                                      | `{ id, supplierId, belumDibayar }`                                                                                                                               | `POST /api/v1/supplier` (`bayar`)           |
| `laporanBelanjaFn`        | GET    | `requireOwner`      | `LaporanBelanjaSchema` (dari, sampai, supplierId?, sumberBelanja?)                            | `{ dari, sampai, totalBelanja, jumlahPembelian, totalHutang, perSumber[], perBulan[], detail[] }`                                                                | `GET /api/v1/laporan-belanja`               |
| `auditLogDataFn`          | GET    | `requireOwner`      | `AuditLogQuerySchema`                                                                         | `{ rows[], total }`                                                                                                                                              | `GET /api/v1/audit-log`                     |

Role: `user.role` = `OWNER` (penuh), `KASIR` (transaksi POS), `MEMBER` (pelanggan).
Peran punya **dua sumber**:

- **Halaman `/user`** (OWNER) — pilihan manual; ditandai `user.roleManual = true` sehingga
  otomatis env tak pernah menimpanya.
- **`OWNER_EMAILS` / `KASIR_EMAILS`** — default saat akun dibuat, dan disinkronkan
  ulang tiap kali sign-in untuk akun yang **bukan** manual (akun lama yang dibuat
  sebelum env diisi bisa naik ke OWNER/KASIR; OWNER tidak pernah diturunkan otomatis).

`requireOwner` = hanya OWNER; `requireKasir` = OWNER atau KASIR;
`requireHanyaKasir` = hanya KASIR (OWNER tidak boleh) — dipakai untuk pengajuan
pengeluaran yang harus lewat persetujuan owner.

Pesan error dari fungsi murni sudah dalam Bahasa Indonesia dan aman untuk klien (tidak bocorkan isi perut DB) — dibungkus `apiError` menjadi envelope `{ ok: false, error: { code, message } }`.

## Aturan bisnis (di server, bukan di klien)

1. Stok produk & bahan dicek lalu dikurangi atomik; kurang → seluruh transaksi rollback.
2. Harga/ongkir/tarif selalu dari DB — klien tidak boleh mengirim nominal akhir.
3. Redeem: `tukarPoin ≤ saldo`, nilai dibulatkan ke bawah kelipatan Rp100;
   `total = subtotal − diskon − diskonPoin + pajak + ongkir`. Pajak dibebankan ke
   pelanggan (eksklusif), diambil dari pengaturan: **PB1** (`pajak_resto_persen`)
   saat `mode_fnb` aktif (restoran/cafe), **PPN** (`pajak_retail_persen`) saat
   retail; nilai `pajak` dari klien selalu diabaikan. Jenis pajak disimpan di
   `Transaksi.pajakJenis`. Bila `pajak_resto_persen`/`pajak_retail_persen`
   kosong atau belum ada, server memakai `pajak_persen` legacy; PUT pengaturan
   menolak nilai kosong/non-angka agar tarif tidak berubah diam-diam.
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
    `waktuKlien` hanya metadata; `waktuKlien` wajib ±24 jam dari jam server dan
    `dibuatOffline=true` wajib punya `idempotencyKey`. `Transaksi.diterimaPada` dan
    `tanggal` selalu diisi server dan menjadi dasar laporan resmi. Cetak ke printer
    perangkat dilakukan lewat antrean job: `POST /api/v1/percetakan` (isi struk
    disusun server), klien pencetak mengambil job (`POST /percetakan/$id/ambil` →
    `DIPROSES`), lalu melaporkan `selesai` (`DICETAK`) atau `gagal` (`GAGAL` + pesan).
    Job juga idempoten lewat `idempotencyKey`.
17. Halaman web printer & antrean cetak: `/printer` (master printer, OWNER) dan
    `/percetakan` (antrean job, OWNER + KASIR) memakai server fn yang sama dengan
    REST (`src/server/percetakanFn.ts`). Job struk berstatus DICETAK/GAGAL bisa
    dicetak ulang dari antrean; OWNER tidak dibatasi, sedangkan KASIR dibatasi
    maksimal tiga cetak struk per transaksi. Penghitung dan job baru diperbarui
    atomik agar request bersamaan tidak melewati batas.
18. Pengajuan pengeluaran kasir (web `/kasir` + `/pengajuan`): kasir mengirim
    ajuan (jenis + nominal, tanpa tanggal) lewat `buatPengajuanFn`; ajuan berstatus
    `PENDING` dan **belum** menyentuh jurnal. Owner menyetujui lewat
    `setujuiPengajuanFn` — jurnal pengeluaran berimbang dibuat saat itu juga dalam
    satu transaksi bersama perubahan status, dan `nominalDisetujui` boleh lebih kecil
    dari nominal ajuan (tidak boleh lebih besar). Menolak lewat `tolakPengajuanFn`
    menyimpan alasan. Kasir diberi tahu lewat notifikasi berisi nominal yang
    disetujui. OWNER mencatat pengeluaran langsung (tanpa ajuan) lewat
    `catatPengeluaranFn`.
19. Pesanan online (`sumber=ONLINE`) tidak memotong stok, memberi poin, atau
    menulis jurnal/pembayaran saat dibuat. Semua efek itu dijalankan tepat sekali
    saat pembayaran dikonfirmasi — manual (`POST /api/v1/pesanan/{id}/bayar`)
    atau webhook `payment.paid` bertanda tangan HMAC. `dibayarPada` adalah sumber
    status lunas; `statusPesanan` tetap mengikuti alur dapur. Pembatalan online
    yang sudah lunas ditolak (refund belum didukung); pembatalan sebelum lunas
    tidak mengubah stok karena stok belum pernah dipotong.
20. Laporan penjualan, pajak, produk terlaris, shift, notifikasi, dan riwayat
    member hanya menghitung transaksi yang sudah dibayar (`dibayarPada != null`)
    dan tidak dibatalkan. Ekspor CSV menyanitasi sel berawalan `= + - @`
    (termasuk spasi/kontrol di depannya) **sebelum** quoting agar formula tidak
    dieksekusi spreadsheet.

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

`session.token` diperoleh dari `POST /api/v1/auth-native` (setelah `aud` ID
token diverifikasi sebagai client native). Plugin `bearer` Better Auth
(`src/lib/auth.ts`) menerjemahkan header itu jadi sesi; tanpa plugin ini semua
request mobile akan 401 (cookie httpOnly tak bisa dibaca React Native).

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
