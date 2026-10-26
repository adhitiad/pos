-- Perbaikan urutan migrasi: kolom ini semula ditambahkan sebelum tabelnya
-- dibuat (20261022161956). Dibuat kondisional agar fresh DB tidak gagal;
-- migrasi 20261024000000 memastikan kolom tetap ada setelah tabel dibuat.
ALTER TABLE IF EXISTS "pengajuan_pengeluaran"
  ADD COLUMN IF NOT EXISTS "nominalDisetujui" DECIMAL(14,2);
