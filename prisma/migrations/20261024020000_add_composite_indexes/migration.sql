-- Composite & partial index sesuai pola kueri aktual (laporan, dashboard,
-- cron kadaluarsa, riwayat member). Semua idempoten agar aman dijalankan
-- ulang di DB yang sudah ada.

-- Laporan/dashboard: filter FILTER_TRANSAKSI_TERJUAL + rentang tanggal.
CREATE INDEX IF NOT EXISTS "Transaksi_terjual_tanggal_idx"
  ON "Transaksi"("tanggal")
  WHERE "dibayarPada" IS NOT NULL AND "statusPesanan" <> 'DIBATALKAN';

-- Cron pembayaran kadaluarsa: dibayarPada IS NULL + status MENUNGGU/DIPROSES,
-- diurutkan createdAt (pemilihan batch tertua dulu).
CREATE INDEX IF NOT EXISTS "Transaksi_kadaluarsa_idx"
  ON "Transaksi"("createdAt")
  WHERE "dibayarPada" IS NULL
    AND "statusPesanan" IN ('MENUNGGU', 'DIPROSES');

-- Riwayat transaksi member: filter memberId + urut tanggal.
CREATE INDEX IF NOT EXISTS "Transaksi_memberId_tanggal_idx"
  ON "Transaksi"("memberId", "tanggal");

-- Laporan belanja: rekap ((supplierId, sumberBelanja) + rentang tanggal).
CREATE INDEX IF NOT EXISTS "PembelianBahan_supplier_tanggal_idx"
  ON "PembelianBahan"("supplierId", "sumberBelanja", "tanggal");

-- Produk terlaris: agregasi per produk menyaring transaksi terjual.
CREATE INDEX IF NOT EXISTS "TransaksiItem_produkId_qty_idx"
  ON "TransaksiItem"("produkId", "qty");
