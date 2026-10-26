-- Index bagian 2 sesuai pola kueri aktual. Idempoten agar aman dijalankan
-- ulang pada DB yang sudah ada.

-- Pencarian member berdasarkan email/nama (paginasi + filter).
CREATE INDEX IF NOT EXISTS "Member_email_idx" ON "Member"("email");
CREATE INDEX IF NOT EXISTS "Member_nama_idx" ON "Member"("nama");

-- Pencarian katalog produk berdasarkan nama.
CREATE INDEX IF NOT EXISTS "Produk_nama_idx" ON "Produk"("nama");

-- Notifikasi tersimpan: filter userId + urut createdAt (komposit menggantikan
-- index userId tunggal). Tabel & index memakai nama @@map (huruf kecil).
DROP INDEX IF EXISTS "notifikasi_userId_idx";
CREATE INDEX IF NOT EXISTS "notifikasi_userId_createdAt_idx"
  ON "notifikasi"("userId", "createdAt");

-- Antrean draft dine-in: filter status + urut createdAt.
DROP INDEX IF EXISTS "pesanan_draf_status_idx";
CREATE INDEX IF NOT EXISTS "pesanan_draf_status_createdAt_idx"
  ON "pesanan_draf"("status", "createdAt");

-- Antrean pesanan/KDS: filter status + urut createdAt.
CREATE INDEX IF NOT EXISTS "Transaksi_statusPesanan_createdAt_idx"
  ON "Transaksi"("statusPesanan", "createdAt");

-- Printer: index userId tunggal redundan (sudah tercakup unique
-- [userId, perangkat] dan index [userId, aktif, dipindaiPada]).
DROP INDEX IF EXISTS "Printer_userId_idx";
