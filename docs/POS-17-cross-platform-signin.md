# POS-17 — Cross-platform sign-in (opsional, low)

> Status: **desain awal, sudah diimplementasikan dan direvisi.** Kontrak aktif
> ada di [`API.md`](API.md) dan [`EXPO.md`](EXPO.md). Sejak SEC-25
> (2026-10-23), token native hanya keluar dari `POST /api/v1/auth-native`
> dengan verifikasi `aud` client native; `x-client` tidak dipakai lagi.

## Latar belakang

Web (TanStack Start) sudah support Google OAuth via redirect flow (`GET /api/auth/sign-in/social` → callback). Mobile Expo (jika ditambahkan di masa depan) tidak boleh pakai WebView redirect, jadi butuh endpoint **POST** yang menerima Google `idToken`/`accessToken` dari native sign-in, lalu menukarkannya ke sesi cookie Better Auth yang sama.

Endpoin ini akan didokumentasikan di `docs/API.md` bagian "Expo (fetch, tanpa WebView redirect)" yang sudah ada baris 29–47.

## Desain endpoint

```
POST /api/auth/sign-in/social
Content-Type: application/json
Body:
{
  provider: 'google',
  idToken: string,        // Google ID JWT (native sign-in hasil)
  accessToken?: string,   // Google access token (opsional, untuk profil)
  callbackURL?: string,   // default '/'
}
```

Alur server-side:

1. Validasi body via zod schema (`provider === 'google'`, `idToken` wajib).
2. Verifikasi `idToken` ke Google tokeninfo endpoint:
   `GET https://oauth2.googleapis.com/tokeninfo?id_token=<idToken>`
   - Pastikan `aud` === `GOOGLE_CLIENT_ID`.
   - Pastikan `iss` === `accounts.google.com` atau `https://accounts.google.com`.
   - Ambil `email`, `email_verified`, `name`, `picture`, `sub` (Google user ID).
3. Jika `email_verified !== true` → 400 `BAD_REQUEST` "Email belum diverifikasi Google".
4. Cari `Account` di DB dengan `provider='google'` dan `providerAccountId = sub`.
   - Jika ada → ambil `User` terkait.
   - Jika tidak ada → cari `User` by email. Jika ada → link Account baru. Jika tidak → buat `User` baru (role via `OWNER_EMAILS`) + `Account` baru.
5. Buat session Better Auth untuk user tersebut (`auth.api.createSession` / `signIn` internal sesuai versi better-auth yang terpasang).
6. Set cookie sesi di response (mirip `tanstackStartCookies` plugin).
7. Return envelope sukses `{ ok: true, data: { user, session } }`.

Error handling (pesan aman, tanpa bocoran DB):

- `UNAUTHORIZED` (401) — token invalid / expired / aud mismatch.
- `BAD_REQUEST` (400) — body tidak valid / email belum diverifikasi.
- `UNKNOWN` (500) — pesan umum + ref log.

## File yang perlu dibuat/diubah (saat kredensial tersedia)

| File                                      | Aksi                                                                                                       |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `src/routes/api/v1/auth-social.ts` (baru) | Route REST: guard opsional (publik), parse body → panggil `src/server/auth-social.ts` → envelope.          |
| `src/server/auth-social.ts` (baru)        | Logika murni: verifikasi token Google, find/create user & account, buat session. Unit-testable tanpa HTTP. |
| `src/server/auth-socialFn.ts` (baru)      | `createServerFn` wrapper: validasi + panggil fungsi murni. (Opsional, jika dipakai route TanStack Start.)  |
| `docs/API.md`                             | Detail endpoint POST + contoh request/response.                                                            |
| `docs/DAFTAR-TUGAS.md`                    | Tandai POS-17 `[x]` saat selesai.                                                                          |

## Contoh penggunaan Expo

```ts
// 1. Native Google sign-in via expo-auth-session / @react-native-google-signin
//    → idToken, accessToken
// 2. Tukarkan ke sesi Better Auth:
const r = await fetch(`${BASE}/api/auth/sign-in/social`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    provider: 'google',
    idToken, // string JWT
    accessToken, // opsional
    callbackURL: '/',
  }),
})
// 3. Selanjutnya sertakan cookie (credentials: 'include')
//    + persist via expo SecureStore / react-native-cookies.
```

## Prasyarat (POS-11, owner action)

- [ ] OAuth 2.0 client Web di Google Cloud Console, redirect URI `http://localhost:3000/api/auth/callback/google`.
- [ ] `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` di `.env.local`.
- [ ] `OWNER_EMAILS` di `.env.local`.
- [ ] `BETTER_AUTH_URL` di `.env.local` (mis. `http://localhost:3000`).

## Verifikasi (setelah kredensial tersedia)

1. `bunx tsc --noEmit` → lolos.
2. `bun run lint` → 0 error.
3. `bun --bun run build` → lolos.
4. Manual: native sign-in (atau simulasi POST dengan idToken palsu yang valid) → sesi terbuat, cookie diterima, `GET /api/auth/get-session` mengembalikan user dengan role yang benar.
5. Unit test `src/server/auth-social.ts` (mock fetch ke Google tokeninfo): happy path, token invalid, email belum diverifikasi, aud mismatch.

## Catatan

- Tidak ada project Expo di repo saat ini (web-only). Endpoint ini disiapkan agar siap saat Expo ditambahkan.
- Tidak menulis implementasi code sebelum `GOOGLE_CLIENT_ID`/`SECRET` tersedia dan bisa diuji live.
