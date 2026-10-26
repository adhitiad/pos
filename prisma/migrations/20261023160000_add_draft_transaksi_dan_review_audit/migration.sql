-- CreateEnum (idempoten: aman dijalankan ulang setelah kegagalan parsial)
DO $$ BEGIN
  CREATE TYPE "StatusDraftTransaksi" AS ENUM ('MENUNGGU', 'DISETUJUI', 'DITOLAK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "DraftTransaksi" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "kasirId" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "total" DECIMAL(14,2) NOT NULL,
    "metodeBayar" TEXT NOT NULL,
    "catatan" TEXT,
    "waktuKlien" TIMESTAMP(3),
    "dibuatOffline" BOOLEAN NOT NULL DEFAULT false,
    "idempotencyKey" TEXT,
    "status" "StatusDraftTransaksi" NOT NULL DEFAULT 'MENUNGGU',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "transaksiId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DraftTransaksi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TransaksiReviewAudit" (
    "id" TEXT NOT NULL,
    "draftId" TEXT,
    "transaksiId" TEXT,
    "kasirId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransaksiReviewAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DraftTransaksi_nomor_key" ON "DraftTransaksi"("nomor");
-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DraftTransaksi_idempotencyKey_key" ON "DraftTransaksi"("idempotencyKey");
-- CreateIndex
CREATE INDEX IF NOT EXISTS "DraftTransaksi_kasirId_idx" ON "DraftTransaksi"("kasirId");
-- CreateIndex
CREATE INDEX IF NOT EXISTS "DraftTransaksi_status_idx" ON "DraftTransaksi"("status");
-- CreateIndex
CREATE INDEX IF NOT EXISTS "DraftTransaksi_createdAt_idx" ON "DraftTransaksi"("createdAt");
-- CreateIndex
CREATE INDEX IF NOT EXISTS "TransaksiReviewAudit_draftId_idx" ON "TransaksiReviewAudit"("draftId");
-- CreateIndex
CREATE INDEX IF NOT EXISTS "TransaksiReviewAudit_transaksiId_idx" ON "TransaksiReviewAudit"("transaksiId");
-- CreateIndex
CREATE INDEX IF NOT EXISTS "TransaksiReviewAudit_kasirId_idx" ON "TransaksiReviewAudit"("kasirId");
-- CreateIndex
CREATE INDEX IF NOT EXISTS "TransaksiReviewAudit_createdAt_idx" ON "TransaksiReviewAudit"("createdAt");

-- Add column catatan (alasan tindakan) ke audit_log.
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "catatan" TEXT;

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "DraftTransaksi" ADD CONSTRAINT "DraftTransaksi_kasirId_fkey" FOREIGN KEY ("kasirId") REFERENCES public."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DraftTransaksi" ADD CONSTRAINT "DraftTransaksi_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES public."user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "DraftTransaksi" ADD CONSTRAINT "DraftTransaksi_transaksiId_fkey" FOREIGN KEY ("transaksiId") REFERENCES public."Transaksi"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TransaksiReviewAudit" ADD CONSTRAINT "TransaksiReviewAudit_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "DraftTransaksi"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TransaksiReviewAudit" ADD CONSTRAINT "TransaksiReviewAudit_transaksiId_fkey" FOREIGN KEY ("transaksiId") REFERENCES public."Transaksi"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "TransaksiReviewAudit" ADD CONSTRAINT "TransaksiReviewAudit_kasirId_fkey" FOREIGN KEY ("kasirId") REFERENCES public."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
