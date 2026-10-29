# Mobile Integration Roadmap — Expo POS Client

> Target kode: `E:\code\pos_mobile/src/services/pos/`
> Kontrak backend: `E:\code/pos/docs/API.md` + `docs/EXPO.md`
> Guardrails: `mcp/server-expo.ts` (`expo_barriers`) — baca sebelum ubah kode mobile.
>
> Format standar service: `requestPosApi<T>(path, { method, body, requiresSession })`.
> Semua request butuh `Authorization: Bearer <token>` (lihat §1 perbaikan auth).
> Semua respons envelope: `{ ok: true, data }` atau `{ ok: false, error: { code, message } }`.
> Uang = integer rupiah; ID = cuid(); jangan pernah hitung harga/pajak/diskon di klien.

---

## FASE 0 — Perbaikan Autentikasi (KRITIS, sebelum apapun)

### 0.1 `src/services/pos/auth.ts` — ganti endpoint auth-social → auth-native

```ts
// Sebelum (SALAH — auth-social tidak mengembalikan session.token):
const result = await requestPosApi<GoogleNativeSignInResponse>(
  '/api/v1/auth-social', { ... })

// Sesudah (BENAR):
const result = await requestPosApi<GoogleNativeSignInResponse>(
  '/api/v1/auth-native', { ... })
```

**Kenapa:** Backend `auth-social` (lihat `src/routes/api/v1/auth-social.ts` + `src/server/auth-response.ts`) sengaja menggunakan `responsAuthWeb()` yang mengembalikan hanya `{ user }` — `session.token` selalu `undefined`, sehingga klien melempar `SESSION_TOKEN_MISSING`. Endpoint `/api/v1/auth-native` memverifikasi Google `aud` = `GOOGLE_NATIVE_CLIENT_ID` dan me-return `{ user, session: { token } }` via `responsAuthNative()`.

### 0.2 `src/services/pos/client.ts` — ganti cookie → Bearer

**Ganti seluruh fungsi `createHeaders`:**

```ts
async function createHeaders(
  inputHeaders: HeadersInit | undefined,
  requiresSession: boolean,
  hasBody: boolean,
): Promise<Headers> {
  const headers = new Headers(inputHeaders)
  headers.set('accept', 'application/json')
  // HAPUS: headers.set('x-client', 'expo')  — bukan security boundary

  if (hasBody && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }

  if (!requiresSession) return headers

  const sessionToken = await readPosSessionToken()
  if (!sessionToken) {
    throw new PosApiError('Login dulu.', 'server', 'UNAUTHORIZED', 401)
  }

  // Ganti cookie → Bearer per kontrak docs/API.md §Auth
  headers.set('authorization', `Bearer ${sessionToken}`)
  return headers
}
```

**Hapus import `getSessionCookieName`** bila tidak dipakai lagi, dan import `getSessionCookieName` dari config bila masih dipakai di tempat lain.

### 0.3 `src/services/pos/config.ts` — (opsional) hapus `getSessionCookieName`

Bila sudah tidak dipakai di mana pun, hapus fungsi `getSessionCookieName`. Periksa seluruh kode dengan `grep` "getSessionCookieName".

### 0.4 Verifikasi

- `bunx tsc --noEmit` lulus
- Login Google native di device: dapat token, simpan SecureStore, request berikutnya sukses dengan `Authorization: Bearer`
- `docs/EXPO.md` §2 sudah selaras — auth-native + Bearer + SecureStore

---

## FASE 1 — Service Baru (route backend sudah ada, belum dipanggil Expo client)

Buat file service baru di `src/services/pos/`, ikuti pola `transaksi.ts`/`kasir.ts`. Export di `index.ts`.

### 1.1 Struk & Cetak (`src/services/pos/struk.ts`)

Backend: `src/routes/api/v1/transaksi/struk/$id/pdf.ts`, `src/routes/api/v1/transaksi/cetak/$id.ts`

