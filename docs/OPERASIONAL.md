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
      `OWNER_EMAILS`, `TRUSTED_ORIGINS`. `TRUST_PROXY` otomatis `true` bila
      `VERCEL=1` (set `TRUST_PROXY=false` hanya untuk mematikan IP tracking
      eksplisit); `TRUST_PROXY_HOPS=1` sesuai satu lapis proxy Vercel. Secret
      migrasi
      `DATABASE_URL_UNPOOLED` disimpan di GitHub environment `production`.
      `PAYMENT_WEBHOOK_SECRET` (min. 16 karakter) wajib diisi hanya bila webhook
      payment gateway diaktifkan; bila kosong endpoint webhook membalas 503.
      `CRON_SECRET` (min. 16 karakter, acak) wajib diisi agar Vercel Cron
      mengirim `Authorization: Bearer <CRON_SECRET>` ke route cron; bila kosong
      route membalas 503. `FRAUD_WEBHOOK_URL` opsional untuk meneruskan alert
      fraud ke Slack/Discord/kanal lain.
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
- **Cron**: `vercel.json` menjadwalkan
  `GET /api/cron/pembayaran-kadaluarsa` tiap 15 menit untuk membatalkan pesanan
  online yang belum dibayar >45 menit (membebaskan meja). Plan Vercel Hobby
  membatasi frekuensi/kuota cron; bila jadwal ditolak, pakai Plan Pro atau
  pemanggil eksternal dengan header Bearer yang sama. Notifikasi lain tetap
  dihitung per request.
- **Service worker**: hanya aktif di build produksi. `sw.js` + `/sw-manifest.js`
  (dihasilkan plugin Vite) mem-precache aset ber-hash dan halaman publik
  (`/`, `/pesanan`, `/login`); respons `/api/**` tidak pernah di-cache. Setelah
  deploy, lakukan hard reload sekali untuk memastikan SW versi baru mengambil
  alih; rollback aplikasi tetap aman karena aset ber-hash dan HTML bersifat
  network-first.

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
`pengajuan_pengeluaran` + `notifikasi` + enum `StatusPengajuan`),
`20261022094437_add_nominal_disetujui` (kolom `nominalDisetujui`), dan
`20261026090000_add_indexes_part2` (nama tabel `notifikasi`/`pesanan_draf`
sempat salah huruf besar; `CREATE INDEX IF NOT EXISTS` membuat sebagian index
sudah terpasang sebelum gagal — perbaiki SQL, `migrate resolve --rolled-back`,
lalu deploy ulang; index yang sudah ada dilewati).

Drift nama tabel (bukan migrasi gagal): `20261023160000` membuat
`"DraftTransaksi"`/`"TransaksiReviewAudit"`, sedangkan schema memakai
`draft_transaksi`/`transaksi_review_audit`. Migrasi
`20261026100000_fix_draft_review_table_names` memperbaikinya secara aditif —
rename bila versi snake_case belum ada, hapus versi PascalCase hanya bila
kosong, dan berhenti dengan `RAISE EXCEPTION` bila kedua versi berisi data
(gabungkan manual, jangan reset DB). Setelah menambah/mengubah migrasi, cek
`prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma
--script --exit-code`; hasil harus `-- This is an empty migration.`

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
- [ ] Uji beban checkout sebelum rilis besar: `bun run test:load` (butuh
      [k6](https://k6.io/docs/get-started/installation/) dan dev/staging server
      hidup). Wrapper membuat sesi KASIR sementara, menjalankan
      `tests/load/checkout.js` (default 10 VU × 5 iterasi), lalu menghapus sesi.
      Sesuaikan `VUS`/`ITERASI`/`STOK_MIN`/`BASE_URL`; ambang lalai
      `http_req_failed < 1%`, p95 < 1,5 s, p99 < 3 s. Jalankan pada data uji,
      bukan produksi.

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
- Rate limit login sudah lintas instance: Better Auth memakai token bucket
  PostgreSQL yang sama dengan endpoint lain (`/sign-in*` 5/menit, `/sign-up*`
  3/menit, `/callback*` 20/menit). Tidak perlu Redis; cukup pastikan
  `TRUST_PROXY`/`TRUST_PROXY_HOPS` benar agar kuncinya per IP nyata.
- Dine-in publik hanya menerima `mejaToken` QR. Bila ada meja tanpa QR, kasir
  memilihkan meja saat finalisasi draft (`POST /api/v1/pesan-dinein/{id}/finalisasi`
  dengan body `{ mejaId }`); meja harus aktif.
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
