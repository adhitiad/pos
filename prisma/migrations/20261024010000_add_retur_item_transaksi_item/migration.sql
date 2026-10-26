-- Retur harus menyimpan identitas baris transaksi asal agar dua baris
-- dengan produk sama tidak saling mengurangi kuota retur.
ALTER TABLE "retur_item" ADD COLUMN "transaksiItemId" TEXT;

CREATE INDEX "retur_item_transaksiItemId_idx" ON "retur_item"("transaksiItemId");

ALTER TABLE "retur_item" ADD CONSTRAINT "retur_item_transaksiItemId_fkey"
  FOREIGN KEY ("transaksiItemId") REFERENCES "TransaksiItem"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
