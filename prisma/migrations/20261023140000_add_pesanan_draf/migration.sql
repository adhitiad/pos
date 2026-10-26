-- CreateEnum
CREATE TYPE "StatusPesananDraf" AS ENUM ('MENUNGGU', 'FINAL', 'DIBATALKAN');

-- CreateTable
CREATE TABLE "PesananDraf" (
    "id" TEXT NOT NULL,
    "mejaId" TEXT,
    "memberId" TEXT,
    "nama" TEXT,
    "telepon" TEXT,
    "catatan" TEXT,
    "status" "StatusPesananDraf" NOT NULL DEFAULT 'MENUNGGU',
    "itemsJson" JSONB NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "finalisasiPada" TIMESTAMP(3),
    "transaksiId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PesananDraf_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PesananDraf_mejaId_idx" ON "PesananDraf"("mejaId");
CREATE INDEX "PesananDraf_status_idx" ON "PesananDraf"("status");
CREATE INDEX "PesananDraf_createdAt_idx" ON "PesananDraf"("createdAt");
CREATE INDEX "PesananDraf_finalisasiPada_idx" ON "PesananDraf"("finalisasiPada");
CREATE UNIQUE INDEX "PesananDraf_transaksiId_key" ON "PesananDraf"("transaksiId");

-- AddForeignKey
ALTER TABLE "PesananDraf" ADD CONSTRAINT "PesananDraf_mejaId_fkey" FOREIGN KEY ("mejaId") REFERENCES public."Meja" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PesananDraf" ADD CONSTRAINT "PesananDraf_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES public."Member" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PesananDraf" ADD CONSTRAINT "PesananDraf_transaksiId_fkey" FOREIGN KEY ("transaksiId") REFERENCES public."Transaksi" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
