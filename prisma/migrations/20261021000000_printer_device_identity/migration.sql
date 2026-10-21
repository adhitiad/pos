-- AlterTable
ALTER TABLE "Printer"
ADD COLUMN     "userId" TEXT,
ADD COLUMN     "koneksi" TEXT NOT NULL DEFAULT 'USB',
ADD COLUMN     "vendorId" TEXT,
ADD COLUMN     "vendorName" TEXT,
ADD COLUMN     "serialNumber" TEXT,
ADD COLUMN     "productName" TEXT,
ADD COLUMN     "dipindaiPada" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Printer_userId_idx" ON "Printer"("userId");

-- CreateIndex
CREATE INDEX "Printer_koneksi_idx" ON "Printer"("koneksi");

-- CreateIndex
CREATE UNIQUE INDEX "Printer_userId_perangkat_key" ON "Printer"("userId", "perangkat");

-- AddForeignKey
ALTER TABLE "Printer" ADD CONSTRAINT "Printer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