```ts
import { requestPosApi } from './client'

export type StrukResult = {
  transaksiId: string
  nomor: string
  payload: Record<string, unknown> // struk terstruktur
}

/** Unduh PDF struk (attachment). */
export async function unduhStrukPdf(transaksiId: string): Promise<Blob> {
  // Request langsung ke fetch agar dapat Blob, bukan requestPosApi (yang JSON.parse)
  const token = await readPosSessionToken()
  const res = await fetch(
    getPosApiUrl(`/api/v1/transaksi/struk/${transaksiId}/pdf`),
    {
      method: 'GET',
      headers: { authorization: `Bearer ${token ?? ''}` },
      credentials: 'omit',
    },
  )
  if (!res.ok) throw await parseError(res)
  return await res.blob()
}

/** Cetak ulang struk (owner tak terbatas; kasir maks 3 — dicek server). */
export async function cetakStruk(transaksiId: string): Promise<StrukResult> {
  return requestPosApi<StrukResult>('/api/v1/transaksi/cetak/transaksi', {
    method: 'POST',
    body: { transaksiId },
    requiresSession: true,
  })
}
```

> ⚠️ Periksa path `POST /api/v1/transaksi/cetak/$id` — lihat `src/routes/api/v1/transaksi/cetak/$id.ts` untuk format path yang tepat ($id di URL vs body).

### 1.2 Printer Perangkat (`src/services/pos/printer.ts`)

Backend: `src/routes/api/v1/printer/*`

```ts
import type { ProdukItem } from './api-types'
import { requestPosApi } from './client'

export type PerangkatPrinter = {
  id: string
  nama: string
  perangkat: string
  koneksi: 'USB' | 'BLUETOOTH' | 'WIFI' | 'SERIAL'
  vendorId?: string | null
  vendorName?: string | null
  serialNumber?: string | null
  productName?: string | null
  dipindaiPada?: string
  terakhirDipakai?: string | null
}

/** Daftar printer perangkat milik user (auto-scan setelah login). */
export async function fetchPrinterPerangkat(): Promise<PerangkatPrinter[]> {
  return requestPosApi<PerangkatPrinter[]>('/api/v1/printer/perangkat', {
    method: 'GET',
    requiresSession: true,
  })
}

/** Registrasi printer hasil scan (upsert per userId + perangkat). */
export async function daftarPrinter(
  body: Partial<PerangkatPrinter>,
): Promise<{ id: string }> {
  return requestPosApi<{ id: string }>('/api/v1/printer/perangkat', {
    method: 'POST',
    body,
    requiresSession: true,
  })
}

/** Hapus/nonaktifkan perangkat. */
export async function hapusPrinter(
  id: string,
  permanen = false,
): Promise<{ id: string }> {
  return requestPosApi<{ id: string }>(
    `/api/v1/printer/perangkat/${id}?permanen=${permanen}`,
    { method: 'DELETE', requiresSession: true },
  )
}

/** Default printer akun. */
export async function setDefaultPrinter(id: string): Promise<void> {
  await requestPosApi(`/api/v1/printer/perangkat/${id}/default`, {
    method: 'PATCH',
    requiresSession: true,
  })
}
```

> 🔐 Perhatian dari `expo_barriers` §6: metadata perangkat (vendorId, serialNumber, productName) **informatif saja**, bukan bukti otorisasi. Jangan gunakan untuk keputusan akses di klien.

### 1.3 Antrean Cetak (`src/services/pos/percetakan.ts`)

Backend: `src/routes/api/v1/percetakan/*`

