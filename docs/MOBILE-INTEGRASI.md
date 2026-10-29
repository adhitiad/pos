# Integrasi POS ↔ Expo Mobile — Status, Perbaikan & Langkah Selanjutnya

> Backend: `E:\code\pos` · Aplikasi mobile: `E:\code\pos_mobile` (Expo SDK 58, expo-router).
> Kontrak resmi: `docs/API.md` · Panduan mobile: `docs/EXPO.md` · Guardrails: `mcp/server-expo.ts` (`expo_barriers`).

---

## 1. Konfigurasi Klien OpenCode (MCP)

Dua server MCP lokal membaca repo ini langsung, sehingga pengembang
`pos_mobile` tidak perlu menebak path dokumen atau kode backend:

| Server        | Isi                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------- |
| `pos-backend` | `docs/**`, `src/**` (khususnya `src/server/**`), skema Prisma, daftar endpoint            |
| `pos-expo`    | Dokumen kontrak + barriers Expo, DAN tool baca repo yang sama (`docs/**`, `src/**`, dll.) |

### Bentuk konfigurasi yang benar (OpenCode V2)

Setiap server ada di bawah `mcp.servers`, wajib punya `type`, dan `command`
berupa **array** (executable + argumen) — `args` terpisah ala V1 tidak dikenali
dan server dilewati dengan peringatan `skipped malformed recognized value`.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "servers": {
      "pos-expo": {
        "type": "local",
        "command": ["bun", "run", "E:/code/pos/mcp/server-expo.ts"]
      },
      "pos-backend": {
        "type": "local",
        "command": ["bun", "run", "E:/code/pos/mcp/server-backend.ts"]
      }
    }
  }
}
```

Konfigurasi yang sama ada di:

- `E:\code\pos\opencode.json` (project backend)
- `E:\code\pos_mobile\opencode.json` (project mobile — dipakai saat mengembangkan Expo)
- `C:\Users\humas\.config\opencode\opencode.json` (global, untuk proyek lain)

Kode MCP ada di `E:\code\pos\mcp\` (`stdio.ts` = transport, `repo.ts` = tool
berkas, `server-backend.ts`, `server-expo.ts`). Direktori `mcp/` beserta
`tests/vitest/mcp.test.ts` **tidak di-commit** (`.gitignore`) — keduanya
khusus dev. API key remote (`firecrawl`, `tavily`, `exa`) dibaca dari berkas
terpisah di `~/.config/opencode/secrets/` lewat substitusi `{file:...}`.

### Tool yang tersedia

Tool dokumen (server `pos-expo`):

| Tool               | Berguna untuk                                                             |
| ------------------ | ------------------------------------------------------------------------- |
| `expo_api_docs`    | Baca `docs/API.md` — kontrak REST resmi                                   |
| `expo_expo_docs`   | Baca `docs/EXPO.md` — panduan integrasi mobile                            |
| `expo_prd_ai`      | Baca `docs/PRD-AI.md` — invariant teknis + gate                           |
| `expo_operasional` | Baca `docs/OPERASIONAL.md` — checklist produksi                           |
| `expo_readme`      | Baca `docs/README.md` — indeks dokumen                                    |
| `expo_barriers`    | Baca guardrails keamanan Expo (peran, auth, rate limit, offline, printer) |
| `expo_all_docs`    | Semua di atas dalam satu respons                                          |

Tool baca repo (tersedia di `pos-expo` dan `pos-backend`):

| Tool              | Fungsi                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------ |
| `repo_list_files` | Daftar berkas di `docs/`, `src/`, `prisma/`, `tests/`, `scripts/`, `messages/`, `.agents/` |
| `repo_read_file`  | Baca satu berkas relatif akar repo, mis. `src/server/kasir.ts`                             |
| `repo_search`     | Cari teks (case-insensitive) dan kembalikan `path:baris`                                   |

Tool dokumen/skema backend (`pos-backend`): `pos_schema`, `pos_schema_summary`,
`pos_api_docs`, `pos_server_files`, `pos_server_file`, `pos_env`,
`pos_project_info`.

Batas keamanan tool repo: path absolut, `..`, symlink, dan berkas `.env*`
(di luar `.env.example`) ditolak; berkas > 512 KB dipotong.

### Verifikasi dan troubleshooting

```bash
opencode mcp list          # semua server harus "connected"
bunx vitest run tests/vitest/mcp.test.ts   # regresi framing + tool repo
```

Penyebab kegagalan yang sudah diperbaiki (MCP-03):

1. **Framing salah** — server membalas dengan `Content-Length: N\r\n\r\n{…}`
   (framing LSP). MCP stdio wajib satu pesan JSON per baris, sehingga klien
   tidak pernah menerima balasan `initialize` dan koneksi berakhir
   `failed: Request timed out`. Transport bersama sekarang ada di
   `mcp/stdio.ts`; jangan menambahkan header apa pun ke stdout.
2. **Bentuk konfigurasi V1** — `command` string + `args`, atau entri `url`
   tanpa `type: "remote"`, dilewati OpenCode; lihat
   `configuration normalization diagnostic` di
   `~/.local/share/opencode/log/opencode.log`.
3. **Trailing comma** di `pos_mobile/opencode.json` membuat entri `playwright`
   dianggap malformed.
4. **Nama paket salah** — `sequential-thinking` memakai
   `@anthropic/sequential-thinking-mcp` (404 di npm); diganti
   `@modelcontextprotocol/server-sequential-thinking`.

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

Saat Code Mode aktif (default), tool MCP dipanggil lewat `tools.<server>.<tool>`
di dalam `execute`; nama pada katalog mengikuti `<server>_<tool>`.

```
# Baca kontrak API untuk menambahkan endpoint baru ke Expo:
tools["pos-expo"].expo_api_docs()

# Baca barriers sebelum mengubah fitur mobile:
tools["pos-expo"].expo_barriers()

# Baca semua dokumen sekaligus:
tools["pos-expo"].expo_all_docs()

# Baca skema Prisma (backend):
tools["pos-backend"].pos_schema()

# Cari implementasi endpoint di backend:
tools["pos-backend"].repo_search({ query: "auth-native", dir: "src/routes/api/v1" })

# Baca berkas sumber tertentu:
tools["pos-expo"].repo_read_file({ path: "src/server/auth-native.ts" })
```

---

**Ringkasan:** MCP klien sudah terkonfigurasi (project + global, termasuk firecrawl/tavily/exa).
Semua route backend sudah siap. **Perbaikan autentikasi Expo sudah dilakukan** (auth-native + Bearer,
typecheck lulus). Fokus selanjutnya: tambah service Expo untuk route struk/printer/laporan
yang belum terpanggil, lalu uji di device.
