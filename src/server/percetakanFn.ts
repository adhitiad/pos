import { createServerFn } from '@tanstack/react-start'

import { requireKasir, requireOwner } from './auth.js'
import {
  ambilPrintJob,
  buatPrintJob,
  createPrinter,
  daftarPrintJob,
  daftarPrinter,
  daftarPrinterPerangkat,
  daftarkanPrinterPerangkat,
  gagalPrintJob,
  hapusPrinter,
  printerDefault,
  selesaiPrintJob,
  setDefaultPrinterPerangkat,
  updatePrinter,
} from './percetakan.js'
import {
  BuatPrintJobSchema,
  DaftarPrintJobSchema,
  GagalPrintJobSchema,
  PrinterDeviceInputSchema,
  PrinterIdSchema,
  PrinterInputSchema,
  PrintJobIdSchema,
  UpdatePrinterSchema,
} from '#/validations/percetakan'

export const daftarPrinterFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireOwner()
    return daftarPrinter()
  },
)

export const printerDefaultFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const pengguna = await requireOwner()
    return printerDefault(pengguna.id)
  },
)

export const daftarPrinterPerangkatFn = createServerFn({
  method: 'GET',
}).handler(async () => {
  const pengguna = await requireKasir()
  return daftarPrinterPerangkat(pengguna.id)
})

export const setDefaultPrinterPerangkatFn = createServerFn({
  method: 'POST',
})
  .validator((input: unknown) => PrinterIdSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireKasir()
    return setDefaultPrinterPerangkat(data, pengguna.id, pengguna.id)
  })

export const daftarkanPrinterPerangkatFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => PrinterDeviceInputSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireKasir()
    return daftarkanPrinterPerangkat(data, pengguna.id, pengguna.id)
  })

export const createPrinterFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => PrinterInputSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireOwner()
    return createPrinter(data, pengguna.id, pengguna.id)
  })

export const updatePrinterFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => UpdatePrinterSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireOwner()
    return updatePrinter(data, pengguna.id)
  })

export const hapusPrinterFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => PrinterIdSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireOwner()
    return hapusPrinter(data, pengguna.id)
  })

export const daftarPrintJobFn = createServerFn({ method: 'GET' })
  .validator((input: unknown) => DaftarPrintJobSchema.parse(input))
  .handler(async ({ data }) => {
    await requireKasir()
    return daftarPrintJob(data)
  })

export const buatPrintJobFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => BuatPrintJobSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireKasir()
    return buatPrintJob(
      data,
      pengguna.id,
      pengguna.role === 'OWNER' ? 'OWNER' : 'KASIR',
    )
  })

export const ambilPrintJobFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => PrintJobIdSchema.parse(input))
  .handler(async ({ data }) => {
    await requireKasir()
    return ambilPrintJob(data.id)
  })

export const selesaiPrintJobFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => PrintJobIdSchema.parse(input))
  .handler(async ({ data }) => {
    await requireKasir()
    return selesaiPrintJob(data.id)
  })

export const gagalPrintJobFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => GagalPrintJobSchema.parse(input))
  .handler(async ({ data }) => {
    await requireKasir()
    return gagalPrintJob(data.id, data.pesan)
  })