```ts
import { requestPosApi } from './client'

export type JobCetak = {
  id: string
  printerId: string
  transaksiId: string
  status: 'MENUNGGU' | 'DIPROSES' | 'DICETAK' | 'GAGAL'
  payload: Record<string, unknown> // struk terstruktur
}

/** Ambil antrean cetak (polling). */
export async function fetchAntreanCetak(take = 5): Promise<JobCetak[]> {
  return requestPosApi<JobCetak[]>(
    `/api/v1/percetakan?status=MENUNGGU&take=${take}`,
    {
      method: 'GET',
      requiresSession: true,
    },
  )
}

/** Ambil job (atomic: hanya sekali). */
export async function ambilJobCetak(id: string): Promise<JobCetak> {
  return requestPosApi<JobCetak>(`/api/v1/percetakan/${id}/ambil`, {
    method: 'POST',
    requiresSession: true,
  })
}

/** Laporkan cetak selesai. */
export async function selesaiCetak(id: string): Promise<void> {
  await requestPosApi(`/api/v1/percetakan/${id}/selesai`, {
    method: 'POST',
    requiresSession: true,
  })
}

/** Laporkan cetak gagal. */
export async function gagalCetak(id: string, pesan: string): Promise<void> {
  await requestPosApi(`/api/v1/percetakan/${id}/gagal`, {
    method: 'POST',
    body: { pesan },
    requiresSession: true,
  })
}
```

### 1.4 Master Data Produk/Kategori/Bahan/Supplier (`src/services/pos/master.ts`)

Backend: `/api/v1/produk`, `/kategori`, `/bahan`, `/supplier` (OWNER only)

```ts
import { requestPosApi } from './client'

export async function fetchProdukList(): Promise<ProdukItem[]> {
  return requestPosApi<ProdukItem[]>('/api/v1/produk', {
    method: 'GET',
    requiresSession: true,
  })
}

export async function fetchKategoriList(): Promise<KategoriItem[]> {
  return requestPosApi<KategoriItem[]>('/api/v1/kategori', {
    method: 'GET',
    requiresSession: true,
  })
}

export async function fetchBahanList(): Promise<BahanItem[]> {
  return requestPosApi<BahanItem[]>('/api/v1/bahan', {
    method: 'GET',
    requiresSession: true,
  })
}

export async function fetchSupplierList(): Promise<SupplierItem[]> {
  return requestPosApi<SupplierItem[]>('/api/v1/supplier', {
    method: 'GET',
    requiresSession: true,
  })
}
```

> 🛡️ Semua hanya OWNER. KASIR yang panggil akan dapat 403 FORBIDDEN — biarkan server menolak, tapi sembunyikan UI tombol master data untuk KASIR.

### 1.5 Laporan (`src/services/pos/laporan.ts`)

Backend: `/api/v1/laporan-penjualan`, `/laporan-pajak`, `/laporan-belanja`

```ts
export type LaporanPenjualan = {
  ringkasan: { total: number; subtotal: number; pajak: number; diskon: number }
  deret: Array<{ periode: string; total: number }>
  produkTerlaris: Array<{ nama: string; qty: number; total: number }>
}

export async function fetchLaporanPenjualan(
  dari: string,
  sampai: string,
  format?: 'csv' | 'xlsx' | 'pdf',
): Promise<LaporanPenjualan> {
  const q = new URLSearchParams({ dari, sampai })
  if (format) q.set('format', format)
  return requestPosApi<LaporanPenjualan>(`/api/v1/laporan-penjualan?${q}`, {
    method: 'GET',
    requiresSession: true,
  })
}
```

> 📦 Jika `format` diset, respons berupa file unduhan (bukan JSON) — pakai fetch langsung ke Blob seperti `unduhStrukPdf`.

### 1.6 Unggah Foto (`src/services/pos/unggah.ts`)

Backend: `POST /api/v1/unggah` (membuat tanda tangan Cloudinary), lalu upload langsung ke Cloudinary.

```ts
export type UnggahSignature = {
  cloudName: string
  apiKey: string
  timestamp: number
  folder: string
  allowedFormats: string[]
  maxFileSize: number
  signature: string
}

export async function getUnggahSignature(): Promise<UnggahSignature> {
  return requestPosApi<UnggahSignature>('/api/v1/unggah', {
    method: 'POST',
    requiresSession: true,
  })
}

// Di Expo: pakai expo-image-picker untuk dapatkan blob, lalu upload ke
// https://api.cloudinary.com/v1_1/<cloudName>/image/upload dengan signature di body form.
```

