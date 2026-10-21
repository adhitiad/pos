import type { Tx } from '#/types/prisma'

export function kodeHarian(prefix: string, now: Date = new Date()) {
  const tgl = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
  return `${prefix}-${tgl}-`
}

function kunciHarian(tabel: string, now: Date): string {
  const tgl = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return `${tabel}:${tgl}`
}

// Nomor urut harian per tabel (transaksi/jurnal). Panggil di dalam tx.
// Pakai penghitung atomik (tabel nomor_harian) agar tidak COUNT() seluruh
// baris hari ini di jalur tulis. Baris penghitung diinisialisasi sekali per
// hari dari jumlah baris saat itu (tahan balapan), lalu naik +1 secara atomik.
export async function nomorBerikut(
  tx: Tx,
  tabel: 'transaksi' | 'jurnal',
  prefix: string,
) {
  const now = new Date()
  const kunci = kunciHarian(tabel, now)

  const ada = await tx.nomorHarian.findUnique({
    where: { kunci },
    select: { nilai: true },
  })
  if (ada) {
    const rows = await tx.$queryRaw<{ nilai: number }[]>`
      UPDATE "nomor_harian" SET "nilai" = "nilai" + 1
      WHERE "kunci" = ${kunci}
      RETURNING "nilai"
    `
    return `${prefix}${String(rows[0].nilai).padStart(4, '0')}`
  }

  const awalHari = new Date(now)
  awalHari.setHours(0, 0, 0, 0)
  const count =
    tabel === 'transaksi'
      ? await tx.transaksi.count({ where: { createdAt: { gte: awalHari } } })
      : await tx.jurnal.count({ where: { createdAt: { gte: awalHari } } })
  const rows = await tx.$queryRaw<{ nilai: number }[]>`
    INSERT INTO "nomor_harian" ("kunci", "nilai")
    VALUES (${kunci}, ${count + 1})
    ON CONFLICT ("kunci") DO UPDATE SET "nilai" = "nomor_harian"."nilai" + 1
    RETURNING "nilai"
  `
  return `${prefix}${String(rows[0].nilai).padStart(4, '0')}`
}
