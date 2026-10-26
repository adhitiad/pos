import { createHmac, timingSafeEqual } from 'node:crypto'

export { PaymentWebhookSchema } from '#/validations/pembayaran'

// Signature header: `x-payment-signature: sha256=<hex>` atau hex saja.
export function verifikasiTandaTangan(
  raw: string,
  signature: string,
  secret: string,
): boolean {
  const hex = signature.trim().replace(/^sha256=/i, '')
  if (!/^[a-f0-9]{64}$/i.test(hex)) return false
  const diterima = Buffer.from(hex, 'hex')
  const diharapkan = Buffer.from(
    createHmac('sha256', secret).update(raw).digest('hex'),
    'hex',
  )
  return (
    diterima.length === diharapkan.length &&
    timingSafeEqual(diterima, diharapkan)
  )
}
