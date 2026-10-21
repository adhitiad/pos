-- AlterEnum
ALTER TYPE "StatusPesanan" ADD VALUE 'LUNAS';

-- AlterTable
ALTER TABLE "PembelianBahan" ADD COLUMN     "supplierId" TEXT;

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "kontak" TEXT,
    "alamat" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retur" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transaksiId" TEXT NOT NULL,
    "kasirId" TEXT NOT NULL,
    "alasan" TEXT NOT NULL,
    "totalRetur" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "retur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retur_item" (
    "id" TEXT NOT NULL,
    "returId" TEXT NOT NULL,
    "produkId" TEXT,
    "namaProduk" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "hargaSatuan" DECIMAL(14,2) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "retur_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stok_opname" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kasirId" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "catatan" TEXT,

    CONSTRAINT "stok_opname_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stok_opname_item" (
    "id" TEXT NOT NULL,
    "opnameId" TEXT NOT NULL,
    "produkId" TEXT,
    "bahanId" TEXT,
    "stokTercatat" DECIMAL(14,2) NOT NULL,
    "stokFisik" DECIMAL(14,2) NOT NULL,
    "selisih" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "stok_opname_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "retur_nomor_key" ON "retur"("nomor");

-- CreateIndex
CREATE INDEX "retur_transaksiId_idx" ON "retur"("transaksiId");

-- CreateIndex
CREATE INDEX "retur_kasirId_idx" ON "retur"("kasirId");

-- CreateIndex
CREATE INDEX "retur_tanggal_idx" ON "retur"("tanggal");

-- CreateIndex
CREATE INDEX "retur_item_returId_idx" ON "retur_item"("returId");

-- CreateIndex
CREATE INDEX "retur_item_produkId_idx" ON "retur_item"("produkId");

-- CreateIndex
CREATE UNIQUE INDEX "stok_opname_nomor_key" ON "stok_opname"("nomor");

-- CreateIndex
CREATE INDEX "stok_opname_kasirId_idx" ON "stok_opname"("kasirId");

-- CreateIndex
CREATE INDEX "stok_opname_tanggal_idx" ON "stok_opname"("tanggal");

-- CreateIndex
CREATE INDEX "stok_opname_jenis_idx" ON "stok_opname"("jenis");

-- CreateIndex
CREATE INDEX "stok_opname_item_opnameId_idx" ON "stok_opname_item"("opnameId");

-- CreateIndex
CREATE INDEX "stok_opname_item_produkId_idx" ON "stok_opname_item"("produkId");

-- CreateIndex
CREATE INDEX "stok_opname_item_bahanId_idx" ON "stok_opname_item"("bahanId");

-- CreateIndex
CREATE INDEX "audit_log_userId_idx" ON "audit_log"("userId");

-- CreateIndex
CREATE INDEX "audit_log_timestamp_idx" ON "audit_log"("timestamp");

-- CreateIndex
CREATE INDEX "audit_log_entity_idx" ON "audit_log"("entity");

-- CreateIndex
CREATE INDEX "PembelianBahan_supplierId_idx" ON "PembelianBahan"("supplierId");

-- AddForeignKey
ALTER TABLE "PembelianBahan" ADD CONSTRAINT "PembelianBahan_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retur" ADD CONSTRAINT "retur_transaksiId_fkey" FOREIGN KEY ("transaksiId") REFERENCES "Transaksi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retur" ADD CONSTRAINT "retur_kasirId_fkey" FOREIGN KEY ("kasirId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retur_item" ADD CONSTRAINT "retur_item_returId_fkey" FOREIGN KEY ("returId") REFERENCES "retur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retur_item" ADD CONSTRAINT "retur_item_produkId_fkey" FOREIGN KEY ("produkId") REFERENCES "Produk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_opname" ADD CONSTRAINT "stok_opname_kasirId_fkey" FOREIGN KEY ("kasirId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_opname_item" ADD CONSTRAINT "stok_opname_item_opnameId_fkey" FOREIGN KEY ("opnameId") REFERENCES "stok_opname"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_opname_item" ADD CONSTRAINT "stok_opname_item_produkId_fkey" FOREIGN KEY ("produkId") REFERENCES "Produk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stok_opname_item" ADD CONSTRAINT "stok_opname_item_bahanId_fkey" FOREIGN KEY ("bahanId") REFERENCES "Bahan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
