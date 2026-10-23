import { createFileRoute } from '@tanstack/react-router'

import { env } from '#/env'
import { apiError, bacaTeksTerbatas, gagal, ok } from '#/server/api'
import { GalatDomain } from '#/server/galat'
import { tandaiPesananLunas } from '#/server/pembayaranPesanan'
import {
  PaymentWebhookSchema,
  verifikasiTandaTangan,
} from '#/server/pembayaranWebhook'
import { rateLimit } from '#/server/rateLimit'

// Webhook payment gateway. Body ditandatangani HMAC-SHA256 dengan
// PAYMENT_WEBHOOK_SECRET. Untuk sementara hanya `payment.paid` yang
// mengubah status; event lain diterima tanpa efek.
export const Route = createFileRoute('/api/v1/pembayaran/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const rl = await rateLimit(request, 120)
          if (rl) return rl

          const secret = env.PAYMENT_WEBHOOK_SECRET
          if (!secret) {
            return gagal(
              'NOT_CONFIGURED',
              'Webhook pembayaran belum dikonfigurasi',
              503,
            )
          }

          const raw = await bacaTeksTerbatas(request, 16 * 1024)
          const signature = request.headers.get('x-payment-signature') ?? ''
          if (!verifikasiTandaTangan(raw, signature, secret)) {
            return gagal(
              'UNAUTHORIZED',
              'Tanda tangan webhook tidak valid',
              401,
            )
          }

          const data = PaymentWebhookSchema.parse(JSON.parse(raw))
          if (data.event !== 'payment.paid') {
            return ok({ diterima: true, diproses: false })
          }

          const hasil = await tandaiPesananLunas({
            id: data.orderId,
            via: 'WEBHOOK',
            paymentRef: data.reference,
            jumlahDibayar: data.amount,
          })
          if (hasil.transaksi.id !== data.orderId) {
            throw new GalatDomain('Pesanan tidak ditemukan')
          }
          return ok({
            diterima: true,
            diproses: true,
            transaksiId: hasil.transaksi.id,
            nomor: hasil.transaksi.nomor,
          })
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})
