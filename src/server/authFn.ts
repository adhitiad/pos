import { createServerFn } from '@tanstack/react-start'

import { getPengguna } from './auth.js'

export const getSessionFn = createServerFn({ method: 'GET' }).handler(
  async () => getPengguna(),
)

export const getPenggunaFn = createServerFn({ method: 'GET' }).handler(
  async () => getPengguna(),
)
