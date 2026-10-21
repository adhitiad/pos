# Operasional Produksi — Checklist

> Ditulis 2026-10-19 (OBS-01). Item Sentry menyusul sebagai OBS-02 di `docs/DAFTAR-TUGAS.md`.

## 1. Neon (database)

- [ ] Aktifkan **point-in-time restore / backup** di konsol Neon (Project → Settings).
      Free plan: retensi ~24 jam; naikkan bila transaksi sudah berjalan penuh.
- [ ] Uji restore **sekali**: Branches → Restore ke titik waktu lama, cek tabel inti
      (`Transaksi`, `Jurnal`), lalu hapus branch uji. Backup yang belum pernah
      dites = belum ada backup.
- [ ] Deploy dari GitHub: hubungkan repo ke Vercel **atau** Netlify (Import Git
      Repository), lalu push ke `main` untuk build otomatis. Tidak perlu CLI lokal.
- [ ] Environment Vercel/Netlify: `DATABASE_URL` (pooled, runtime) + `DATABASE_URL_UNPOOLED`
      (direct, untuk `db:migrate:deploy`), `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`,
      `GOOGLE_CLIENT_ID/SECRET`, `OWNER_EMAILS`, `TRUSTED_ORIGINS`, `TRUST_PROXY=true`.
- Skema produksi **hanya** lewat migration (`bun run db:migrate:deploy`), bukan `db:push`.
- Build provider **tidak** menjalankan migration. Jalankan migration lebih dulu dari
  terminal/CI yang memakai env produksi (`.env.local` sementara berisi
  `DATABASE_URL_UNPOOLED` Neon produksi).
- Vercel: `vercel.json` memakai `bun install`, `NITRO_PRESET=vercel`, runtime Bun 1.x.
- Netlify: `netlify.toml` memakai Bun 1.4.2, `NITRO_PRESET=netlify`, publish `dist`,
  dan rewrite semua path ke `/.netlify/functions/server`.
- `BETTER_AUTH_URL` dan `TRUSTED_ORIGINS` memakai domain produksi; callback Google:
  `https://<domain>/api/auth/callback/google`.
- Preview deployment memakai env Preview — arahkan ke database terpisah bila perlu.
- Keduanya memakai Postgres yang sama; tidak ada cron karena notifikasi dihitung per request.

## 2. Uptime monitor

- [ ] Pantau `GET /api/health` (publik, rate limit 60/menit) tiap 1–5 menit via
      UptimeRobot / Better Stack / Healthchecks.io. Respons
      `{ "database": "ok", "app": "healthy" }`; HTTP 503 saat database gagal.
- [ ] Alert ke email/WhatsApp yang benar-benar dibaca; uji sekali dengan sengaja
      mematikan deploy.

## 3. Sentry (menyusul — OBS-02)

- Belum dipasang (butuh akun + DSN). Rencana: `@sentry/tanstackstart-react`, init
  env-gated `SENTRY_DSN`.
- Sementara ini: galat server sudah ter-log pino dengan `ref` unik yang bisa dicari
  di log Vercel (`{"level":50,...,"ref":"..."}`).

## 4. Rutin

- Deploy via GitHub hanya membangun aplikasi; migration **tidak** otomatis.
  Jalankan `bun run db:migrate:deploy` dengan env produksi sebelum deploy yang
  membawa migration baru, lalu verifikasi `bun run db:migrate:status` = "up to date".
- Backup manual berkala (opsional): `pg_dump` memakai `DATABASE_URL_UNPOOLED`.

## 5. Lokal: port dev server e2e (`:3100`)

- `bun run test:e2e` memakai port khusus `:3100` (`playwright.config.ts`), terpisah
  dari dev server manual `:3000`, agar state dev tidak mengacaukan tes.
- Di CI, Playwright **selalu** menyalakan server baru di `:3100`
  (`reuseExistingServer: false`). Di lokal, server yang sudah hidup di `:3100`
  boleh dipakai ulang.
- Bila port `:3100` sudah dipakai proses lain, hentikan proses itu. Jangan
  mengarahkan e2e ke `:3000`; ubah `PORT_E2E` bila perlu port lain.
