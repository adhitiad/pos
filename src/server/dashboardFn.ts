import { createServerFn } from '@tanstack/react-start'

import { requireKasir } from './auth.js'
import { kasirData } from './kasir.js'

export const dashboardDataFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const pengguna = await requireKasir()
    return kasirData(pengguna.id)
  },
)
