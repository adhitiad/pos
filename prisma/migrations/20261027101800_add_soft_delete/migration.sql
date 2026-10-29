-- Tambahkan kolom `deletedAt` untuk soft delete pada tabel Transaksi, Produk,
-- dan Meja. Semua perintah idempoten (IF NOT EXISTS / IF EXISTS) agar aman
-- di DB yang sudah memiliki kolom maupun yang belum.
--
-- Catatan: prisma migrate dev tidak bisa dijalankan di dev DB ini karena
-- ada drift schema yang sudah ada (migrasi fix_draft_review_table_names
-- terapply di DB tapi hilang dari lokal, dan add_nominal_disetujui dimodifikasi
-- setelah diapply). File ini diciptakan sebagai sumber kebenaran migrasi; baru
-- akan diterapkan (bun run db:migrate:deploy) setelah drift diatasi.

ALTER TABLE "Transaksi" ADD COLUMN IF NOT EXISTS "deletedAt" timestamp(3);

CREATE INDEX IF NOT EXISTS "Transaksi_deletedAt_idx" ON "Transaksi"("deletedAt");

ALTER TABLE "Produk" ADD COLUMN IF NOT EXISTS "deletedAt" timestamp(3);

CREATE INDEX IF NOT EXISTS "Produk_deletedAt_idx" ON "Produk"("deletedAt");

ALTER TABLE "Meja" ADD COLUMN IF NOT EXISTS "deletedAt" timestamp(3);

CREATE INDEX IF NOT EXISTS "Meja_deletedAt_idx" ON "Meja"("deletedAt");
