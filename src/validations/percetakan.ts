import { z } from 'zod'

export const TIPE_PRINTER = ['ESC_POS', 'RAW'] as const
export const KONEKSI_PRINTER = ['USB', 'BLUETOOTH', 'WIFI', 'SERIAL'] as const

function adaKarakterKontrol(nilai: string): boolean {
  return [...nilai].some((karakter) => {
    const kode = karakter.charCodeAt(0)
    return kode < 32 || kode === 127
  })
}

const teksPrinter = (maks: number) =>
  z
    .string()
    .trim()
    .max(maks)
    .refine(
      (nilai) => !adaKarakterKontrol(nilai),
      'Tidak boleh mengandung karakter kontrol',
    )

export const PrinterInputSchema = z.object({
  nama: teksPrinter(80).min(1, 'Nama printer wajib diisi'),
  tipe: z.enum(TIPE_PRINTER).default('ESC_POS'),
  lokasi: teksPrinter(80).optional(),
  perangkat: teksPrinter(200).optional(),
  koneksi: z.enum(KONEKSI_PRINTER).default('USB'),
  vendorId: teksPrinter(120).optional(),
  vendorName: teksPrinter(120).optional(),
  serialNumber: teksPrinter(160).optional(),
  productName: teksPrinter(160).optional(),
  default: z.boolean().default(false),
  aktif: z.boolean().default(true),
})

export type PrinterInput = z.input<typeof PrinterInputSchema>

export const PrinterDeviceInputSchema = PrinterInputSchema.omit({
  default: true,
}).extend({
  perangkat: teksPrinter(200).min(1, 'ID perangkat wajib diisi'),
  koneksi: z.enum(KONEKSI_PRINTER),
})

export type PrinterDeviceInput = z.input<typeof PrinterDeviceInputSchema>

export const UpdatePrinterSchema = PrinterInputSchema.extend({
  id: z.string().min(1),
  koneksi: z.enum(KONEKSI_PRINTER).optional(),
  vendorId: teksPrinter(120).optional(),
  vendorName: teksPrinter(120).optional(),
  serialNumber: teksPrinter(160).optional(),
  productName: teksPrinter(160).optional(),
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
