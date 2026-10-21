# Panduan Integrasi Expo (mobile) — POS

> Backend: `E:\code\pos` (TanStack Start + Prisma/Postgres).
> Aplikasi mobile: `E:\code\pos_mobile` (Expo SDK 58, expo-router).
> Kontrak data resmi: `docs/API.md` (file itu yang mengikat; dokumen ini cara
> pakainya dari sisi mobile).

## 1. Ringkas: apa yang sudah siap

| Kebutuhan mobile                                   | Status          | Endpoint / cara                                                         |
| -------------------------------------------------- | --------------- | ----------------------------------------------------------------------- |
| Login Google native                                | ✅ siap         | `POST /api/v1/auth-social` (header `x-client: expo`) → `session.token`  |
| Sesi tanpa cookie jar                              | ✅ siap         | `Authorization: Bearer <token>` (plugin `bearer` aktif)                 |
| Master kasir (kategori/produk/member/delivery)     | ✅ siap         | `GET /api/v1/kasir-data`                                                |
| Transaksi POS (member, poin, split, F&B, modifier) | ✅ siap         | `POST /api/v1/transaksi`                                                |
| Detail & cetak struk                               | ✅ siap         | `GET /api/v1/transaksi`?id= …, `POST /api/v1/transaksi/cetak/$id`       |
| Master produk/kategori/bahan/supplier              | ✅ siap         | `/api/v1/produk`, `/kategori`, `/bahan`, `/supplier`                    |
| Member + riwayat member                            | ✅ siap         | `/api/v1/member`, `/api/v1/member/riwayat?id=`                          |
| Meja & modifier (mode F&B)                         | ✅ siap         | `/api/v1/meja`, `/api/v1/modifier*`                                     |
| Shift kasir                                        | ✅ siap         | `/api/v1/shift`                                                         |
| Retur & stok opname                                | ✅ siap         | `/api/v1/retur*`, `/api/v1/opname*`                                     |
| Laporan + ekspor                                   | ✅ siap         | `/api/v1/laporan*`, `/laporan-belanja`, `/laporan-pajak`                |
| Upload foto produk                                 | ✅ siap         | `POST /api/v1/unggah` (tanda tangan) → unggah langsung ke Cloudinary    |
| Profil member mandiri                              | ✅ siap         | `GET /api/v1/saya` (semua peran login)                                  |
| Pesanan online publik                              | ✅ siap         | `GET/POST /api/v1/pesan`                                                |
| Log audit (owner)                                  | ✅ siap         | `GET /api/v1/audit-log`                                                 |
| Antrean offline (idempoten)                        | ✅ siap         | `POST /api/v1/transaksi` + `idempotencyKey`                             |
| Printer perangkat (Bluetooth/Wi-Fi)                | ✅ kontrak siap | `/api/v1/printer`, `/api/v1/percetakan`                                 |
| Judul & ikon aplikasi dari owner                   | ✅ siap         | `GET /api/v1/identitas`, `GET /api/v1/app-icon`, `GET /api/v1/manifest` |

Belum tersedia (lihat §6): sinkron offline ( sisi mobile), printer Bluetooth ESC/POS
(sisi mobile), notifikasi push, endpoint khusus member untuk mutasi profil.

## 2. Auth (langkah demi langkah)

1. **Google native sign-in** di aplikasi:
   `expo-auth-session` / `@react-native-google-signin` → dapat `idToken` (+ `accessToken`).
2. Tukar jadi sesi POS:

   ```ts
   const res = await fetch(`${BASE}/api/v1/auth-social`, {
     method: 'POST',
     headers: { 'content-type': 'application/json', 'x-client: 'expo' },
     body: JSON.stringify({
       provider: 'google',
       idToken,
       accessToken,
       callbackURL: 'pos://auth/callback',
     }),
   })
   const { data } = await res.json() // data.session.token
   ```

3. **Simpan token** di `expo-secure-store` (bukan AsyncStorage).
4. **Setiap request** kirim header:

   ```ts
   const api = async (path: string, init: RequestInit = {}) => {
     const token = await SecureStore.getItemAsync('pos_token')
     const res = await fetch(`${BASE}/api/v1${path}`, {
       ...init,
       headers: {
         'content-type': 'application/json',
         authorization: `Bearer ${token}`,
         ...(init.headers ?? {}),
       },
     })
     const body = await res.json()
     if (!body.ok) throw new Error(body.error?.message ?? 'Gagal')
     return body.data
   }
   ```

