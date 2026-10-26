# Integrasi POS ↔ Expo Mobile — Status, Perbaikan & Langkah Selanjutnya

> Backend: `E:\code\pos` · Aplikasi mobile: `E:\code\pos_mobile` (Expo SDK 58, expo-router).
> Kontrak resmi: `docs/API.md` · Panduan mobile: `docs/EXPO.md` · Guardrails: `mcp-expo.ts` (`expo_barriers`).

---

## 1. Konfigurasi Klien OpenCode (MCP)

Dua server MCP terdaftar untuk membantu agen/LLM membaca dokumen + barriers:

### Project-level: `E:\code\pos/opencode.json` (baru)

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "servers": {
      "pos-expo": {
        "command": "bun",
        "args": ["run", "E:/code/pos/mcp-expo.ts"]
      },
      "pos-backend": {
        "command": "bun",
        "args": ["run", "E:/code/pos/mcp-server.ts"]
      }
    }
  }
}
```

### Global: `C:\Users\humas\.config\opencode\opencode.json` (ditambahkan)

Bagian `mcp.servers` ditambahkan ke konfigurasi global yang sama (dua server di atas).

### Tool yang tersedia lewat MCP `pos-expo`

| Tool               | Berguna untuk                                                             |
| ------------------ | ------------------------------------------------------------------------- |
| `expo_api_docs`    | Baca `docs/API.md` — kontrak REST resmi                                   |
| `expo_expo_docs`   | Baca `docs/EXPO.md` — panduan integrasi mobile                            |
| `expo_prd_ai`      | Baca `docs/PRD-AI.md` — invariant teknis + gate                           |
| `expo_operasional` | Baca `docs/OPERASIONAL.md` — checklist produksi                           |
| `expo_readme`      | Baca `docs/README.md` — indeks dokumen                                    |
| `expo_barriers`    | Baca guardrails keamanan Expo (peran, auth, rate limit, offline, printer) |
| `expo_all_docs`    | Semua di atas dalam satu respons                                          |

Verifikasi: `bunx tsc --noEmit` lulus, dan MCP merespons `initialize`/`tools/list`/`tools/call` dengan benar.

---

## 2. Status Route Backend (semua sudah ada)

Semua endpoint yang `docs/EXPO.md` butuhkan sudah terimplementasi di `src/routes/api/v1/`:

| Kebutuhan mobile                     | Endpoint backend                                                           | Sudah ada?   |
| ------------------------------------ | -------------------------------------------------------------------------- | ------------ |
| Login Google native                  | `POST /api/v1/auth-native`                                                 | ✅           |
| Sesi tanpa cookie jar                | `Authorization: Bearer <token>`                                            | ✅ (kontrak) |
| Master kasir                         | `GET /api/v1/kasir-data`                                                   | ✅           |
| Transaksi POS                        | `POST /api/v1/transaksi`                                                   | ✅           |
| Struk / cetak                        | `GET /api/v1/transaksi/struk/{id}/pdf`, `POST /api/v1/transaksi/cetak/$id` | ✅           |
| Pesanan online                       | `GET/POST /api/v1/pesan`                                                   | ✅           |
| Meja / Modifier (F&B)                | `GET/POST /api/v1/meja`, `GET /api/v1/modifier*`                           | ✅           |
| Produk / kategori / bahan / supplier | `GET/POST/PUT/DELETE /api/v1/produk*`                                      | ✅           |
| Member + riwayat                     | `GET/POST/PUT/DELETE /api/v1/member`, `/member/riwayat`                    | ✅           |
| Shift                                | `GET/POST /api/v1/shift`                                                   | ✅           |
| Retur / opname                       | `/api/v1/retur*`, `/api/v1/opname*`                                        | ✅           |
| Laporan                              | `/api/v1/laporan*`, `/laporan-pajak`, `/laporan-belanja`                   | ✅           |
| Upload foto                          | `POST /api/v1/unggah`                                                      | ✅           |
| Profil                               | `GET /api/v1/saya`                                                         | ✅           |
| Audit log                            | `GET /api/v1/audit-log`                                                    | ✅           |
| Printer perangkat                    | `/api/v1/printer*`, `/api/v1/percetakan*`                                  | ✅           |
| Identitas app                        | `GET /api/v1/identitas`, `/app-icon`, `/manifest`                          | ✅           |
| Antrean offline (idempoten)          | `POST /api/v1/transaksi` + `idempotencyKey`                                | ✅           |
| Health                               | `GET /api/health`                                                          | ✅           |

**Tidak perlu membuat route backend baru.** Semua route yang diperlukan mobile sudah tersedia.

---

## 3. Perbaikan Autentikasi (klien Expo — **SUDAH DIPERBAIKI 2026-10-23**)

Klien Expo di `E:\code/pos_mobile/src/services/pos/` sebelumnya pakai `POST /api/v1/auth-social`

- header `cookie`, yang **bug** karena `auth-social` sengaja tidak kirim `session.token`
  (sejak SEC-25). Sekarang memakai `POST /api/v1/auth-native` + `Authorization: Bearer`,
  sesuai `docs/API.md` §Auth + `docs/EXPO.md` §2.

### 3.1 File yang diubah

| File                         | Perubahan                                                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `src/services/pos/auth.ts`   | Endpoint `POST /api/v1/auth-social` → `POST /api/v1/auth-native`; komentar diperbarui                                |
| `src/services/pos/client.ts` | Hapus import `getSessionCookieName`; hapus header `x-client: expo`; ganti `cookie` → `authorization: Bearer <token>` |
| `src/services/pos/config.ts` | Hapus `getSessionCookieName` + `DEFAULT_SESSION_COOKIE_NAME` (dead code)                                             |
| `src/services/pos/index.ts`  | Hapus re-export `getSessionCookieName`                                                                               |

### 3.2 Verifikasi

- `bunx tsc --noEmit` di `pos_mobile` lulus (tidak ada error)
- `grep` "auth-social", "x-client", "getSessionCookieName", "session_token" di `src/` → **0 hasil** (bebas referensi lama)

---

## 4. Route Backend yang Belum Terpanggil dari Klien Expo

Klien `src/services/pos/index.ts` mengeksport layanan untuk: kasir-data, meja, member, opname, pengaturan, saya, retur, shift, transaksi.

**Belum terpanggil dari klien Expo (ada di backend):**

| Route                                             | Fungsi                                       | Prioritas              |
| ------------------------------------------------- | -------------------------------------------- | ---------------------- |
| `GET /api/v1/transaksi/struk/{id}/pdf`            | Unduh PDF struk                              | Tinggi                 |
| `POST /api/v1/transaksi/cetak/$id`                | Antrekan cetak struk                         | Tinggi                 |
| `GET/POST /api/v1/printer*`                       | Kelola printer perangkat                     | Tinggi                 |
| `GET/POST /api/v1/percetakan*`                    | Antrean cetak                                | Tinggi                 |
| `GET/POST/PUT/DELETE /api/v1/produk`              | Master produk (OWNER)                        | Sedang                 |
| `GET /api/v1/kategori`, `/bahan`, `/supplier`     | Master referensi                             | Sedang                 |
| `GET /api/v1/pesan`, `POST /api/v1/pesan`         | Pesanan online publik                        | Sedang                 |
| `GET /api/v1/laporan-*`                           | Laporan penjualan/pajak                      | Sedang                 |
| `POST /api/v1/unggah`                             | Upload foto produk                           | Sedang                 |
| `GET /api/v1/identitas`, `/app-icon`, `/manifest` | Identitas aplikasi                           | Rendah                 |
| `GET /api/v1/notifikasi`                          | Notifikasi per role                          | Rendah                 |
| `GET /api/v1/modifier*`                           | Modifier F&B                                 | Rendah (jika mode FNB) |
| `POST /api/v1/auth-native`                        | Login native (SEDANG diperbaiki, lihat §3.1) | Kritis                 |

---

## 5. Environment yang Dibutuhkan di Expo (`E:\code\pos_mobile/.env`)

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:3000   # IP LAN backend (bukan localhost di device)
EXPO_PUBLIC_POS_SESSION_COOKIE_NAME=better-auth.session_token  # opsional, default sudah benar
```

