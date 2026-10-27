-- Rapikan drift antara migrations dan schema.prisma (ditemukan CI 2026-10-27).
-- `prisma migrate diff --from-migrations --to-schema` masih melaporkan 4 beda:
--
--   1. Index "Transaksi_statusKasirReview_idx" dibuat migrasi
--      20261023150000, tetapi @@index([statusKasirReview]) sudah tidak ada di
--      schema → index ikut terlanjur ada di DB baru.
--   2. draft_transaksi."updatedAt" masih punya DEFAULT CURRENT_TIMESTAMP,
--      sedangkan schema hanya memakai @updatedAt (tanpa @default(now())).
--   3. pesanan_draf."subtotal" masih punya DEFAULT 0 (schema tanpa default).
--   4. pesanan_draf."updatedAt" masih punya DEFAULT CURRENT_TIMESTAMP (sama
--      seperti poin 2).
--
-- Nilai kolom ditulis aplikasi (Prisma Client selalu mengirim updatedAt &
-- subtotal), jadi menghapus default DB tidak mengubah data/behavior.
-- Semua perintah idempoten agar aman di DB yang sudah sesuai maupun yang masih
-- membawa default lama.

DROP INDEX IF EXISTS "Transaksi_statusKasirReview_idx";

ALTER TABLE "draft_transaksi" ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "pesanan_draf" ALTER COLUMN "subtotal" DROP DEFAULT;

ALTER TABLE "pesanan_draf" ALTER COLUMN "updatedAt" DROP DEFAULT;
