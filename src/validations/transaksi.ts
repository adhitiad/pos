import { z } from 'zod'

export const METODE_BAYAR = [
  'TUNAI',
  'QRIS',
  'TRANSFER',
  'KARTU',
  'EWALLET',
] as const

export const STATUS_PESANAN = [
  'MENUNGGU',
  'DIPROSES',
  'SELESAI',
  'DIBATALKAN',
  'LUNAS',
] as const

const PostingItemSchema = z.object({
  produkId: z.string().min(1),
  qty: z.number().int().positive(),
  modifiers: z
    .array(
      z.object({
        modifierId: z.string().min(1),
        qty: z.number().int().positive().default(1),
        catatan: z.string().max(200).optional(),
      }),
    )
    .optional(),
})

const PembayaranInputSchema = z.object({
  metode: z.enum(METODE_BAYAR),
  jumlah: z.number().int().positive(),
  uangDiterima: z.number().int().nonnegative().optional(),
})

export const PostingTransaksiSchema = z.object({
  items: z.array(PostingItemSchema).min(1, 'Minimal 1 item'),
  memberId: z.string().min(1).optional(),
  deliveryId: z.string().min(1).optional(),
  diskon: z.number().int().nonnegative().default(0),
  // Diabaikan: pajak dihitung server dari pengaturan `pajak_persen` (OW-10).
  // Field tetap diterima agar klien lama tidak error.
  pajak: z.number().int().nonnegative().default(0),
  tukarPoin: z.number().int().nonnegative().default(0),
  metodeBayar: z.enum(METODE_BAYAR).default('TUNAI'),
  uangDiterima: z.number().int().nonnegative().optional(),
  pembayaran: z.array(PembayaranInputSchema).min(1).optional(),
  mejaId: z.string().min(1).optional(),
  statusPesanan: z.enum(STATUS_PESANAN).optional().default('MENUNGGU'),
  catatan: z.string().max(500).optional(),
  // Idempotensi (antrean offline): kunci stabil buatan klien. Retry dengan
  // kunci sama tidak membuat transaksi ganda (stok & pendapatan tak dobel).
  idempotencyKey: z.string().trim().min(8).max(64).optional(),
  // Penanda transaksi yang dibuat dari antrean offline (luring).
  dibuatOffline: z.boolean().default(false),
  // Waktu klien membuat transaksi (ISO-8601) — untuk urutan/laporan offline.
  waktuKlien: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/,
      'Format waktuKlien harus ISO-8601',
    )
    .optional(),
})

export type PostingTransaksiInput = z.input<typeof PostingTransaksiSchema>

// Metode bayar yang tersedia untuk pelanggan pesan sendiri (tanpa kasir).
export const METODE_BAYAR_ONLINE = ['QRIS', 'TRANSFER', 'EWALLET'] as const

// Schema khusus pesanan online. Pelanggan TIDAK boleh menyetel memberId,
// deliveryId, diskon, pajak, tukarPoin, atau statusPesanan: semua dipaksa
// aman di sisi server (SEC-02). Field tak dikenal di-strip Zod.
export const PesananOnlineSchema = z.object({
  items: z.array(PostingItemSchema).min(1, 'Minimal 1 item'),
  mejaId: z.string().min(1).optional(),
  metodeBayar: z.enum(METODE_BAYAR_ONLINE).default('QRIS'),
  catatan: z.string().max(500).optional(),
})

// Dapur/KDS: ubah status pesanan F&B.
export const UpdateStatusPesananSchema = z.object({
  id: z.string().min(1),
  statusPesanan: z.enum(STATUS_PESANAN),
})

export type UpdateStatusPesananInput = z.infer<typeof UpdateStatusPesananSchema>

// Cetak struk: hitung berapa kali struk dicetak per peran.
export const CetakStrukSchema = z.object({
  id: z.string().min(1),
  peran: z.enum(['OWNER', 'KASIR']),
})

export type CetakStrukInput = z.infer<typeof CetakStrukSchema>
