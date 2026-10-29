import { createServerFn } from '@tanstack/react-start'

import { requireOwner } from './auth.js'
import { resetDatabase } from './resetDatabase.js'

export const resetDatabaseFn = createServerFn({ method: 'POST' })
  .validator(() => ({}) as Record<string, never>)
  .handler(async () => {
    const pengguna = await requireOwner()
    return resetDatabase(pengguna.id)
  })