Catatan: Android emulator tidak bisa pakai `localhost`; pakai `10.0.2.2` atau IP LAN device.

---

## 6. Langkah Selanjutnya (Checklist)

```
[x] Perbaikan autentikasi Expo **SELESAI** (2026-10-23):
    - auth.ts: ganti /api/v1/auth-social → /api/v1/auth-native
    - client.ts: ganti cookie header → Authorization: Bearer <token>
    - Hapus x-client: expo (bukan security boundary)
[x] Verifikasi token disimpan expo-secure-store (bukan AsyncStorage)
[ ] Uji login Google native di device/emulator (EXPO_PUBLIC_API_BASE_URL = IP LAN)
[ ] Tambah service Expo untuk route yang belum terpanggil (struk PDF, cetak, printer, percetakan, produk, laporan, unggah, identitas, notifikasi)
[ ] Implementasi antrean offline (IndexedDB/SQLite) + idempotencyKey pada retry transaksi
[ ] Implementasi layer printer native (Bluetooth/Wi-Fi) untuk ESC/POS
[ ] Uji semua peran: OWNER, KASIR, MEMBER (guard server sudah menolak akses yang tidak berhak)
[ ] Jalankan bunx tsc --noEmit + bun run lint di pos_mobile sebelum commit
[ ] Bila kontrak API berubah: perbarui docs/API.md di repo backend, lalu gate build/perf:budget
```

---

## 7. Gate Wajib (per AGENTS.md / PRD-AI.md)

Setiap perubahan kode yang menyentuh route/guard/endpoint:

```bash
bunx tsc --noEmit
bun run lint
bun run check
bun run docs:check
bun run test:vitest
bun run test:e2e      # bila route/guard/endpoint berubah
bun --bun run build
bun run perf:budget
```

---

## 8. Cara Menggunakan MCP dari Agen/LLM

```
# Baca kontrak API untuk menambahkan endpoint baru ke Expo:
mcp__pos-expo__expo_api_docs

# Baca barriers sebelum mengubah fitur mobile:
mcp__pos-expo__expo_barriers

# Baca semua dokumen sekaligus:
mcp__pos-expo__expo_all_docs

# Baca skema Prisma (backend):
mcp__pos-backend__pos_schema
```

---

**Ringkasan:** MCP klien sudah terkonfigurasi (project + global, termasuk firecrawl/tavily/exa).
Semua route backend sudah siap. **Perbaikan autentikasi Expo sudah dilakukan** (auth-native + Bearer,
typecheck lulus). Fokus selanjutnya: tambah service Expo untuk route struk/printer/laporan
yang belum terpanggil, lalu uji di device.
