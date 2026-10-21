import { createServerFn } from '@tanstack/react-start'

import { requireOwner } from './auth.js'
import {
  catatPembayaranHutang,
  createSupplier,
  hapusSupplier,
  hutangSupplier,
  supplierData,
  supplierOpsi,
  updateSupplier,
} from './supplier.js'
import {
  HapusSupplierSchema,
  PembayaranHutangSchema,
  SupplierIdSchema,
  SupplierInputSchema,
  UpdateSupplierSchema,
} from '#/validations/supplier'

export const supplierDataFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireOwner()
    return supplierData()
  },
)

export const supplierOpsiFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireOwner()
    return supplierOpsi()
  },
)

export const createSupplierFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => SupplierInputSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireOwner()
    return createSupplier(data, pengguna.id)
  })

export const updateSupplierFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => UpdateSupplierSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireOwner()
    return updateSupplier(data, pengguna.id)
  })

export const hapusSupplierFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => HapusSupplierSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireOwner()
    return hapusSupplier(data, pengguna.id)
  })

export const hutangSupplierFn = createServerFn({ method: 'GET' })
  .validator((input: unknown) => SupplierIdSchema.parse(input))
  .handler(async ({ data }) => {
    await requireOwner()
    return hutangSupplier(data.supplierId)
  })

export const catatPembayaranHutangFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => PembayaranHutangSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireOwner()
    return catatPembayaranHutang(data, pengguna.id)
  })
