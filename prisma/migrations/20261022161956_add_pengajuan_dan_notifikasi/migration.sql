-- Create enum types
CREATE TYPE "StatusPengajuan" AS ENUM ('PENDING', 'DISETUJUI', 'DITOLAK');
CREATE TYPE "JenisPengeluaran" AS ENUM ('BELANJA', 'OPERASIONAL_KASIR', 'AMBIL_OWNER', 'PEMBAYARAN_UTANG', 'OPERASIONAL_TOKO', 'LAINNYA');

-- CreateTable
CREATE TABLE "pengajuan_pengeluaran" (
    "id" TEXT NOT NULL,
    "kasirId" TEXT NOT NULL,
    "ownerId" TEXT,
    "nominal" DECIMAL(14,2) NOT NULL,
    "jenis" "JenisPengeluaran" NOT NULL,
    "keterangan" TEXT,
    "status" "StatusPengajuan" NOT NULL DEFAULT 'PENDING',
    "alasanPenolakan" TEXT,
    "jurnalId" TEXT,
    "disetujuiPada" TIMESTAMP(3),
    "ditolakPada" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pengajuan_pengeluaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifikasi" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "pesan" TEXT NOT NULL,
    "dibaca" BOOLEAN NOT NULL DEFAULT false,
    "tipe" TEXT NOT NULL,
    "entitasId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifikasi_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "pengajuan_pengeluaran" ADD CONSTRAINT "pengajuan_pengeluaran_kasirId_fkey" FOREIGN KEY ("kasirId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengajuan_pengeluaran" ADD CONSTRAINT "pengajuan_pengeluaran_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengajuan_pengeluaran" ADD CONSTRAINT "pengajuan_pengeluaran_jurnalId_fkey" FOREIGN KEY ("jurnalId") REFERENCES "Jurnal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifikasi" ADD CONSTRAINT "notifikasi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddIndex
CREATE INDEX "pengajuan_pengeluaran_kasirId_idx" ON "pengajuan_pengeluaran"("kasirId");
CREATE INDEX "pengajuan_pengeluaran_status_idx" ON "pengajuan_pengeluaran"("status");
CREATE INDEX "pengajuan_pengeluaran_createdAt_idx" ON "pengajuan_pengeluaran"("createdAt");
CREATE INDEX "notifikasi_userId_idx" ON "notifikasi"("userId");
CREATE INDEX "notifikasi_dibaca_idx" ON "notifikasi"("dibaca");
CREATE INDEX "notifikasi_createdAt_idx" ON "notifikasi"("createdAt");
