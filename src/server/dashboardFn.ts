import { createServerFn } from '@tanstack/react-start'

import { requireKasir } from './auth.js'
import { dashboardData } from './dashboard.js'

export const dashboardDataFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireKasir()
    return dashboardData()
  },
)
