-- Add Chart of Accounts rows for expense input (owner, buku besar).
INSERT INTO "Akun" ("id", "kode", "nama", "tipe", "aktif", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid(), '2200', 'Hutang Usaha', 'KEWAJIBAN', true, now(), now()),
  (gen_random_uuid(), '5200', 'Beban Belanja', 'BEBAN', true, now(), now()),
  (gen_random_uuid(), '5300', 'Beban Operasional Kasir', 'BEBAN', true, now(), now()),
  (gen_random_uuid(), '5400', 'Beban Operasional Toko', 'BEBAN', true, now(), now()),
  (gen_random_uuid(), '5900', 'Beban Lainnya', 'BEBAN', true, now(), now())
ON CONFLICT (kode) DO NOTHING;
