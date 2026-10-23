-- CreateEnum
CREATE TYPE "SumberTransaksi" AS ENUM ('POS', 'ONLINE');

-- CreateEnum
CREATE TYPE "ViaPembayaran" AS ENUM ('MANUAL', 'WEBHOOK');

-- AlterTable
ALTER TABLE "Transaksi" ADD COLUMN     "dibayarPada" TIMESTAMP(3),
ADD COLUMN     "dibayarVia" "ViaPembayaran",
ADD COLUMN     "paymentRef" TEXT,
ADD COLUMN     "stokTerpotong" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sumber" "SumberTransaksi" NOT NULL DEFAULT 'POS';

-- CreateIndex
CREATE UNIQUE INDEX "Transaksi_paymentRef_key" ON "Transaksi"("paymentRef");

-- CreateIndex
CREATE INDEX "Transaksi_sumber_dibayarPada_idx" ON "Transaksi"("sumber", "dibayarPada");

-- Backfill: transaksi lama dianggap sudah dibayar pada tanggal transaksi.
-- Transaksi tanpa kasir adalah pesanan online lama; stoknya sudah dipotong
-- saat posting (default pengaturan "order"), jadi tandai agar pembatalan
-- tidak memotong/mengembalikan stok dua kali.
UPDATE "Transaksi" SET "dibayarPada" = "tanggal";

UPDATE "Transaksi"
SET "sumber" = 'ONLINE',
    "stokTerpotong" = true
WHERE "kasirId" IS NULL;
