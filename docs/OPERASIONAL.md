# Operasional Produksi — Checklist

> Ditulis 2026-10-19 (OBS-01). PITR/restore, uptime monitor/alert, dan
> observability masih menunggu konfigurasi serta bukti verifikasi; pelacakannya
> ada di `docs/DAFTAR-TUGAS.md` (CICD-17 / OBS-02).

## 1. Neon (database)

- [ ] Aktifkan **point-in-time restore / backup** di konsol Neon (Project → Settings).
      Free plan: retensi ~24 jam; naikkan bila transaksi sudah berjalan penuh.
- [ ] Uji restore **sekali**: Branches → Restore ke titik waktu lama, cek tabel inti
      (`Transaksi`, `Jurnal`), lalu hapus branch uji. Backup yang belum pernah
      dites = belum ada backup.
- [ ] Deploy produksi lewat GitHub Actions `deploy-production.yml`
      (`workflow_dispatch`, environment `production`, branch policy `main`),
      bukan push ke `main`. Required reviewer mengikuti plan GitHub; repo private
      Free belum mendukung. Panduan lengkap: [`docs/DEPLOY.md`](DEPLOY.md).
- [ ] Environment Vercel Production: `DATABASE_URL` (pooled, runtime),
      `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`,
      `GOOGLE_NATIVE_CLIENT_ID` (opsional, untuk login Expo native),
      `OWNER_EMAILS`, `TRUSTED_ORIGINS`, `TRUST_PROXY=true`,
      `TRUST_PROXY_HOPS=1`. Secret migrasi
      `DATABASE_URL_UNPOOLED` disimpan di GitHub environment `production`.
      `PAYMENT_WEBHOOK_SECRET` (min. 16 karakter) wajib diisi hanya bila webhook
      payment gateway diaktifkan; bila kosong endpoint webhook membalas 503.
- Skema produksi **hanya** lewat migration (`bun run db:migrate:deploy`), bukan `db:push`.
- Auto-deploy `main` Vercel dimatikan (`vercel.json` →
  `git.deploymentEnabled.main = false`). Workflow menjalankan migrasi lebih dulu,
  baru deploy aplikasi, lalu smoke test.
- Vercel: `vercel.json` memakai `bun install`, `NITRO_PRESET=vercel`, runtime Bun 1.x.
- Netlify: `netlify.toml` tetap ada sebagai cadangan, bukan alur produksi aktif.
- `BETTER_AUTH_URL` dan `TRUSTED_ORIGINS` memakai domain produksi; callback Google:
  `https://<domain>/api/auth/callback/google`.
- Preview PR memakai Vercel Preview environment dan database terpisah; jangan pakai
  database produksi.
- Tidak ada cron karena notifikasi dihitung per request.

### Recovery saat migrasi gagal di tengah jalan

Kalau `bun run db:migrate:deploy` berhenti setelah sebagian DDL terpasang (mis.
tabel sudah dibuat tapi enum belum), migrasi itu tertahan: `migrate deploy`
berikutnya selalu gagal di langkah yang sama. Recovery (jangan `DROP SCHEMA` —
database produksi berisi data):

1. `bun run db:migrate:status` — lihat migrasi mana yang menggantung.
2. Buang objek yang dibuat migrasi tersebut (tabel/enum/constraint) via SQL.
3. Tandai migrasi itu belum berhasil:
   `bunx prisma migrate resolve --rolled-back <nama_folder_migrasi>`
4. Jalankan ulang `bun run db:migrate:deploy` dari kondisi bersih.

Kasus di repo ini: `20261022161956_add_pengajuan_dan_notifikasi` (tabel
`PengajuanPengeluaran` + `Notifikasi` + enum `StatusPengajuan`) dan
`20261022094437_add_nominal_disetujui` (kolom `nominalDisetujui`).

## 2. Uptime monitor

- [ ] Pantau `GET /api/health` (publik, rate limit 60/menit) tiap 1–5 menit via
      UptimeRobot / Better Stack / Healthchecks.io. Respons
      `{ "database": "ok", "app": "healthy" }`; HTTP 503 saat database gagal.
- [ ] Alert ke email/WhatsApp yang benar-benar dibaca; uji sekali dengan sengaja
      mematikan deploy.

## 2b. Performa produksi

- [ ] Setelah deploy, ukur LCP/INP/CLS p75 dan p95 API baca/tulis; bandingkan
      dengan anggaran di [`PERFORMA.md`](PERFORMA.md). Jangan mengklaim target
      tercapai tanpa data.
- [ ] Jalankan `bun --bun run build` + `bun run perf:budget` pada commit yang
      akan dideploy; over budget berarti perbaiki dulu.
- [ ] Pantau cold start Vercel dan query lambat di log; catat perubahan baseline
      bila memang disengaja.

## 3. Error monitoring (OBS-02)

- Belum dipasang atau diverifikasi (butuh penyedia yang dipilih, akun, dan DSN).
  Kandidat: Sentry atau GlitchTip; integrasi aplikasi belum tersedia.
- Sementara ini: galat server sudah ter-log pino dengan `ref` unik yang bisa dicari
  di log Vercel (`{"level":50,...,"ref":"..."}`).
- Sebelum checklist ditandai selesai, kirim event uji dari deployment yang
  dituju, pastikan event muncul di proyek yang benar, dan buktikan `ref` log
  dapat dikorelasikan tanpa mengirim secret atau data pelanggan.

## 4. Rutin

- Deploy produksi: `gh workflow run deploy-production.yml` dari `main`
  (setujui environment bila reviewer aktif). Workflow menjalankan `db:migrate:deploy` →
  `db:migrate:status` → deploy Vercel → smoke test. Jangan deploy lewat push `main`.
- Jangan pernah menjalankan `db:seed` di produksi.
- Smoke test manual: `bash scripts/smoke-deploy.sh https://<domain-produksi>`.
- Rollback aplikasi: promote deployment Vercel sebelumnya. Rollback DB: pola
  expand/contract atau restore PITR Neon — lihat [`docs/DEPLOY.md`](DEPLOY.md).
- Backup manual berkala (opsional): `pg_dump` memakai `DATABASE_URL_UNPOOLED`.

## 5. Lokal: port dev server e2e (`:3100`)

- `bun run test:e2e` memakai port khusus `:3100` (`playwright.config.ts`), terpisah
  dari dev server manual `:3000`, agar state dev tidak mengacaukan tes.
- Di CI, Playwright **selalu** menyalakan server baru di `:3100`
  (`reuseExistingServer: false`). Di lokal, server yang sudah hidup di `:3100`
  boleh dipakai ulang.
- Bila port `:3100` sudah dipakai proses lain, hentikan proses itu. Jangan
  mengarahkan e2e ke `:3000`; ubah `PORT_E2E` bila perlu port lain.