> Kenapa Bearer? React Native tidak punya cookie jar; header `Authorization` dibaca
> oleh plugin `bearer` Better Auth (`src/lib/auth.ts`). Tanpa itu, sesi hanya
> berlaku lewat cookie httpOnly — mustahil dipakai dari native.

## 3. Endpoint per layar mobile

| Layar di aplikasi       | Panggilan                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------- |
| Login                   | `POST /api/v1/auth-social`                                                              |
| Kasir (daftar produk)   | `GET /api/v1/kasir-data` → `produk[]`, `kategori[]`, `member[]`, `delivery[]`           |
| Cari member             | data `member[]` dari `kasir-data` (cari di sisi klien) atau `GET /api/v1/member?take=`  |
| Bayar                   | `POST /api/v1/transaksi` (body `PostingTransaksi`, lihat `docs/API.md`)                 |
| Struk                   | respons transaksi (nomor, total, item) + `POST /api/v1/transaksi/cetak/$id`             |
| Dapur / KDS             | `GET /api/v1/pesan` (master menu & meja), status pesanan di respons transaksi           |
| Meja (F&B)              | `GET/POST /api/v1/meja`                                                                 |
| Modifier                | `GET /api/v1/modifier?grupId=`, `GET /api/v1/modifier-grup`                             |
| Manage produk           | `GET/POST/PUT/DELETE /api/v1/produk` (+ `POST /api/v1/unggah` untuk foto)               |
| Manage bahan & supplier | `/api/v1/bahan`, `/api/v1/supplier`, `POST /api/v1/pembelian-bahan`                     |
| Member                  | `/api/v1/member`, `/api/v1/member/riwayat?id=`                                          |
| Laporan                 | `/api/v1/laporan-penjualan`, `/laporan-pajak`, `/laporan-belanja` (ekspor CSV/XLSX/PDF) |
| Shift                   | `GET/POST /api/v1/shift` (`aksi: 'buka' \| 'tutup'`)                                    |
| Retur / opname          | `/api/v1/retur*`, `/api/v1/opname*`                                                     |
| Profil member           | `GET /api/v1/saya`                                                                      |

Semua respons memakai envelope: `{ ok: true, data }` atau
`{ ok: false, error: { code, message } }`. Kode error: `UNAUTHORIZED` (401),
`FORBIDDEN` (403), `BAD_REQUEST` (400), `DOMAIN` (422), `TOO_MANY_REQUESTS` (429),
`INTERNAL` (500).

## 4. Konfigurasi environment

**Backend** (`.env.local` di `E:\code\pos`):

```bash
BETTER_AUTH_URL=http://localhost:3000        # origin API
TRUSTED_ORIGINS=http://localhost:3000        # + origin Expo Web bila dipakai
```

**Aplikasi** (`E:\code\pos_mobile\.env`):

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000    # API POS (device: pakai IP LAN, mis. http://192.168.1.10:3000)
```

### Expo Web (react-native-web)

Browser mengirim `Origin`, jadi origin aplikasi **wajib** ada di `TRUSTED_ORIGINS`:

- Expo dev: `http://localhost:8081` (Expo CLI) atau `http://localhost:19006` (web dev).
- Produksi: origin domain aplikasi (mis. `https://pos.example.com`).

Backend sudah mengirim header CORS (`Access-Control-Allow-Origin` + preflight
`OPTIONS` → 204) **hanya** untuk origin tepercaya; origin lain tidak
mendapat header CORS (browser menolak sendiri).

### Klien native (Android/iOS)

Tak mengirim `Origin` → CORS tak relevan. Yang penting:

- `BETTER_AUTH_URL` / `TRUSTED_ORIGINS` tetap diisi origin server (untuk
  verifikasi redirect Google).
- Android emulator tak bisa memakai `localhost` → pakai `10.0.2.2` (Android) atau
  IP LAN device.

## 5. Batasan & guard

- Master data (produk/bahan/kategori/supplier/member) = **OWNER** saja.
  Kasir hanya boleh: `kasir-data`, `transaksi`, `meja` (baca), `pengaturan`
  (baca), `shift`, `retur`, `opname`, `pesan`, `saya`.
