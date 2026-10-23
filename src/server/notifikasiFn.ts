import { createServerFn } from '@tanstack/react-start'

import { requireSemua } from './auth.js'
import { notifikasiData } from './notifikasi.js'
import { tandaiNotifikasiDibaca } from './notifikasiPesan.js'

export const notifikasiFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const pengguna = await requireSemua()
    return notifikasiData({
      role: pengguna.role,
      email: pengguna.email,
      userId: pengguna.id,
    })
  },
)

// Validasi daftar id notifikasi (array string) sebelum diteruskan ke server.
const daftarId = (input: unknown): string[] => {
  if (!Array.isArray(input)) return []
  return input.filter((v): v is string => typeof v === 'string')
}

// Tandai notifikasi yang sudah dibuka pengguna sebagai dibaca (penyimpanan di
// DB supaya tetap terbaca di perangkat lain).
export const tandaiNotifikasiDibacaFn = createServerFn({ method: 'POST' })
  .validator(daftarId)
  .handler(async ({ data }) => {
    await requireSemua()
    await tandaiNotifikasiDibaca(data)
    return { ok: true }
  })
