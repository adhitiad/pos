-- AlterTable
ALTER TABLE "Transaksi" ADD COLUMN     "shiftId" TEXT;

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "kasirId" TEXT NOT NULL,
    "waktuBuka" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "waktuTutup" TIMESTAMP(3),
    "kasAwal" DECIMAL(14,2) NOT NULL,
    "kasAkhir" DECIMAL(14,2),
    "selisih" DECIMAL(14,2),
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Shift_kasirId_idx" ON "Shift"("kasirId");

-- CreateIndex
CREATE INDEX "Shift_waktuBuka_idx" ON "Shift"("waktuBuka");

-- CreateIndex
CREATE INDEX "Transaksi_shiftId_idx" ON "Transaksi"("shiftId");

-- AddForeignKey
ALTER TABLE "Transaksi" ADD CONSTRAINT "Transaksi_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_kasirId_fkey" FOREIGN KEY ("kasirId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Satu kasir maksimal satu shift terbuka (parsial: hanya yang belum ditutup)
CREATE UNIQUE INDEX "Shift_kasir_terbuka_key" ON "Shift"("kasirId") WHERE "waktuTutup" IS NULL;
