-- Hanya satu printer default aktif secara global.
-- Dedupe data lama dulu agar indeks unik parsial bisa dibuat.
WITH pilih AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "updatedAt" DESC, "id") AS rn
  FROM "Printer"
  WHERE "default" = true AND "aktif" = true
)
UPDATE "Printer" AS p
SET "default" = false
FROM pilih
WHERE p."id" = pilih."id" AND pilih.rn > 1;

CREATE UNIQUE INDEX "printer_satu_default_global"
ON "Printer" ("default")
WHERE "default" = true AND "aktif" = true;
