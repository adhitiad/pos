-- Default printer per pengguna (perangkat hasil pindai).
ALTER TABLE "Printer"
ADD COLUMN "defaultPengguna" BOOLEAN NOT NULL DEFAULT false;

-- Satu default aktif per user. Partial index juga menutup race dua request.
CREATE UNIQUE INDEX "printer_default_pengguna_per_user"
ON "Printer" ("userId")
WHERE "defaultPengguna" = true AND "aktif" = true AND "userId" IS NOT NULL;
