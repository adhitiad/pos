-- AlterTable
ALTER TABLE "Transaksi" ADD COLUMN "statusKasirReview" TEXT NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "Transaksi_statusKasirReview_idx" ON "Transaksi"("statusKasirReview");
