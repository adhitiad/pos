import { z } from 'zod'

// Payload webhook pembayaran (gateway pihak ketiga). Nominal opsional karena
// sumber kebenaran tetap transaksi di DB; signature diverifikasi terpisah.
export const PaymentWebhookSchema = z.object({
  event: z.enum(['payment.paid', 'payment.failed', 'payment.expired']),
  orderId: z.string().min(1).max(64),
  reference: z.string().min(1).max(128),
  amount: z.number().int().nonnegative().optional(),
})
