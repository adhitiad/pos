import { createServerFn } from '@tanstack/react-start'

import { requireKasir, requireOwner } from './auth.js'
import {
  identitasApp,
  logoUrl,
  pengaturanData,
  setPengaturan,
} from './pengaturan.js'
import { SetPengaturanSchema } from '#/validations/pengaturan'

// Logo & identitas tampil di halaman publik (landing/struk) → tanpa guard.
export const logoUrlFn = createServerFn({ method: 'GET' }).handler(async () =>
  logoUrl(),
)

export const identitasAppFn = createServerFn({ method: 'GET' }).handler(
  async () => identitasApp(),
)

export const pengaturanDataFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireKasir()
    return pengaturanData()
  },
)

export const setPengaturanFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => SetPengaturanSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireOwner()
    return setPengaturan(data, pengguna.id)
  })