### 1.7 Identitas App (`src/services/pos/identitas.ts`)

Backend: `/api/v1/identitas`, `/app-icon`, `/manifest`

```ts
export async function fetchIdentitasApp(): Promise<AppIdentity> {
  return requestPosApi<AppIdentity>('/api/v1/identitas', {
    method: 'GET',
    requiresSession: false,
  })
}

// AppIdentity: { namaToko, judulApp, logoUrl, ikonUrl, deskripsiApp }
// Ikon/logo diambil dari expo-secure-store cache atau /app-icon (SVG) + /manifest
```

### 1.8 Notifikasi (`src/services/pos/notifikasi.ts`)

Backend: `GET /api/v1/notifikasi` (role-aware)

```ts
export type NotifikasiItem = {
  id: string
  tipe: string
  judul: string
  deskripsi?: string
  dibaca: boolean
  dibuatPada: string
  data?: Record<string, unknown>
}

export async function fetchNotifikasi(): Promise<NotifikasiItem[]> {
  return requestPosApi<NotifikasiItem[]>('/api/v1/notifikasi', {
    method: 'GET',
    requiresSession: true,
  })
}
```

### 1.9 Update `src/services/pos/index.ts`

Export semua service baru:

```ts
export { unduhStrukPdf, cetakStruk } from './struk'
export type { StrukResult } from './struk'
export {
  fetchPrinterPerangkat,
  daftarPrinter,
  hapusPrinter,
  setDefaultPrinter,
} from './printer'
export type { PerangkatPrinter } from './printer'
export {
  fetchAntreanCetak,
  ambilJobCetak,
  selesaiCetak,
  gagalCetak,
} from './percetakan'
export type { JobCetak } from './percetakan'
export {
  fetchProdukList,
  fetchKategoriList,
  fetchBahanList,
  fetchSupplierList,
} from './master'
export { fetchLaporanPenjualan } from './laporan'
export type { LaporanPenjualan } from './laporan'
export { getUnggahSignature } from './unggah'
export type { UnggahSignature } from './unggah'
export { fetchIdentitasApp } from './identitas'
export { fetchNotifikasi } from './notifikasi'
export type { NotifikasiItem } from './notifikasi'
```

---

## FASE 2 — Antrean Offline (lihat `docs/EXPO.md` §6)

Server sudah support idempotensi (`idempotencyKey`). Yang perlu dibangun di Expo:

1. **Lokasi penyimpanan:** SQLite (`expo-sqlite`) atau `AsyncStorage` (terbatas).
2. **Skema tabel `antrean`:** `id (idempotencyKey)`, `payload (JSON)`, `status (pending/sent/failed)`, `created_at`, `retry_count`.
3. **Write path:** saat transaksi offline, simpan ke antrean dengan `idempotencyKey` unik (crypto.randomUUID), payload termasuk `idempotencyKey`, `dibuatOffline: true`, `waktuKlien: new Date().toISOString()`.
4. **Sync path:** di background task / NetInfo onChange, ambil semua `pending`/`failed`, kirim ke `/api/v1/transaksi` dengan `Authorization: Bearer`. Jika `data.replay === true` → hapus dari antrean (sudah pernah terposting). Jika gagal network → increment retry_count.
5. **Batas:** `waktuKlien` ±24 jam dari jam server (server validasi), semua uang dihitung server (jangan kirim harga/pajak/total yang dihitung klien).

---

## FASE 3 — Lapisan Printer Native (lihat `docs/EXPO.md` §7)

Server sudah siapkan kontrak antrean cetak (`percetakan`). Yang butuh dibangun di Expo:

