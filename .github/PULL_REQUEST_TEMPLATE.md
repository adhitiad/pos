## Ringkasan

<!-- Apa yang berubah dan mengapa. Tautkan issue: Closes #123 -->

## Jenis perubahan

- [ ] Perbaikan bug
- [ ] Fitur baru
- [ ] Refactor / pemeliharaan
- [ ] Dokumentasi
- [ ] CI/CD
- [ ] Keamanan

## Gate wajib

- [ ] `bun run typecheck`
- [ ] `bun run lint`
- [ ] `bun run check`
- [ ] `bun run test:coverage`
- [ ] `bun run test:e2e` (wajib bila menyentuh UI, API, auth, atau DB)
- [ ] `bun --bun run build`
- [ ] `bun run ci` lulus lokal (atau jelaskan bagian yang tidak relevan)

## Database & migrasi

- [ ] Tidak ada perubahan skema
- [ ] Ada migrasi baru di `prisma/migrations/` dan sudah diuji dengan `db:migrate:deploy`
- [ ] Data seed tidak diubah / perubahan seed dijelaskan
- [ ] Tidak memakai `db:push` untuk perubahan yang akan dirilis

Catatan migrasi (backfill, downtime, rollback):

## UI, i18n, dan dokumentasi

- [ ] Tidak ada teks UI baru
- [ ] Key i18n ditambahkan ke `messages/en.json`, `id.json`, `zh.json`, dan `ko.json`
- [ ] `docs/API.md` diperbarui bila kontrak API berubah
- [ ] `docs/DAFTAR-TUGAS.md` diperbarui bila menyelesaikan item tugas
- [ ] Screenshot/rekaman UI dilampirkan (sebelum/sesudah)

## Keamanan

- [ ] Tidak ada secret, token, atau data pelanggan di diff/log
- [ ] Otorisasi dan validasi input ditinjau untuk endpoint baru
- [ ] Tidak menambah dependency tanpa alasan yang dijelaskan

## Cara menguji

<!-- Langkah reproduksi atau perintah yang dijalankan reviewer. -->
