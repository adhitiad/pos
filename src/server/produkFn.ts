import { createServerFn } from '@tanstack/react-start'

import { requireOwner } from '#/server/auth'
import { produkData, produkLanding, produkTerpopuler } from '#/server/produk'
import {
  createKategori,
  createProduk,
  hapusKategori,
  hapusProduk,
  toggleProduk,
  updateProduk,
} from '#/server/produkMutasi'
import {
  HapusKategoriSchema,
  HapusProdukSchema,
  KategoriInputSchema,
  ProdukInputSchema,
  ProdukTerpopulerSchema,
  ToggleProdukSchema,
  UpdateProdukSchema,
} from '#/validations/produk'

export const produkDataFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireOwner()
    return produkData()
  },
)

export const createProdukFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ProdukInputSchema.parse(input))
  .handler(async ({ data }) => {
    await requireOwner()
    return createProduk(data)
  })

export const updateProdukFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => UpdateProdukSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireOwner()
    return updateProduk(data, pengguna.id)
  })

export const toggleProdukFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => ToggleProdukSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireOwner()
    return toggleProduk(data, pengguna.id)
  })

export const hapusProdukFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => HapusProdukSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireOwner()
    return hapusProduk(data, pengguna.id)
  })

export const createKategoriFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => KategoriInputSchema.parse(input))
  .handler(async ({ data }) => {
    await requireOwner()
    return createKategori(data)
  })

export const hapusKategoriFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => HapusKategoriSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireOwner()
    return hapusKategori(data, pengguna.id)
  })

export const produkTerpopulerFn = createServerFn({ method: 'GET' })
  .validator((input: unknown) => ProdukTerpopulerSchema.parse(input ?? {}))
  .handler(async ({ data }) => {
    await requireOwner()
    return produkTerpopuler(data.limit ?? 4)
  })

export const produkLandingFn = createServerFn({ method: 'GET' }).handler(
  async () => produkLanding(),
)
