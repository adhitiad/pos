-- SEC-21: waktu terima server eksplisit untuk transaksi.
ALTER TABLE "Transaksi"
ADD COLUMN "diterimaPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Transaksi" SET "diterimaPada" = "createdAt";

-- SEC-24: satu baris per perangkat + hitungan kunjungan.
ALTER TABLE "DeviceVisit"
ADD COLUMN "terakhirDilihat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "jumlahKunjungan" INTEGER NOT NULL DEFAULT 1;

UPDATE "DeviceVisit" SET "terakhirDilihat" = "createdAt";

-- Agregasi duplikat lama: pertahankan baris terbaru per deviceId dan jumlahkan
-- kunjungannya. Wajib sebelum unique index dibuat.
WITH agregat AS (
    SELECT
        "deviceId",
        MAX("createdAt") AS terakhir,
        COUNT(*)::integer AS jumlah
    FROM "DeviceVisit"
    GROUP BY "deviceId"
),
terbaru AS (
    SELECT "id", "deviceId"
    FROM (
        SELECT
            "id",
            "deviceId",
            ROW_NUMBER() OVER (
                PARTITION BY "deviceId"
                ORDER BY "createdAt" DESC, "id" DESC
            ) AS urutan
        FROM "DeviceVisit"
    ) q
    WHERE urutan = 1
)
UPDATE "DeviceVisit" d
SET "terakhirDilihat" = a.terakhir,
    "jumlahKunjungan" = a.jumlah
FROM agregat a, terbaru t
WHERE d."id" = t."id" AND t."deviceId" = a."deviceId";

DELETE FROM "DeviceVisit" d
USING (
    SELECT "id"
    FROM (
        SELECT
            "id",
            ROW_NUMBER() OVER (
                PARTITION BY "deviceId"
                ORDER BY "createdAt" DESC, "id" DESC
            ) AS urutan
        FROM "DeviceVisit"
    ) q
    WHERE urutan > 1
) duplikat
WHERE d."id" = duplikat."id";

DROP INDEX "DeviceVisit_deviceId_idx";
DROP INDEX "DeviceVisit_createdAt_idx";

CREATE UNIQUE INDEX "DeviceVisit_deviceId_key" ON "DeviceVisit"("deviceId");
CREATE INDEX "DeviceVisit_terakhirDilihat_idx" ON "DeviceVisit"("terakhirDilihat");
