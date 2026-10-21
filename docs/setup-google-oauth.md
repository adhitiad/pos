# Setup Google OAuth — langkah klik

> 5 menit. Yang butuh akun Google Anda: langkah 1–4. Sisanya sudah disiapkan di repo.

## 1. Buat project (sekali saja)

1. Buka <https://console.cloud.google.com/> → pilih/kreasikan project (mis. `pos-toko`).
2. **APIs & Services → OAuth consent screen** → User type **External** → Create.
3. Isi: App name (`POS Toko`), User support email (email Anda), Developer contact (email Anda) → Save.
4. **Audience → Test users → Add users**: tambahkan email Google yang akan login (wajib selama status Testing).

## 2. Buat OAuth client

1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Application type: **Web application**. Name: `pos-local`.
3. **Authorized redirect URIs → Add URI**:
   - `http://localhost:3000/api/auth/callback/google`
   - (nanti production, mis. `https://toko-anda.vercel.app/api/auth/callback/google`)
4. Create → salin **Client ID** dan **Client secret**.

## 3. Isi `.env.local`

```env
GOOGLE_CLIENT_ID="<paste-client-id>"
GOOGLE_CLIENT_SECRET="<paste-client-secret>"
OWNER_EMAILS="email-owner@gmail.com"
```

`OWNER_EMAILS` boleh beberapa, pisahkan koma. Email di sini otomatis jadi `OWNER` saat pertama login; user lain jadi `MEMBER`.

## 4. Restart dev server & verifikasi

```bash
bun --bun run dev
```

1. Buka `http://localhost:3000/login` → klik **Masuk dengan Google** → pilih akun.
2. Berhasil → mendarat di `/kasir`, avatar + nama tampil di header (kanan atas di `/`).
3. Buka `/buku-besar`:
   - login sebagai **OWNER** → halaman terbuka.
   - login sebagai **MEMBER/KASIR** → dilempar ke `/kasir` (buku besar owner-only).
4. Cek role di DB bila perlu: `bun run db:studio` → tabel `user` → kolom `role`.

## Troubleshooting

| Gejala                                     | Penyebab umum                                                                                                     |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `redirect_uri_mismatch` (error 400 Google) | Redirect URI di console beda satu karakter. Samakan persis, tanpa trailing slash. Tunggu ±5 menit propagasi.      |
| `Access blocked: unverified app`           | App masih Testing → hanya Test users yang bisa login. Tambahkan email di Audience, atau lanjutkan verifikasi app. |
| Loop login / session null                  | `BETTER_AUTH_SECRET` kosong atau `BETTER_AUTH_URL` bukan `http://localhost:3000`.                                 |
| Semua user jadi MEMBER                     | `OWNER_EMAILS` kosong/typo. Perbaiki, lalu update manual via Studio, atau hapus user & login ulang.               |
