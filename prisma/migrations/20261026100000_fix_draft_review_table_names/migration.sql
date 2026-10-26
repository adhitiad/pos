-- Perbaikan drift nama tabel draft/review (ditemukan 2026-10-26).
-- Migrasi 20261023160000 membuat tabel PascalCase ("DraftTransaksi",
-- "TransaksiReviewAudit"), sedangkan schema.prisma memetakannya ke
-- draft_transaksi/transaksi_review_audit. Deploy baru dari migrasi karena itu
-- tidak memiliki tabel yang dipakai aplikasi.
--
-- Aturan (aditif, tidak menghapus data):
-- 1. Tabel PascalCase tanpa pasangan snake_case -> rename, data ikut pindah.
-- 2. Keduanya ada dan PascalCase kosong -> hapus tabel PascalCase.
-- 3. Keduanya ada dan PascalCase berisi data -> ganti tabel snake_case yang
--    kosong; bila keduanya berisi data, migrasi berhenti (gabungkan manual).
-- Nama index/constraint disamakan dengan nama default Prisma.

DO $$
DECLARE
  pasangan record;
  ada_pascal boolean;
  ada_snake boolean;
  isi_pascal bigint;
  isi_snake bigint;
  daftar_index text[];
  daftar_fk text[];
  nama text;
BEGIN
  -- Urutan penting: audit lebih dulu agar FK-nya ke DraftTransaksi sudah
  -- hilang sebelum tabel draft PascalCase dihapus.
  FOR pasangan IN
    SELECT * FROM (VALUES
      ('TransaksiReviewAudit', 'transaksi_review_audit'),
      ('DraftTransaksi', 'draft_transaksi')
    ) AS v(pascal, snake)
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = pasangan.pascal
    ) INTO ada_pascal;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = pasangan.snake
    ) INTO ada_snake;

    IF ada_pascal AND ada_snake THEN
      EXECUTE format('SELECT count(*) FROM %I', pasangan.pascal) INTO isi_pascal;
      EXECUTE format('SELECT count(*) FROM %I', pasangan.snake) INTO isi_snake;

      IF isi_pascal > 0 AND isi_snake > 0 THEN
        RAISE EXCEPTION
          'Tabel % dan % sama-sama berisi data; gabungkan manual sebelum migrasi dijalankan',
          pasangan.pascal, pasangan.snake;
      END IF;

      IF isi_pascal > 0 THEN
        EXECUTE format('DROP TABLE %I', pasangan.snake);
        EXECUTE format('ALTER TABLE %I RENAME TO %I', pasangan.pascal, pasangan.snake);
        ada_snake := true;
      ELSE
        EXECUTE format('DROP TABLE %I', pasangan.pascal);
        ada_pascal := false;
      END IF;
    ELSIF ada_pascal THEN
      EXECUTE format('ALTER TABLE %I RENAME TO %I', pasangan.pascal, pasangan.snake);
      ada_snake := true;
    END IF;

    IF NOT ada_snake THEN
      CONTINUE;
    END IF;

    -- Nama index tidak ikut berubah saat ALTER TABLE ... RENAME TO.
    SELECT array_agg(indexname) INTO daftar_index
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = pasangan.snake
      AND indexname LIKE pasangan.pascal || '\_%' ESCAPE '\';

    IF daftar_index IS NOT NULL THEN
      FOREACH nama IN ARRAY daftar_index LOOP
        EXECUTE format(
          'ALTER INDEX %I RENAME TO %I',
          nama,
          pasangan.snake || substr(nama, length(pasangan.pascal) + 1)
        );
      END LOOP;
    END IF;

    -- Constraint FOREIGN KEY tidak ikut di-rename oleh ALTER INDEX; PK/UNIQUE
    -- sudah ikut karena index-nya di-rename di atas.
    SELECT array_agg(conname) INTO daftar_fk
    FROM pg_constraint
    WHERE conrelid = format('public.%I', pasangan.snake)::regclass
      AND contype = 'f'
      AND conname LIKE pasangan.pascal || '\_%' ESCAPE '\';

    IF daftar_fk IS NOT NULL THEN
      FOREACH nama IN ARRAY daftar_fk LOOP
        EXECUTE format(
          'ALTER TABLE %I RENAME CONSTRAINT %I TO %I',
          pasangan.snake,
          nama,
          pasangan.snake || substr(nama, length(pasangan.pascal) + 1)
        );
      END LOOP;
    END IF;
  END LOOP;

  -- `transaksiId` unik belum dibuat oleh migrasi PascalCase; samakan dengan
  -- schema (`transaksiId String? @unique`).
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'draft_transaksi'
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "draft_transaksi_transaksiId_key"
      ON "draft_transaksi"("transaksiId");
  END IF;

  -- Nama index komposit PembelianBahan mengikuti default Prisma.
  IF to_regclass('public."PembelianBahan_supplier_tanggal_idx"') IS NOT NULL
     AND to_regclass('public."PembelianBahan_supplierId_sumberBelanja_tanggal_idx"') IS NULL THEN
    ALTER INDEX "PembelianBahan_supplier_tanggal_idx"
      RENAME TO "PembelianBahan_supplierId_sumberBelanja_tanggal_idx";
  END IF;
END $$;
