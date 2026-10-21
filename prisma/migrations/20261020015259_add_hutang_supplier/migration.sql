-- AlterTable
ALTER TABLE "PembelianBahan" ADD COLUMN     "belumDibayar" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "pembayaran_hutang" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "pembelianBahanId" TEXT NOT NULL,
    "jumlah" DECIMAL(14,2) NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pembayaran_hutang_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pembayaran_hutang_supplierId_idx" ON "pembayaran_hutang"("supplierId");

-- CreateIndex
CREATE INDEX "pembayaran_hutang_pembelianBahanId_idx" ON "pembayaran_hutang"("pembelianBahanId");

-- CreateIndex
CREATE INDEX "pembayaran_hutang_tanggal_idx" ON "pembayaran_hutang"("tanggal");

-- AddForeignKey
ALTER TABLE "pembayaran_hutang" ADD CONSTRAINT "pembayaran_hutang_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pembayaran_hutang" ADD CONSTRAINT "pembayaran_hutang_pembelianBahanId_fkey" FOREIGN KEY ("pembelianBahanId") REFERENCES "PembelianBahan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
