import { env } from '#/env'
import { logger } from '#/lib/logger'

// Aksi berisiko tinggi (pembatalan, retur, perubahan pajak/mode review) dicatat
// sebagai peringatan terstruktur agar bisa ditangkap monitoring log. Bila
// FRAUD_WEBHOOK_URL diisi, peringatan juga dikirim ke kanal eksternal.
export type JenisAlertFraud =
  'transaksi.dibatalkan' | 'retur.dibuat' | 'pengaturan.sensitif'

export type AlertFraud = {
  jenis: JenisAlertFraud
  pesan: string
  aktorId?: string | null
  entitasId?: string | null
  detail?: Record<string, unknown>
}

// Tidak pernah melempar: kegagalan kanal alert tidak boleh membatalkan aksi
// bisnis yang sudah tersimpan di DB.
export async function kirimAlertFraud(alert: AlertFraud): Promise<void> {
  logger.warn({ alert }, `fraud-alert: ${alert.jenis}`)

  const url = env.FRAUD_WEBHOOK_URL
  if (!url) return
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...alert, waktu: new Date().toISOString() }),
      signal: AbortSignal.timeout(5_000),
    })
    if (!res.ok) {
      logger.warn(
        { status: res.status, jenis: alert.jenis },
        'fraud-alert webhook menolak',
      )
    }
  } catch (e) {
    logger.warn(
      {
        jenis: alert.jenis,
        err: e instanceof Error ? e.message : String(e),
      },
      'fraud-alert webhook gagal',
    )
  }
}
