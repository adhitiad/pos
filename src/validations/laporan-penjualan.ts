import { z } from 'zod'

export const GrupSchema = z.enum(['harian', 'mingguan', 'bulanan', 'tahunan'])
export type Grup = z.infer<typeof GrupSchema>

export const DimensiSchema = z.enum([
  'kategori',
  'kasir',
  'shift',
  'member',
  'metodeBayar',
  'meja',
  'delivery',
  'sumber',
  'statusPesanan',
  'pajakJenis',
])
export type Dimensi = z.infer<typeof DimensiSchema>

export const LaporanPenjualanSchema = z.object({
  dari: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sampai: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  grup: GrupSchema.default('harian'),
  // Dimensi tambahan untuk pembagian rekap (opsional, satu per request).
  dimensi: DimensiSchema.optional(),
  // Filter tambahan (opsional).
  kategoriId: z.string().min(1).max(64).optional(),
  kasirId: z.string().min(1).max(64).optional(),
  shiftId: z.string().min(1).max(64).optional(),
  memberId: z.string().min(1).max(64).optional(),
  metodeBayar: z
    .enum(['TUNAI', 'QRIS', 'TRANSFER', 'KARTU', 'EWALLET'])
    .optional(),
  mejaId: z.string().min(1).max(64).optional(),
  deliveryId: z.string().min(1).max(64).optional(),
  sumber: z.enum(['POS', 'ONLINE']).optional(),
  statusPesanan: z
    .enum(['MENUNGGU', 'DIPROSES', 'SELESAI', 'DIBATALKAN', 'LUNAS'])
    .optional(),
  pajakJenis: z.string().min(1).max(16).optional(),
})

export type LaporanPenjualanInput = z.infer<typeof LaporanPenjualanSchema>

export const FormatEksporSchema = z.enum(['csv', 'xlsx', 'pdf'])

// Pencarian halaman laporan penjualan (semua field opsional).
export const LaporanSearchSchema = z.object({
  dari: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  sampai: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  grup: GrupSchema.optional(),
  userType: z.enum(['member', 'non-member']).optional(),
})
