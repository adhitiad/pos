import { createServerFn } from '@tanstack/react-start'

import { requireSemua } from './auth.js'
import { notifikasiData } from './notifikasi.js'

export const notifikasiFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const pengguna = await requireSemua()
    return notifikasiData({ role: pengguna.role, email: pengguna.email })
  },
)
