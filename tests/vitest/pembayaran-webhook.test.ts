import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import {
  PaymentWebhookSchema,
  verifikasiTandaTangan,
} from '../../src/server/pembayaranWebhook.js'
import { PesananOnlineSchema } from '../../src/validations/transaksi.js'

const secret = 'rahasia-webhook-minimal-16-karakter'

describe('verifikasiTandaTangan', () => {
  const body = JSON.stringify({ event: 'payment.paid', orderId: 'x' })
  const signature = createHmac('sha256', secret).update(body).digest('hex')

  it('menerima signature hex dan prefiks sha256=', () => {
    expect(verifikasiTandaTangan(body, signature, secret)).toBe(true)
    expect(verifikasiTandaTangan(body, `sha256=${signature}`, secret)).toBe(
      true,
    )
  })

  it('menolak signature salah atau body berubah', () => {
    expect(verifikasiTandaTangan(body, 'a'.repeat(64), secret)).toBe(false)
    expect(verifikasiTandaTangan(`${body} `, signature, secret)).toBe(false)
    expect(verifikasiTandaTangan(body, '', secret)).toBe(false)
  })
})

describe('PaymentWebhookSchema', () => {
  it('menerima event pembayaran yang didukung', () => {
    expect(
      PaymentWebhookSchema.parse({
        event: 'payment.paid',
        orderId: 'trx_1',
        reference: 'gateway-ref-1',
        amount: 25000,
      }).orderId,
    ).toBe('trx_1')
  })

  it('menolak event tak dikenal', () => {
    expect(() =>
      PaymentWebhookSchema.parse({
        event: 'payment.refunded',
        orderId: 'trx_1',
        reference: 'gateway-ref-1',
      }),
    ).toThrow()
  })
})

describe('batas item pesanan online', () => {
  const item = (i: number) => ({
    produkId: `p${i}`,
    qty: 1,
  })

  it('menerima tepat 100 baris', () => {
    const items = Array.from({ length: 100 }, (_, i) => item(i))
    expect(PesananOnlineSchema.parse({ items }).items).toHaveLength(100)
  })

  it('menolak 101 baris', () => {
    const items = Array.from({ length: 101 }, (_, i) => item(i))
    expect(() => PesananOnlineSchema.parse({ items })).toThrow()
  })

  it('menolak qty > 9.999 dan modifier > 20 per baris', () => {
    expect(() =>
      PesananOnlineSchema.parse({
        items: [{ produkId: 'p1', qty: 10_000 }],
      }),
    ).toThrow()
    expect(() =>
      PesananOnlineSchema.parse({
        items: [
          {
            produkId: 'p1',
            qty: 1,
            modifiers: Array.from({ length: 21 }, (_, i) => ({
              modifierId: `m${i}`,
            })),
          },
        ],
      }),
    ).toThrow()
  })
})
