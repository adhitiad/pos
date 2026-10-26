import { toString as qrToString } from 'qrcode'

import { prisma } from '#/db'
import { Prisma } from '#/generated/prisma/client.js'
import { GalatDomain } from './galat.js'
import { buatTokenMeja, urlPesananMeja } from './mejaToken.js'
import {
  HapusMejaSchema,
  MejaInputSchema,
  QrMejaSchema,
  ToggleMejaSchema,
  UpdateMejaSchema,
} from '#/validations/meja'
import type { MejaInput, UpdateMejaInput } from '#/validations/meja'

export async function mejaData(opts?: { take?: number; skip?: number }) {
  const meja = await prisma.meja.findMany({
    orderBy: [{ aktif: 'desc' }, { nomor: 'asc' }],
    take: opts?.take,
    skip: opts?.skip,
    include: {
      _count: { select: { transaksi: true } },
      transaksi: {
        where: {
          statusPesanan: {
            notIn: ['SELESAI', 'DIBATALKAN'],
          },
        },
        select: { id: true, nomor: true, statusPesanan: true, total: true },
        orderBy: { tanggal: 'desc' },
        take: 1,
      },
    },
  })
  return meja.map((m) => ({
    id: m.id,
    nomor: m.nomor,
    nama: m.nama,
    aktif: m.aktif,
    jumlahTransaksi: m._count.transaksi,
    aktifDiAntrean: m.transaksi[0]
      ? {
          id: m.transaksi[0].id,
          nomor: m.transaksi[0].nomor,
          statusPesanan: m.transaksi[0].statusPesanan,
          total: m.transaksi[0].total.toNumber(),
        }
      : null,
  }))
}

export async function createMeja(input: MejaInput) {
  const data = MejaInputSchema.parse(input)
  try {
    return await prisma.meja.create({
      data: {
        nomor: data.nomor,
        nama: data.nama || undefined,
        aktif: data.aktif,
      },
      select: { id: true },
    })
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new GalatDomain(`Nomor meja ${data.nomor} sudah terpakai`)
    }
    throw e
  }
}

export async function updateMeja(input: UpdateMejaInput) {
  const data = UpdateMejaSchema.parse(input)
  const lama = await prisma.meja.findUnique({ where: { id: data.id } })
  if (!lama) throw new GalatDomain('Meja tidak ditemukan')
  try {
    await prisma.meja.update({
      where: { id: data.id },
      data: {
        nomor: data.nomor,
        nama: data.nama || undefined,
        aktif: data.aktif,
      },
    })
    return { id: data.id }
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new GalatDomain(`Nomor meja ${data.nomor} sudah terpakai`)
    }
    throw e
  }
}

export async function hapusMeja(input: { id: string }) {
  const data = HapusMejaSchema.parse(input)
  const lama = await prisma.meja.findUnique({
    where: { id: data.id },
    include: {
      _count: {
        select: {
          transaksi: {
            where: {
              statusPesanan: {
                notIn: ['SELESAI', 'DIBATALKAN'],
              },
            },
          },
        },
      },
    },
  })
  if (!lama) throw new GalatDomain('Meja tidak ditemukan')
  if (lama._count.transaksi > 0) {
    throw new GalatDomain(
      'Meja masih ada pesanan aktif — selesaikan atau batalkan dulu sebelum dihapus',
    )
  }
  await prisma.meja.delete({ where: { id: data.id } })
  return { id: data.id }
}

export async function toggleMeja(input: { id: string; aktif: boolean }) {
  const data = ToggleMejaSchema.parse(input)
  const lama = await prisma.meja.findUnique({ where: { id: data.id } })
  if (!lama) throw new GalatDomain('Meja tidak ditemukan')
  await prisma.meja.update({
    where: { id: data.id },
    data: { aktif: data.aktif },
  })
  return { id: data.id, aktif: data.aktif }
}

// QR meja dibuat saat owner meminta (bukan disimpan di DB): token stateless
// bertanda tangan, URL publik, dan gambar SVG siap tempel/cetak.
export async function qrMeja(input: { id: string }) {
  const data = QrMejaSchema.parse(input)
  const meja = await prisma.meja.findUnique({
    where: { id: data.id },
    select: { id: true, nomor: true, nama: true, aktif: true },
  })
  if (!meja) throw new GalatDomain('Meja tidak ditemukan')
  if (!meja.aktif) throw new GalatDomain('Meja tidak aktif')

  const { token, berlakuSampai } = buatTokenMeja(meja.id)
  const url = urlPesananMeja(token)
  const svg = await qrToString(url, {
    type: 'svg',
    margin: 1,
    width: 256,
    errorCorrectionLevel: 'M',
  })

  return {
    mejaId: meja.id,
    nomor: meja.nomor,
    nama: meja.nama,
    token,
    url,
    berlakuSampai,
    qrDataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
  }
}