- Rate limit per IP: endpoint tulis sensitif dibatasi (mis. `auth-social`
  5/menit, `pesan` 10/menit). Jangan retry agresif.
- Semua perhitungan uang/harga/pajak dihitung server — klien tak boleh
  mengirim nominal akhir (`harga`, `pajak`, `diskon` total, `total`).
- Aplikasi tak boleh akses Prisma/DB langsung, dan tak boleh meniru
  perhitungan server (harga, pajak, diskon, total).

## 6. Offline (antrean luring) — kontrak sudah siap

Server menjaga **idempotensi**: transaksi menyimpan `idempotencyKey` unik, jadi
retry dari antrean luring **tidak** membuat transaksi ganda (stok & pendapatan
tak dobel).

```ts
// 1. Saat transaksi dibuat (luring), simpan antrean lokal dengan kunci stabil.
const idempotencyKey = crypto.randomUUID() // atau uuid v4 dari expo-crypto
await antrean.tambah({
  idempotencyKey,
  payload: { ...payload, idempotencyKey },
})

// 2. Saat online, kirim ulang dengan kunci yang sama:
const data = await api('/transaksi', {
  method: 'POST',
  body: {
    ...payload,
    idempotencyKey,
    dibuatOffline: true,
    waktuKlien: new Date().toISOString(),
  },
})
// → `data.replay === true` artinya transaksi ini sudah pernah terposting
//   (server mengembalikan transaksi yang sama, bukan membuat baru).
```

Field tambahan yang bisa diisi klien:

| Field            | Arti                                                    |
| ---------------- | ------------------------------------------------------- |
| `idempotencyKey` | kunci stabil per transaksi (wajib untuk antrean luring) |
| `dibuatOffline`  | `true` bila dibuat dari antrean luring                  |
| `waktuKlien`     | ISO-8601 waktu transaksi dibuat di perangkat            |

> Antrean offline web sudah memakai kontrak yang sama (`src/lib/outbox.ts`:
> `id` item = `idempotencyKey`).

## 7. Printer perangkat — kontrak sudah siap

Printer daemon (ponsel/bridge) menarik struk dari server, merender ke ESC/POS
sendirinya, lalu melaporkan hasilnya.

```ts
// A. Daun printer (dikelola owner)
await api('/printer', {
  method: 'POST',
  body: { nama: 'Kasir 1', tipe: 'ESC_POS', default: true },
})

// B. Setelah transaksi sukses, masukkan struk ke antrean cetak
const job = await api('/percetakan', {
  method: 'POST',
  body: { printerId, transaksiId, idempotencyKey: `struk-${transaksiId}` },
})
// job.payload = isi struk terstruktur (nomor, tanggal, items, total, pembayaran…)

// C. Daun pencetak: polling → ambil → cetak → laporan
const antrean = await api('/percetakan?status=MENUNGGU&take=5')
for (const j of antrean) {
  const diambil = await api(`/percetakan/${j.id}/ambil`, { method: 'POST' })
  try {
    await cetakEscpos(renderStruk(diambil.payload)) // render di perangkat
    await api(`/percetakan/${j.id}/selesai`, { method: 'POST' })
  } catch (e) {
    await api(`/percetakan/${j.id}/gagal`, {
      method: 'POST',
      body: { pesan: 'Printer offline' },
    })
  }
}
```

Status job: `MENUNGGU` → `DIPROSES` (saat diambil) → `DICETAK` | `GAGAL`.
`POST /percetakan/$id/ambil` hanya berhasil sekali — jadi dua daemon tak
sama-sama mencetak struk yang sama.

### 7.1 Pindai printer otomatis — siklus sesi login

Objek koneksi aktif tetap hanya di state sesi, tetapi **metadata perangkat
disimpan ke DB** untuk akun OWNER/KASIR. Server memakai `userId` dari token
sesi; jangan pernah mengirim `userId` dari klien.

- Saat login OWNER/KASIR berhasil: pindai perangkat yang sudah berizin
  (Android: bonded Bluetooth printers; iOS: `expo-print`/BLE yang tersedia).
  Scan senyap ini boleh tanpa gesture.
- Untuk setiap hasil pindai, panggil `POST /api/v1/printer/perangkat` dengan
  `perangkat`, `koneksi`, dan metadata yang tersedia. Endpoint melakukan upsert
  per `(userId, perangkat)`, jadi pemindaian berulang tidak membuat duplikat.
