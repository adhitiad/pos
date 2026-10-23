import type { Prisma } from '#/generated/prisma/client.js'

// Filter tunggal untuk transaksi yang dihitung sebagai penjualan:
// sudah dibayar dan tidak dibatalkan. Pesanan online yang belum lunas tidak
// boleh masuk omzet, laporan pajak, bestseller, shift, atau notifikasi.
export const FILTER_TRANSAKSI_TERJUAL = {
  dibayarPada: { not: null },
  statusPesanan: { not: 'DIBATALKAN' },
} satisfies Prisma.TransaksiWhereInput
