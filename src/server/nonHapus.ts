// Tambahkan `deletedAt: null` ke where clause Prisma agar catatan yang sudah
// dihapus logis (soft delete) tidak muncul di hasil baca. Pakai pada findMany
// / findFirst / findUnique untuk model yang mendukung soft delete
// (Produk, Transaksi, Meja).
//
// Contoh:
//   prisma.produk.findMany({ where: nonHapus({ kategoriId }) })
//   prisma.transaksi.findMany({ where: nonHapus({ tanggal: {...} }) })
export function nonHapus<T extends Record<string, unknown>>(where?: T): any {
  return { ...(where ?? {}), deletedAt: null }
}
