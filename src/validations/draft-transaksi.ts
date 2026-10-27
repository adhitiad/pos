import { z } from 'zod'

const MAKS_ITEM_DRAFT = 100
const METODE_BAYAR = ['TUNAI', 'QRIS', 'TRANSFER', 'KARTU', 'EWALLET'] as const

// ─── Buat Draft Transaksi (kasir) ───
// Draft menyimpan seluruh input posting sebagai `payloadJson`; stok & jurnal
// BELUM disentuh. Validasi lengkap (struktur item/pembayaran) dilakukan pada
// saat review melalui postingTransaksi. Di sini hanya memastikan bidang wajib
// dan ringkasan ditangkap untuk tampilan daftar.
export const BuatDraftTransaksiSchema = z
  .object({
    items: z.array(z.any()).min(1, 'Minimal 1 item').max(MAKS_ITEM_DRAFT),
    pembayaran: z.array(z.any()).max(20).min(1).optional(),
    memberId: z.string().min(1).max(64).optional(),
    deliveryId: z.string().min(1).max(64).optional(),
    diskon: z.number().int().nonnegative().max(1_000_000_000).default(0),
    pajak: z.number().int().nonnegative().max(1_000_000_000).default(0),
    tukarPoin: z.number().int().nonnegative().max(1_000_000).default(0),
    metodeBayar: z.enum(METODE_BAYAR),
    uangDiterima: z.number().int().nonnegative().max(1_000_000_000).optional(),
    mejaId: z.string().min(1).max(64).optional(),
    statusPesanan: z
      .enum(['MENUNGGU', 'DIPROSES', 'SELESAI', 'DIBATALKAN', 'LUNAS'])
      .optional()
      .default('MENUNGGU'),
    catatan: z.string().max(500).optional(),
    alamat: z.string().trim().min(5).max(300).optional(),
    // Ringkasan untuk tampilan daftar draft (hitungan ulang dilakukan server
    // saat review via postingTransaksi).
    subtotal: z.number().int().nonnegative().max(1_000_000_000),
    total: z.number().int().nonnegative().max(1_000_000_000),
    // Metadata offline (opsional).
    waktuKlien: z.string().optional(),
    dibuatOffline: z.boolean().default(false),
    idempotencyKey: z.string().trim().min(8).max(64).optional(),
  })
  .refine((v) => v.statusPesanan !== 'DIBATALKAN', {
    message: 'Draft tidak dapat dibuat dengan status DIBATALKAN',
    path: ['statusPesanan'],
  })

// `Input` = bentuk yang dikirim klien (default boleh tidak diisi);
// `Output` = hasil parse dengan default terisi, dipakai handler server.
export type BuatDraftTransaksiInput = z.input<typeof BuatDraftTransaksiSchema>
export type BuatDraftTransaksiOutput = z.output<typeof BuatDraftTransaksiSchema>

// ─── Review Draft Transaksi (kasir) ───
export const DraftIdSchema = z.object({
  draftId: z.string().min(1).max(64),
})

export const ReviewTransaksiSchema = z.object({
  draftId: z.string().min(1).max(64),
  keputusan: z.enum(['DISETUJUI', 'DITOLAK']),
  catatan: z.string().max(500).optional(),
})
