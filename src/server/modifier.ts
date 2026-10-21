import { prisma } from '#/db'
import { GalatDomain } from './galat.js'
import {
  ModifierGrupIdSchema,
  ModifierGrupInputSchema,
  ModifierIdSchema,
  ModifierInputSchema,
  ToggleModifierGrupSchema,
  ToggleModifierSchema,
  UpdateModifierGrupSchema,
  UpdateModifierSchema,
} from '#/validations/modifier'
import type {
  ModifierGrupInput,
  ModifierInput,
  UpdateModifierGrupInput,
  UpdateModifierInput,
} from '#/validations/modifier'

// ─── Grup Modifier ───

export async function modifierGrupData() {
  const grup = await prisma.modifierGrup.findMany({
    orderBy: [{ aktif: 'desc' }, { nama: 'asc' }],
    include: {
      _count: { select: { modifiers: true, produks: true } },
      modifiers: { where: { aktif: true }, orderBy: { nama: 'asc' } },
    },
  })
  return grup.map((g) => ({
    id: g.id,
    nama: g.nama,
    wajib: g.wajib,
    min: g.min,
    max: g.max,
    aktif: g.aktif,
    jumlahModifier: g._count.modifiers,
    dipakaiProduk: g._count.produks,
    modifiers: g.modifiers.map((m) => ({
      id: m.id,
      nama: m.nama,
      hargaTambahan: m.hargaTambahan.toNumber(),
      aktif: m.aktif,
    })),
  }))
}

export async function createModifierGrup(input: ModifierGrupInput) {
  const data = ModifierGrupInputSchema.parse(input)
  return prisma.modifierGrup.create({
    data: {
      nama: data.nama,
      wajib: data.wajib,
      min: data.min,
      max: data.max,
      aktif: data.aktif,
    },
    select: { id: true },
  })
}

export async function updateModifierGrup(input: UpdateModifierGrupInput) {
  const data = UpdateModifierGrupSchema.parse(input)
  const lama = await prisma.modifierGrup.findUnique({ where: { id: data.id } })
  if (!lama) throw new GalatDomain('Grup modifier tidak ditemukan')
  await prisma.modifierGrup.update({
    where: { id: data.id },
    data: {
      nama: data.nama,
      wajib: data.wajib,
      min: data.min,
      max: data.max,
      aktif: data.aktif,
    },
  })
  return { id: data.id }
}

export async function hapusModifierGrup(input: { id: string }) {
  const data = ModifierGrupIdSchema.parse(input)
  const lama = await prisma.modifierGrup.findUnique({
    where: { id: data.id },
    include: { _count: { select: { produks: true } } },
  })
  if (!lama) throw new GalatDomain('Grup modifier tidak ditemukan')
  if (lama._count.produks > 0) {
    throw new GalatDomain(
      `Grup modifier dipakai ${lama._count.produks} produk — hapus dari produk dulu`,
    )
  }
  await prisma.modifierGrup.delete({ where: { id: data.id } })
  return { id: data.id }
}

export async function toggleModifierGrup(input: {
  id: string
  aktif: boolean
}) {
  const data = ToggleModifierGrupSchema.parse(input)
  const lama = await prisma.modifierGrup.findUnique({ where: { id: data.id } })
  if (!lama) throw new GalatDomain('Grup modifier tidak ditemukan')
  await prisma.modifierGrup.update({
    where: { id: data.id },
    data: { aktif: data.aktif },
  })
  return { id: data.id, aktif: data.aktif }
}

// ─── Modifier (opsi dalam grup) ───

export async function modifierData(grupId?: string) {
  const modifiers = await prisma.modifier.findMany({
    where: grupId ? { grupId } : {},
    orderBy: [{ aktif: 'desc' }, { nama: 'asc' }],
    include: {
      grup: { select: { id: true, nama: true } },
    },
  })
  return modifiers.map((m) => ({
    id: m.id,
    grupId: m.grupId,
    grupNama: m.grup.nama,
    nama: m.nama,
    hargaTambahan: m.hargaTambahan.toNumber(),
    aktif: m.aktif,
  }))
}

export async function createModifier(input: ModifierInput) {
  const data = ModifierInputSchema.parse(input)
  const grup = await prisma.modifierGrup.findUnique({
    where: { id: data.grupId },
  })
  if (!grup) throw new GalatDomain('Grup modifier tidak ditemukan')
  return prisma.modifier.create({
    data: {
      grupId: data.grupId,
      nama: data.nama,
      hargaTambahan: data.hargaTambahan,
      aktif: data.aktif,
    },
    select: { id: true },
  })
}

export async function updateModifier(input: UpdateModifierInput) {
  const data = UpdateModifierSchema.parse(input)
  const lama = await prisma.modifier.findUnique({ where: { id: data.id } })
  if (!lama) throw new GalatDomain('Modifier tidak ditemukan')
  await prisma.modifier.update({
    where: { id: data.id },
    data: {
      grupId: data.grupId,
      nama: data.nama,
      hargaTambahan: data.hargaTambahan,
      aktif: data.aktif,
    },
  })
  return { id: data.id }
}

export async function hapusModifier(input: { id: string }) {
  const data = ModifierIdSchema.parse(input)
  const lama = await prisma.modifier.findUnique({
    where: { id: data.id },
    include: { _count: { select: { itemTransaksi: true } } },
  })
  if (!lama) throw new GalatDomain('Modifier tidak ditemukan')
  if (lama._count.itemTransaksi > 0) {
    throw new GalatDomain(
      'Modifier sudah terpakai dalam transaksi — nonaktifkan alih-alih dihapus',
    )
  }
  await prisma.modifier.delete({ where: { id: data.id } })
  return { id: data.id }
}

export async function toggleModifier(input: { id: string; aktif: boolean }) {
  const data = ToggleModifierSchema.parse(input)
  const lama = await prisma.modifier.findUnique({ where: { id: data.id } })
  if (!lama) throw new GalatDomain('Modifier tidak ditemukan')
  await prisma.modifier.update({
    where: { id: data.id },
    data: { aktif: data.aktif },
  })
  return { id: data.id, aktif: data.aktif }
}
