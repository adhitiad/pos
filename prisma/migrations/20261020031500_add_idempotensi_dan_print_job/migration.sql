-- AlterTable
ALTER TABLE "Transaksi" ADD COLUMN     "dibuatOffline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "diskonMember" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "hpp" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "waktuKlien" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Printer" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tipe" TEXT NOT NULL DEFAULT 'ESC_POS',
    "lokasi" TEXT,
    "perangkat" TEXT,
    "default" BOOLEAN NOT NULL DEFAULT false,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Printer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintJob" (
    "id" TEXT NOT NULL,
    "printerId" TEXT,
    "transaksiId" TEXT,
    "tipe" TEXT NOT NULL DEFAULT 'STRUK',
    "status" TEXT NOT NULL DEFAULT 'MENUNGGU',
    "idempotencyKey" TEXT,
    "payload" JSONB,
    "percobaan" INTEGER NOT NULL DEFAULT 0,
    "pesanGalat" TEXT,
    "dicetakPada" TIMESTAMP(3),
    "diambilPada" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrintJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrintJob_idempotencyKey_key" ON "PrintJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PrintJob_status_printerId_idx" ON "PrintJob"("status", "printerId");

-- CreateIndex
CREATE INDEX "PrintJob_transaksiId_idx" ON "PrintJob"("transaksiId");

-- CreateIndex
CREATE INDEX "PrintJob_createdAt_idx" ON "PrintJob"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Transaksi_idempotencyKey_key" ON "Transaksi"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "PrintJob" ADD CONSTRAINT "PrintJob_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrintJob" ADD CONSTRAINT "PrintJob_transaksiId_fkey" FOREIGN KEY ("transaksiId") REFERENCES "Transaksi"("id") ON DELETE SET NULL ON UPDATE CASCADE;
