import { Prisma } from '#/generated/prisma/client.js'
import type { KebutuhanStok } from '#/types/transaksi'
import type { Tx } from '#/types/prisma'
import { GalatDomain } from './galat.js'

export type { KebutuhanStok } from '#/types/transaksi'

export function kebutuhanDariBaris(
  baris: {
    produkId: string
    qty: number
    kebutuhan: { bahanId: string; butuh: number }[]
  }[],
): KebutuhanStok {
  const qtyProduk = new Map<string, number>()
  const qtyBahan = new Map<string, number>()
  for (const b of baris) {
    qtyProduk.set(b.produkId, (qtyProduk.get(b.produkId) ?? 0) + b.qty)
    for (const k of b.kebutuhan) {
      qtyBahan.set(k.bahanId, (qtyBahan.get(k.bahanId) ?? 0) + k.butuh)
    }
  }
  return { qtyProduk, qtyBahan }
}

export async function kurangiStok(tx: Tx, kebutuhan: KebutuhanStok) {
  // UPDATE bersyarat `stok >= qty` menjaga stok tidak negatif saat dua
  // penjualan bersamaan. Bila baris terpengaruh kurang, seluruh tx dibatalkan.
  if (kebutuhan.qtyProduk.size > 0) {
    const nilai = Prisma.join(
      [...kebutuhan.qtyProduk].map(
        ([id, qty]) => Prisma.sql`(${id}::text, ${qty.toString()}::int)`,
      ),
    )
    const terpengaruh = await tx.$executeRaw`
      UPDATE "Produk" AS p
      SET "stok" = p."stok" - v.qty
      FROM (VALUES ${nilai}) AS v(id, qty)
      WHERE p."id" = v.id AND p."stok" >= v.qty
    `
    if (terpengaruh !== kebutuhan.qtyProduk.size) {
      throw new GalatDomain('Stok produk tidak mencukupi')
    }
  }
  if (kebutuhan.qtyBahan.size > 0) {
    const nilai = Prisma.join(
      [...kebutuhan.qtyBahan].map(
        ([id, qty]) => Prisma.sql`(${id}::text, ${qty.toString()}::numeric)`,
      ),
    )
    const terpengaruh = await tx.$executeRaw`
      UPDATE "Bahan" AS b
      SET "stok" = b."stok" - v.qty
      FROM (VALUES ${nilai}) AS v(id, qty)
      WHERE b."id" = v.id AND b."stok" >= v.qty
    `
    if (terpengaruh !== kebutuhan.qtyBahan.size) {
      throw new GalatDomain('Stok bahan baku tidak mencukupi')
    }
  }
}

export async function kembalikanStok(tx: Tx, kebutuhan: KebutuhanStok) {
  if (kebutuhan.qtyProduk.size > 0) {
    const nilai = Prisma.join(
      [...kebutuhan.qtyProduk].map(
        ([id, qty]) => Prisma.sql`(${id}::text, ${qty.toString()}::int)`,
      ),
    )
    await tx.$executeRaw`
      UPDATE "Produk" AS p
      SET "stok" = p."stok" + v.qty
      FROM (VALUES ${nilai}) AS v(id, qty)
      WHERE p."id" = v.id
    `
  }
  if (kebutuhan.qtyBahan.size > 0) {
    const nilai = Prisma.join(
      [...kebutuhan.qtyBahan].map(
        ([id, qty]) => Prisma.sql`(${id}::text, ${qty.toString()}::numeric)`,
      ),
    )
    await tx.$executeRaw`
      UPDATE "Bahan" AS b
      SET "stok" = b."stok" + v.qty
      FROM (VALUES ${nilai}) AS v(id, qty)
      WHERE b."id" = v.id
    `
  }
}

// Hitung kebutuhan stok dari item yang sudah tersimpan. Dipakai saat
// finalisasi pembayaran online dan pembatalan (stok belum/telah dipotong).
export async function kebutuhanStokTransaksi(
  tx: Tx,
  transaksiId: string,
): Promise<KebutuhanStok> {
  const items = await tx.transaksiItem.findMany({
    where: { transaksiId },
    select: {
      produkId: true,
      qty: true,
      produk: {
        select: {
          resep: { select: { bahanId: true, jumlah: true } },
        },
      },
    },
  })
  const qtyProduk = new Map<string, number>()
  const qtyBahan = new Map<string, number>()
  for (const item of items) {
    if (item.produkId) {
      qtyProduk.set(
        item.produkId,
        (qtyProduk.get(item.produkId) ?? 0) + item.qty,
      )
    }
    for (const r of item.produk?.resep ?? []) {
      qtyBahan.set(
        r.bahanId,
        (qtyBahan.get(r.bahanId) ?? 0) + r.jumlah.toNumber() * item.qty,
      )
    }
  }
  return { qtyProduk, qtyBahan }
}