- `GET /api/v1/printer/perangkat` mengembalikan perangkat aktif milik pengguna;
  pakai untuk menampilkan "printer yang dikenal" setelah login. Pilihan/port
  aktif tetap di state memori.
- Saat logout: kosongkan state koneksi dan batalkan langganan perangkat.
  Metadata di DB tidak dihapus (tetap milik akun).
- Printer baru tetap butuh aksi pengguna (pairing/pilih perangkat) sebelum dipakai.
- Jangan pakai `AsyncStorage`/`SecureStore` untuk objek port/koneksi — itu
  bertahan setelah app ditutup. Metadata identitas perangkat boleh di DB.

Pemetaan jalur native:

| Jalur     | `koneksi`   | `perangkat`                 | Metadata yang diisi                                                        |
| --------- | ----------- | --------------------------- | -------------------------------------------------------------------------- |
| USB       | `USB`       | USB path / device ID stabil | `vendorId`, `productName`, `serialNumber` dari descriptor                  |
| Bluetooth | `BLUETOOTH` | MAC/device UUID             | `productName` dari nama perangkat, `serialNumber` bila service menyediakan |
| WiFi      | `WIFI`      | host/IP                     | `productName`/model, `serialNumber` bila API printer menyediakan           |
| Serial    | `SERIAL`    | path COM/serial             | `vendorId`, `productName`, `serialNumber` bila tersedia                    |

```ts
const hasil = await pindaiPrinterNative()
for (const d of hasil) {
  await api('/printer/perangkat', {
    method: 'POST',
    body: {
      nama: d.nama,
      perangkat: d.id,
      koneksi: d.koneksi, // 'USB' | 'BLUETOOTH' | 'WIFI' | 'SERIAL'
      vendorId: d.vendorId,
      vendorName: d.vendorName,
      serialNumber: d.serialNumber,
      productName: d.productName,
    },
  })
}
const dikenal = await api('/printer/perangkat')
```

Web memakai Web Serial (`navigator.serial.getPorts()`). Web Serial hanya bisa
membedakan USB dari serial fallback (Bluetooth virtual/WiFi); metadata lengkap
dan jalur Bluetooth/WiFi yang akurat membutuhkan API native Expo.

- Identitas tampilan (judul/ikon) di app diambil dari `GET /api/v1/identitas`;
  ikon siap pakai dari `GET /api/v1/app-icon`, dan manifest web dari
  `GET /api/v1/manifest`.

## 8. Yang belum ada (rencana)

1. **Offline (sisi mobile)**: kontrak server sudah siap (idempotensi, §6) —
   yang belum ada adalah sisi perangkat: store lokal (SQLite/AsyncStorage),
   antrean, dan pemicu kirim ulang saat online. Web sudah punya outbox
   IndexedDB sebagai contoh implementasi.
2. **Printer (sisi mobile)**: kontrak antrean cetak sudah siap (§7) — yang
   belum ada adalah lapisan native untuk bicara dengan printer
   Bluetooth/Wi-Fi (`react-native-ble-plx`, `expo-print`) dan perender
   ESC/POS di perangkat. Web meanwhile memakai Web Serial langsung.
3. **Member ↔ User**: relasi masih lewat email (tak ada FK). Jika app member
   butuh profil permanen, tambahkan `userId` di `Member`.
4. **Push notification** untuk pesanan online (F&B): butuh service push + tabel
   perangkat.
5. **Paginasi** sudah tersedia (`take`/`skip`) untuk `produk`, `member`,
   `bahan`, `kategori`.

## 9. Checklist integrasi

- [ ] `expo-secure-store` untuk token; token di-refresh saat 401 → ulang login.
- [ ] Semua fetch pakai helper yang selalu menyertakan `Authorization: Bearer`.
- [ ] Error dari envelope ditampilkan apa adanya (pesan server sudah aman
      Bahasa Indonesia).
- [ ] Saat development di device: `EXPO_PUBLIC_API_URL` memakai IP LAN.
- [ ] Role-aware UI: hide tombol master data untuk KASIR (backend tetap
      menolak, UI hanya kerapian).
- [ ] Uji 3 tingkat hak akses: OWNER, KASIR, MEMBER (lihat `docs/API.md`).
