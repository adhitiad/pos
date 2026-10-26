import { createServerFn } from '@tanstack/react-start'

import { requireKasir } from './auth.js'
import {
  identitasApp,
  logoUrl,
  pengaturanData,
  setPengaturan,
  cekTokoBuka,
  KUNCI_PENGATURAN_OPERASIONAL,
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
    // Kasir hanya boleh mengubah kunci operasional harian; kebijakan pajak,
    // diskon, identitas, dan mode review tetap milik owner.
    const pengguna = await requireKasir()
    const operasional = (
      KUNCI_PENGATURAN_OPERASIONAL as readonly string[]
    ).includes(data.kunci)
    if (!operasional && pengguna.role !== 'OWNER') {
      throw new Error('FORBIDDEN')
    }
    return setPengaturan(data, pengguna.id, pengguna.role)
  })

// Publik (tanpa login) — cek apakah toko buka untuk pemesanan.
export const cekTokoBukaFn = createServerFn({ method: 'GET' }).handler(
  async () => cekTokoBuka(),
)