1. **BLE/Wi-Fi printer:** pakai `react-native-ble-plx` (Bluetooth) atau library printer Wi-Fi. Untuk Android, pertimbangkan `react-native-escpos-printer`.
2. **Render struk:** implementasikan renderer ESC/POS di perangkat (bisa pakai `react-native-escpos-printer` utilitas struk).
3. **Polling cycle:** `fetchAntreanCetak()` → untuk tiap job: `ambilJobCetak()` → render → `selesaiCetak()` atau `gagalCetak()`.
4. **Auto scan perangkat:** setelah login OWNER/KASIR, pindai printer (Android: bonded BLE; iOS: BLE scan), panggil `daftarPrinter()` per perangkat. (Lihat `docs/EXPO.md` §7.1 tabel pemetaan jalur.)

---

## FASE 4 — Environment & Testing

### 4.1 Environment Expo (`E:\code/pos_mobile/.env`)

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:3000
# Android emulator: gunakan 10.0.2.2
# Device fisik: gunakan IP LAN PC tempat backend jalan
```

### 4.2 Backend env (`E:\code/pos/.env.local`) — untuk native auth

```bash
GOOGLE_NATIVE_CLIENT_ID=<native-client-id-android-ios>  # WAJIB: berbeda dari GOOGLE_CLIENT_ID
BETTER_AUTH_URL=http://localhost:3000
TRUSTED_ORIGINS=http://localhost:3000
```

> `GOOGLE_NATIVE_CLIENT_ID` **harus diisi** agar `/api/v1/auth-native` aktif. Bila kosong → `503 NOT_CONFIGURED`.

### 4.3 Test checklist (setelah setiap fase)

```
[ ] fase 0: Login native → dapat session.token → simpan SecureStore
[ ] fase 0: request /api/v1/kasir-data dengan Bearer → 200 ok
[ ] fase 0: kasir dapat data, OWNER/KASIR bisa akses, MEMBER dapat 403
[ ] fase 1: Unduh struk PDF, cetak ulang, kelola printer, daftar produk,
      laporan, unggah foto, identitas app, notifikasi — semua dapat respons envelope benar
[ ] fase 1: KASIR coba akses /produk (write) → harus dapat FORBIDDEN 403
[ ] fase 2: Matikan jaringan, buat transaksi offline, hidupkan → antrean sync
[ ] fase 2: Retry kirim ulang → replay === true, tidak ada transaksi ganda
[ ] fase 4: bunx tsc --noEmit + bun run lint lulus
[ ] fase 4: Test di Android device + Expo Go / dev build
```

---

## FASE 5 — Verifikasi Gate (wajib sebelum "siap")

```bash
# Backend (E:\code/pos)
bunx tsc --noEmit
bun run lint
bun run docs:sync        # pastikan PRD snapshot tidak basi
bun run test:vitest
bun --bun run build
bun run perf:budget

# Mobile client (E:\code/pos_mobile)
bunx tsc --noEmit
bun run lint
bunx expo-doctor
```

---

## Ringkasan Prioritas

| Prioritas   | Tugas                                                                           | Est.     |
| ----------- | ------------------------------------------------------------------------------- | -------- |
| 🔴 Kritis   | Fix auth (auth-native + Bearer)                                                 | 30 menit |
| 🟠 Tinggi   | Service: struk PDF/cetak, printer, percetakan                                   | 1–2jam   |
| 🟡 Sedang   | Service: produk/kategori/bahan/supplier, laporan, unggah, identitas, notifikasi | 1 hari   |
| 🟢 Menengah | Antrean offline (Idempotensi sudah ada di backend)                              | 2 hari   |
| 🔵 Menengah | Printer native layer (BLE/Wi-Fi + ESC/POS render)                               | 2–3 hari |
| ⚪ Rendah   | Push notification (perlu desain tabel + service push)                           | backlog  |

**Patokan utama:** SEMUA perhitungan uang/pajak/diskon dilakukan di server (`postingTransaksi`). Klien (Expo) hanya kirim `items`, `memberId`, `metodeBayar`, `uangDiterima`, dll — jangan kirim `harga`, `pajak`, `diskon` total, atau `total`. Baca `expo_barriers` sebelum menulis kode apapun.
