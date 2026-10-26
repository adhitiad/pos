-- Menjamin kolom nominalDisetujui ada pada instalasi baru. Pada instalasi lama
-- kolom sudah ada sehingga perintah ini no-op.
ALTER TABLE IF EXISTS "pengajuan_pengeluaran"
  ADD COLUMN IF NOT EXISTS "nominalDisetujui" DECIMAL(14,2);
