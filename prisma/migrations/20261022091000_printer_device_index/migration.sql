-- Mempercepat daftar perangkat aktif per user, urut scan terbaru.
CREATE INDEX "Printer_userId_aktif_dipindaiPada_idx"
ON "Printer" ("userId", "aktif", "dipindaiPada");
