-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'KASIR', 'MEMBER');

-- CreateEnum
CREATE TYPE "TierMember" AS ENUM ('BRONZE', 'SILVER', 'GOLD');

-- CreateEnum
CREATE TYPE "MetodeBayar" AS ENUM ('TUNAI', 'QRIS', 'TRANSFER', 'KARTU', 'EWALLET');

-- CreateEnum
CREATE TYPE "StatusPesanan" AS ENUM ('MENUNGGU', 'DIPROSES', 'SELESAI', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "TipeAkun" AS ENUM ('ASET', 'KEWAJIBAN', 'MODAL', 'PENDAPATAN', 'BEBAN');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit" (
    "key" TEXT NOT NULL,
    "hit" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "nomor_harian" (
    "kunci" TEXT NOT NULL,
    "nilai" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "nomor_harian_pkey" PRIMARY KEY ("kunci")
);

-- CreateTable
CREATE TABLE "Kategori" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "deskripsi" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kategori_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bahan" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "satuan" TEXT NOT NULL,
    "jenis" TEXT,
    "stok" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "stokMinimum" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "hargaSatuan" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bahan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PembelianBahan" (
    "id" TEXT NOT NULL,
    "bahanId" TEXT NOT NULL,
    "jumlah" DECIMAL(14,2) NOT NULL,
    "hargaSatuan" DECIMAL(14,2) NOT NULL,
    "totalHarga" DECIMAL(14,2) NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PembelianBahan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produk" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "sku" TEXT,
    "barcode" TEXT,
    "gambar" TEXT,
    "harga" DECIMAL(14,2) NOT NULL,
    "stok" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "kategoriId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Produk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProdukBahan" (
    "produkId" TEXT NOT NULL,
    "bahanId" TEXT NOT NULL,
    "jumlah" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "ProdukBahan_pkey" PRIMARY KEY ("produkId","bahanId")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "telepon" TEXT,
    "email" TEXT,
    "alamat" TEXT,
    "poin" INTEGER NOT NULL DEFAULT 0,
    "totalBelanja" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "diskonPersen" DECIMAL(5,2),
    "tier" "TierMember" NOT NULL DEFAULT 'BRONZE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tarif" DECIMAL(14,2) NOT NULL,
    "estimasi" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Delivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaksi" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "memberId" TEXT,
    "kasirId" TEXT,
    "deliveryId" TEXT,
    "ongkir" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "diskon" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "pajak" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "pajakJenis" TEXT,
    "total" DECIMAL(14,2) NOT NULL,
    "poinPakai" INTEGER NOT NULL DEFAULT 0,
    "poinDapat" INTEGER NOT NULL DEFAULT 0,
    "metodeBayar" "MetodeBayar" NOT NULL DEFAULT 'TUNAI',
    "catatan" TEXT,
    "mejaId" TEXT,
    "statusPesanan" "StatusPesanan" NOT NULL DEFAULT 'MENUNGGU',
    "uangDiterima" DECIMAL(14,2),
    "kembalian" DECIMAL(14,2),
    "cetakOwner" INTEGER NOT NULL DEFAULT 0,
    "cetakKasir" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaksi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransaksiItem" (
    "id" TEXT NOT NULL,
    "transaksiId" TEXT NOT NULL,
    "produkId" TEXT,
    "namaProduk" TEXT NOT NULL,
    "harga" DECIMAL(14,2) NOT NULL,
    "qty" INTEGER NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "TransaksiItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pembayaran" (
    "id" TEXT NOT NULL,
    "transaksiId" TEXT NOT NULL,
    "metode" "MetodeBayar" NOT NULL,
    "jumlah" DECIMAL(14,2) NOT NULL,
    "uangDiterima" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pembayaran_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Akun" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "tipe" "TipeAkun" NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Akun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jurnal" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "keterangan" TEXT,
    "transaksiId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Jurnal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JurnalDetail" (
    "id" TEXT NOT NULL,
    "jurnalId" TEXT NOT NULL,
    "akunId" TEXT NOT NULL,
    "debit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "kredit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JurnalDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pengaturan" (
    "kunci" TEXT NOT NULL,
    "nilai" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pengaturan_pkey" PRIMARY KEY ("kunci")
);

-- CreateTable
CREATE TABLE "Meja" (
    "id" TEXT NOT NULL,
    "nomor" TEXT NOT NULL,
    "nama" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModifierGrup" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "wajib" BOOLEAN NOT NULL DEFAULT false,
    "min" INTEGER NOT NULL DEFAULT 0,
    "max" INTEGER NOT NULL DEFAULT 99,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModifierGrup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Modifier" (
    "id" TEXT NOT NULL,
    "grupId" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "hargaTambahan" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Modifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProdukModifierGrup" (
    "id" TEXT NOT NULL,
    "produkId" TEXT NOT NULL,
    "grupId" TEXT NOT NULL,

    CONSTRAINT "ProdukModifierGrup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransaksiItemModifier" (
    "id" TEXT NOT NULL,
    "transaksiItemId" TEXT NOT NULL,
    "modifierId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "catatan" TEXT,
    "hargaTambahan" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransaksiItemModifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageVisit" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "userId" TEXT,
    "userType" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceVisit" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "deviceName" TEXT,
    "os" TEXT NOT NULL,
    "ipv4" TEXT,
    "ipv6" TEXT,
    "dns" TEXT,
    "lokasi" TEXT,
    "klasifikasi" TEXT NOT NULL,
    "userId" TEXT,
    "userType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "rate_limit_resetAt_idx" ON "rate_limit"("resetAt");

-- CreateIndex
CREATE INDEX "PembelianBahan_bahanId_idx" ON "PembelianBahan"("bahanId");

-- CreateIndex
CREATE INDEX "PembelianBahan_tanggal_idx" ON "PembelianBahan"("tanggal");

-- CreateIndex
CREATE UNIQUE INDEX "Produk_sku_key" ON "Produk"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Produk_barcode_key" ON "Produk"("barcode");

-- CreateIndex
CREATE INDEX "Produk_aktif_idx" ON "Produk"("aktif");

-- CreateIndex
CREATE INDEX "Produk_kategoriId_idx" ON "Produk"("kategoriId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_telepon_key" ON "Member"("telepon");

-- CreateIndex
CREATE UNIQUE INDEX "Transaksi_nomor_key" ON "Transaksi"("nomor");

-- CreateIndex
CREATE INDEX "Transaksi_tanggal_idx" ON "Transaksi"("tanggal");

-- CreateIndex
CREATE INDEX "Transaksi_memberId_idx" ON "Transaksi"("memberId");

-- CreateIndex
CREATE INDEX "Transaksi_kasirId_idx" ON "Transaksi"("kasirId");

-- CreateIndex
CREATE INDEX "Transaksi_deliveryId_idx" ON "Transaksi"("deliveryId");

-- CreateIndex
CREATE INDEX "Transaksi_mejaId_idx" ON "Transaksi"("mejaId");

-- CreateIndex
CREATE INDEX "Transaksi_metodeBayar_idx" ON "Transaksi"("metodeBayar");

-- CreateIndex
CREATE INDEX "Transaksi_statusPesanan_idx" ON "Transaksi"("statusPesanan");

-- CreateIndex
CREATE INDEX "Transaksi_tanggal_kasirId_idx" ON "Transaksi"("tanggal", "kasirId");

-- CreateIndex
CREATE INDEX "TransaksiItem_transaksiId_idx" ON "TransaksiItem"("transaksiId");

-- CreateIndex
CREATE INDEX "TransaksiItem_produkId_idx" ON "TransaksiItem"("produkId");

-- CreateIndex
CREATE INDEX "Pembayaran_transaksiId_idx" ON "Pembayaran"("transaksiId");

-- CreateIndex
CREATE INDEX "Pembayaran_metode_idx" ON "Pembayaran"("metode");

-- CreateIndex
CREATE UNIQUE INDEX "Akun_kode_key" ON "Akun"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "Jurnal_nomor_key" ON "Jurnal"("nomor");

-- CreateIndex
CREATE UNIQUE INDEX "Jurnal_transaksiId_key" ON "Jurnal"("transaksiId");

-- CreateIndex
CREATE INDEX "Jurnal_tanggal_idx" ON "Jurnal"("tanggal");

-- CreateIndex
CREATE INDEX "JurnalDetail_jurnalId_idx" ON "JurnalDetail"("jurnalId");

-- CreateIndex
CREATE INDEX "JurnalDetail_akunId_idx" ON "JurnalDetail"("akunId");

-- CreateIndex
CREATE UNIQUE INDEX "Meja_nomor_key" ON "Meja"("nomor");

-- CreateIndex
CREATE INDEX "Modifier_grupId_idx" ON "Modifier"("grupId");

-- CreateIndex
CREATE INDEX "Modifier_aktif_idx" ON "Modifier"("aktif");

-- CreateIndex
CREATE INDEX "ProdukModifierGrup_grupId_idx" ON "ProdukModifierGrup"("grupId");

-- CreateIndex
CREATE UNIQUE INDEX "ProdukModifierGrup_produkId_grupId_key" ON "ProdukModifierGrup"("produkId", "grupId");

-- CreateIndex
CREATE INDEX "TransaksiItemModifier_transaksiItemId_idx" ON "TransaksiItemModifier"("transaksiItemId");

-- CreateIndex
CREATE INDEX "TransaksiItemModifier_modifierId_idx" ON "TransaksiItemModifier"("modifierId");

-- CreateIndex
CREATE INDEX "PageVisit_path_idx" ON "PageVisit"("path");

-- CreateIndex
CREATE INDEX "PageVisit_createdAt_idx" ON "PageVisit"("createdAt");

-- CreateIndex
CREATE INDEX "PageVisit_userId_idx" ON "PageVisit"("userId");

-- CreateIndex
CREATE INDEX "PageVisit_userType_idx" ON "PageVisit"("userType");

-- CreateIndex
CREATE INDEX "DeviceVisit_deviceId_idx" ON "DeviceVisit"("deviceId");

-- CreateIndex
CREATE INDEX "DeviceVisit_userId_idx" ON "DeviceVisit"("userId");

-- CreateIndex
CREATE INDEX "DeviceVisit_createdAt_idx" ON "DeviceVisit"("createdAt");

-- CreateIndex
CREATE INDEX "DeviceVisit_klasifikasi_idx" ON "DeviceVisit"("klasifikasi");

-- CreateIndex
CREATE INDEX "DeviceVisit_userType_idx" ON "DeviceVisit"("userType");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PembelianBahan" ADD CONSTRAINT "PembelianBahan_bahanId_fkey" FOREIGN KEY ("bahanId") REFERENCES "Bahan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Produk" ADD CONSTRAINT "Produk_kategoriId_fkey" FOREIGN KEY ("kategoriId") REFERENCES "Kategori"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdukBahan" ADD CONSTRAINT "ProdukBahan_produkId_fkey" FOREIGN KEY ("produkId") REFERENCES "Produk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdukBahan" ADD CONSTRAINT "ProdukBahan_bahanId_fkey" FOREIGN KEY ("bahanId") REFERENCES "Bahan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaksi" ADD CONSTRAINT "Transaksi_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaksi" ADD CONSTRAINT "Transaksi_kasirId_fkey" FOREIGN KEY ("kasirId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaksi" ADD CONSTRAINT "Transaksi_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaksi" ADD CONSTRAINT "Transaksi_mejaId_fkey" FOREIGN KEY ("mejaId") REFERENCES "Meja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransaksiItem" ADD CONSTRAINT "TransaksiItem_transaksiId_fkey" FOREIGN KEY ("transaksiId") REFERENCES "Transaksi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransaksiItem" ADD CONSTRAINT "TransaksiItem_produkId_fkey" FOREIGN KEY ("produkId") REFERENCES "Produk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pembayaran" ADD CONSTRAINT "Pembayaran_transaksiId_fkey" FOREIGN KEY ("transaksiId") REFERENCES "Transaksi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jurnal" ADD CONSTRAINT "Jurnal_transaksiId_fkey" FOREIGN KEY ("transaksiId") REFERENCES "Transaksi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurnalDetail" ADD CONSTRAINT "JurnalDetail_jurnalId_fkey" FOREIGN KEY ("jurnalId") REFERENCES "Jurnal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JurnalDetail" ADD CONSTRAINT "JurnalDetail_akunId_fkey" FOREIGN KEY ("akunId") REFERENCES "Akun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Modifier" ADD CONSTRAINT "Modifier_grupId_fkey" FOREIGN KEY ("grupId") REFERENCES "ModifierGrup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdukModifierGrup" ADD CONSTRAINT "ProdukModifierGrup_produkId_fkey" FOREIGN KEY ("produkId") REFERENCES "Produk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProdukModifierGrup" ADD CONSTRAINT "ProdukModifierGrup_grupId_fkey" FOREIGN KEY ("grupId") REFERENCES "ModifierGrup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransaksiItemModifier" ADD CONSTRAINT "TransaksiItemModifier_transaksiItemId_fkey" FOREIGN KEY ("transaksiItemId") REFERENCES "TransaksiItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransaksiItemModifier" ADD CONSTRAINT "TransaksiItemModifier_modifierId_fkey" FOREIGN KEY ("modifierId") REFERENCES "Modifier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageVisit" ADD CONSTRAINT "PageVisit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceVisit" ADD CONSTRAINT "DeviceVisit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
