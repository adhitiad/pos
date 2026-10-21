-- AlterTable
ALTER TABLE "PembelianBahan" ADD COLUMN     "sumberBelanja" TEXT NOT NULL DEFAULT 'SUPPLIER',
ADD COLUMN     "tempatBelanja" TEXT;

-- CreateIndex
CREATE INDEX "PembelianBahan_sumberBelanja_idx" ON "PembelianBahan"("sumberBelanja");
