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

const MAKS_ITEM_PESANAN = 100
const MAKS_MODIFIER_PER_ITEM = 20
const MAKS_QTY = 9_999

// Metadata waktu offline hanya boleh menyimpang maksimal 24 jam dari jam
// server. Lebih dari itu ditolak agar waktuKlien tidak bisa dipakai untuk
// memalsukan urutan/laporan di masa depan (SEC-21).
export const BATAS_WAKTU_KLIEN_MS = 24 * 60 * 60 * 1_000

const PostingItemSchema = z.object({
  produkId: z.string().min(1).max(64),
  qty: z.number().int().positive().max(MAKS_QTY),
  modifiers: z
    .array(
      z.object({
        modifierId: z.string().min(1).max(64),
        qty: z.number().int().positive().max(MAKS_QTY).default(1),
        catatan: z.string().max(200).optional(),
      }),
    )
    .max(MAKS_MODIFIER_PER_ITEM)
    .optional(),
})

const PembayaranInputSchema = z.object({
  metode: z.enum(METODE_BAYAR),
  jumlah: z.number().int().positive().max(1_000_000_000),
  uangDiterima: z.number().int().nonnegative().max(1_000_000_000).optional(),
})

export const PostingTransaksiSchema = z
  .object({
    items: z
      .array(PostingItemSchema)
      .min(1, 'Minimal 1 item')
      .max(MAKS_ITEM_PESANAN, `Maksimal ${MAKS_ITEM_PESANAN} item`),
    memberId: z.string().min(1).max(64).optional(),
    deliveryId: z.string().min(1).max(64).optional(),
    diskon: z.number().int().nonnegative().max(1_000_000_000).default(0),
    // Diabaikan: pajak dihitung server dari pengaturan `pajak_persen` (OW-10).
    // Field tetap diterima agar klien lama tidak error.
    pajak: z.number().int().nonnegative().max(1_000_000_000).default(0),
    tukarPoin: z.number().int().nonnegative().max(1_000_000).default(0),
    metodeBayar: z.enum(METODE_BAYAR).default('TUNAI'),
    uangDiterima: z.number().int().nonnegative().max(1_000_000_000).optional(),
    pembayaran: z.array(PembayaranInputSchema).max(20).min(1).optional(),
    mejaId: z.string().min(1).max(64).optional(),
    // Pembatalan bukan bagian dari posting: transaksi yang sudah dibayar
    // dibatalkan lewat retur/pembalik, bukan dengan menulis status DIBATALKAN.
    statusPesanan: z.enum(STATUS_PESANAN).optional().default('MENUNGGU'),
    catatan: z.string().max(500).optional(),
    // Alamat pengiriman; hanya bermakna bila deliveryId diisi.
    alamat: z.string().trim().min(5).max(300).optional(),
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
  .superRefine((data, ctx) => {
    if (data.statusPesanan === 'DIBATALKAN') {
      ctx.addIssue({
        code: 'custom',
        path: ['statusPesanan'],
        message:
          'Transaksi tidak dapat diposting sebagai DIBATALKAN; gunakan pembatalan/retur',
      })
    }
    if (data.dibuatOffline && !data.idempotencyKey) {
      ctx.addIssue({
        code: 'custom',
        path: ['idempotencyKey'],
        message: 'Transaksi offline wajib memiliki idempotencyKey',
      })
    }
    if (!data.waktuKlien) return
    const waktu = Date.parse(data.waktuKlien)
    if (!Number.isFinite(waktu)) {
      ctx.addIssue({
        code: 'custom',
        path: ['waktuKlien'],
        message: 'waktuKlien bukan tanggal yang valid',
      })
      return
    }
    if (Math.abs(Date.now() - waktu) > BATAS_WAKTU_KLIEN_MS) {
      ctx.addIssue({
        code: 'custom',
        path: ['waktuKlien'],
        message: 'waktuKlien di luar batas ±24 jam dari waktu server',
      })
    }
  })

export type PostingTransaksiInput = z.input<typeof PostingTransaksiSchema>

// Metode bayar yang tersedia untuk pelanggan pesan sendiri (tanpa kasir).
export const METODE_BAYAR_ONLINE = ['QRIS', 'TRANSFER', 'EWALLET'] as const

// Schema khusus pesanan online. Pelanggan TIDAK boleh menyetel memberId,
// diskon, pajak, tukarPoin, atau statusPesanan: semua dipaksa aman di sisi
// server (SEC-02). `deliveryId`/`mejaToken` diterima tetapi divalidasi ketat
// dan tarif antar selalu diambil dari master Delivery di server. Field tak
// dikenal di-strip Zod.
export const PesananOnlineSchema = z
  .object({
    items: z
      .array(PostingItemSchema)
      .min(1, 'Minimal 1 item')
      .max(MAKS_ITEM_PESANAN, `Maksimal ${MAKS_ITEM_PESANAN} item`),
    // Dine-in publik wajib memakai token QR bertanda tangan; mejaId mentah
    // tidak diterima agar pelanggan tak bisa mengunci meja sembarangan.
    mejaToken: z.string().min(1).max(512).optional(),
    deliveryId: z.string().min(1).max(64).optional(),
    alamat: z.string().trim().min(5).max(300).optional(),
    metodeBayar: z.enum(METODE_BAYAR_ONLINE).default('QRIS'),
    catatan: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.deliveryId && data.mejaToken) {
      ctx.addIssue({
        code: 'custom',
        path: ['deliveryId'],
        message: 'Pesanan antar tidak boleh memakai QR meja',
      })
    }
    if (data.deliveryId && !data.alamat) {
      ctx.addIssue({
        code: 'custom',
        path: ['alamat'],
        message: 'Alamat pengiriman wajib diisi untuk pesanan antar',
      })
    }
  })

// Dapur/KDS: ubah status pesanan F&B.
export const UpdateStatusPesananSchema = z.object({
  id: z.string().min(1).max(64),
  statusPesanan: z.enum(STATUS_PESANAN),
})

export type UpdateStatusPesananInput = z.infer<typeof UpdateStatusPesananSchema>

export const TandaiLunasSchema = z.object({
  id: z.string().min(1).max(64),
})

// Cetak struk: hitung berapa kali struk dicetak per peran.
export const CetakStrukSchema = z.object({
  id: z.string().min(1).max(64),
  peran: z.enum(['OWNER', 'KASIR']),
})

export type CetakStrukInput = z.infer<typeof CetakStrukSchema>
