import type { Prisma } from '#/generated/prisma/client.js'
import { tierDariTotal } from '#/server/member'
import { GalatDomain } from './galat.js'
import {
  hitungDiskonMember,
  hitungRedeem,
  POIN_NILAI_RUPIAH,
  RUPIAH_PER_POIN,
} from './poin.js'

interface MemberSiap {
  id: string
  nama: string
  poin: number
  diskonPersen: Prisma.Decimal | null
  totalBelanja: Prisma.Decimal
  tier: string
}

export interface HasilMember {
  member: MemberSiap | null
  /** Poin yang ditukar (dikurangi dari saldo member). */
  poinTerpakai: number
  /** Diskon otomatis dari tier member (rupiah). */
  diskonMember: number
}

// Muat data member + hitung poin yang ditukar & diskon member. Dipisah dari
// orkestrasi posting agar file posting tetap ringkas.
export async function siapkanMember(
  tx: Prisma.TransactionClient,
  input: {
    memberId?: string
    tukarPoin: number
    subtotal: number
    diskon: number
  },
): Promise<HasilMember> {
  let member: MemberSiap | null = null
  if (input.memberId) {
    const found = await tx.member.findUnique({
      where: { id: input.memberId },
      select: {
        id: true,
        nama: true,
        poin: true,
        diskonPersen: true,
        totalBelanja: true,
        tier: true,
      },
    })
    if (!found) throw new GalatDomain('Member tidak ditemukan')
    member = found
  }
  if (input.tukarPoin > 0 && !member) {
    throw new GalatDomain('Tukar poin butuh member')
  }

  let poinTerpakai = 0
  if (member && input.tukarPoin > 0) {
    if (member.poin < input.tukarPoin) {
      throw new GalatDomain(
        `Poin member kurang (saldo ${member.poin}, butuh ${input.tukarPoin})`,
      )
    }
    // Redeem dibulatkan ke bawah kelipatan Rp100 agar poin terpakai pas
    // dengan diskon yang diberikan.
    poinTerpakai = hitungRedeem(
      input.subtotal,
      input.diskon,
      input.tukarPoin,
    ).poinTerpakai
  }

  const diskonMember =
    member && member.diskonPersen != null
      ? hitungDiskonMember(
          input.subtotal,
          input.diskon,
          member.diskonPersen.toNumber(),
        )
      : 0

  return { member, poinTerpakai, diskonMember }
}

// Terapkan poin ke member: tukar (kurang) + dapat (tambah), lalu tier
// dihitung ulang. Semua atomik supaya redeem paralel tak bisa double-spend
// (OW-19) dan update paralel tak saling menimpa (OW-21).
export async function terapkanPoinMember(
  tx: Prisma.TransactionClient,
  hasil: HasilMember,
  total: number,
): Promise<{ nama: string; totalBelanja: number; tier: string } | null> {
  const member = hasil.member
  if (!member) return null

  if (hasil.poinTerpakai > 0) {
    const terpakai = await tx.$executeRaw`
      UPDATE "Member"
      SET "poin" = "poin" - ${hasil.poinTerpakai}
      WHERE "id" = ${member.id} AND "poin" >= ${hasil.poinTerpakai}
    `
    if (terpakai !== 1) {
      throw new GalatDomain('Poin member tidak mencukupi')
    }
  }

  const poinDapat = Math.floor(total / RUPIAH_PER_POIN)
  await tx.member.update({
    where: { id: member.id },
    data: {
      ...(poinDapat > 0 ? { poin: { increment: poinDapat } } : {}),
      totalBelanja: { increment: total },
    },
  })
  const segar = await tx.member.findUniqueOrThrow({
    where: { id: member.id },
    select: { totalBelanja: true },
  })
  const totalBelanjaBaru = segar.totalBelanja.toNumber()
  const tier = tierDariTotal(totalBelanjaBaru)
  await tx.member.update({
    where: { id: member.id },
    data: { tier },
  })

  return { nama: member.nama, totalBelanja: totalBelanjaBaru, tier }
}

// Nilai diskon dari poin yang ditukar (rupiah).
export function nilaiDiskonPoin(poinTerpakai: number): number {
  return poinTerpakai * POIN_NILAI_RUPIAH
}
