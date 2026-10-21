import { z } from 'zod'

export const TIPE_PRINTER = ['ESC_POS', 'RAW'] as const
export const KONEKSI_PRINTER = ['USB', 'BLUETOOTH', 'WIFI', 'SERIAL'] as const

export const PrinterInputSchema = z.object({
  nama: z.string().trim().min(1, 'Nama printer wajib diisi').max(80),
  tipe: z.enum(TIPE_PRINTER).default('ESC_POS'),
  lokasi: z.string().trim().max(80).optional(),
  perangkat: z.string().trim().max(200).optional(),
  koneksi: z.enum(KONEKSI_PRINTER).default('USB'),
  vendorId: z.string().trim().max(120).optional(),
  vendorName: z.string().trim().max(120).optional(),
  serialNumber: z.string().trim().max(160).optional(),
  productName: z.string().trim().max(160).optional(),
  default: z.boolean().default(false),
  aktif: z.boolean().default(true),
})

export type PrinterInput = z.input<typeof PrinterInputSchema>

export const PrinterDeviceInputSchema = PrinterInputSchema.omit({
  default: true,
}).extend({
  perangkat: z.string().trim().min(1, 'ID perangkat wajib diisi').max(200),
  koneksi: z.enum(KONEKSI_PRINTER),
})

export type PrinterDeviceInput = z.input<typeof PrinterDeviceInputSchema>

export const UpdatePrinterSchema = PrinterInputSchema.extend({
  id: z.string().min(1),
  koneksi: z.enum(KONEKSI_PRINTER).optional(),
  vendorId: z.string().trim().max(120).optional(),
  vendorName: z.string().trim().max(120).optional(),
  serialNumber: z.string().trim().max(160).optional(),
  productName: z.string().trim().max(160).optional(),
})

export type UpdatePrinterInput = z.input<typeof UpdatePrinterSchema>

export const PrinterIdSchema = z.object({
  id: z.string().min(1),
})

export const TIPE_PRINT_JOB = ['STRUK', 'LABEL', 'OPNAME'] as const

export const STATUS_PRINT_JOB = [
  'MENUNGGU',
  'DIPROSES',
  'DICETAK',
  'GAGAL',
] as const

// Buat antrean cetak. `idempotencyKey` membuat retry tak menghasilkan job
// ganda (penting saat klien offline mengirim ulang antrean).
export const BuatPrintJobSchema = z.object({
  printerId: z.string().min(1).optional(),
  transaksiId: z.string().min(1),
  tipe: z.enum(TIPE_PRINT_JOB).default('STRUK'),
  idempotencyKey: z.string().trim().min(8).max(64).optional(),
})

export type BuatPrintJobInput = z.input<typeof BuatPrintJobSchema>

// Ambil job untuk dicetak: filter status & printer, batasi jumlah.
export const DaftarPrintJobSchema = z.object({
  status: z.enum(STATUS_PRINT_JOB).optional(),
  printerId: z.string().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).optional(),
})

export type DaftarPrintJobInput = z.infer<typeof DaftarPrintJobSchema>

export const PrintJobIdSchema = z.object({
  id: z.string().min(1),
})

// Klien pencetak melaporkan kegagalan cetak (paper habis, printer offline, dll).
export const GagalPrintJobSchema = z.object({
  id: z.string().min(1),
  pesan: z.string().trim().max(200).optional(),
})
