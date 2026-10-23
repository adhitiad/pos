import { createServerFn } from '@tanstack/react-start'

import { requireHanyaKasir, requireKasir, requireOwner } from './auth.js'
import {
  buatPengajuan,
  daftarPengajuan,
  setujuiPengajuan,
  tolakPengajuan,
} from './pengajuan.js'
import {
  AjuanPengeluaranSchema,
  SetujuiPengajuanSchema,
  TolakPengajuanSchema,
} from '#/validations/pengeluaran'

// Wrapper server function: validasi + guard + panggil fungsi murni.
// Kasir mengajukan pengeluaran; owner yang memutuskan.
export const buatPengajuanFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => AjuanPengeluaranSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireHanyaKasir()
    return await buatPengajuan(pengguna.id, data)
  })

export const setujuiPengajuanFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => SetujuiPengajuanSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireOwner()
    return await setujuiPengajuan(pengguna.id, data)
  })

export const tolakPengajuanFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => TolakPengajuanSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireOwner()
    return await tolakPengajuan(pengguna.id, data)
  })

// Daftar ajuan: owner melihat semua, kasir melihat ajuannya sendiri.
export const daftarPengajuanFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const pengguna = await requireKasir()
    return await daftarPengajuan(pengguna)
  },
)
