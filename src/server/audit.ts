import { prisma } from '#/db'
import { logger } from '#/lib/logger'
import type { Prisma } from '#/generated/prisma/client.js'

export interface CatatAuditInput {
  /** Id user pelaku; null/kosong = aksi sistem (tanpa login). */
  aktorId?: string | null
  /** Kode aksi, mis. "produk.ubah", "user.role.ubah", "produk.hapus". */
  aksi: string
  /** Nama entitas yang diubah, mis. "Produk", "Pengaturan". */
  entitas: string
  /** Id entitas bila ada. */
  entitasId?: string | null
  /** Cuplikan state sebelum perubahan (hanya field yang berubah). */
  sebelum?: Record<string, unknown> | null
  /** Cuplikan state sesudah perubahan (hanya field yang berubah). */
  sesudah?: Record<string, unknown> | null
}

// Ubah nilai non-JSON (Decimal Prisma, Date, bigint) menjadi bentuk JSON
// sederhana supaya aman disimpan pada kolom `before`/`after`.
export function normalisasiJson(nilai: unknown): unknown {
  if (nilai === null || nilai === undefined) return null
  if (nilai instanceof Date) return nilai.toISOString()
  if (typeof nilai === 'bigint') return nilai.toString()
  if (typeof nilai === 'number' || typeof nilai === 'string') return nilai
  if (typeof nilai === 'boolean') return nilai
  if (Array.isArray(nilai)) return nilai.map(normalisasiJson)
  if (typeof nilai === 'object') {
    const kandidat = nilai as { toNumber?: unknown }
    if (typeof kandidat.toNumber === 'function') {
      return (kandidat.toNumber as () => number)()
    }
    const keluar: Record<string, unknown> = {}
    for (const [kunci, isi] of Object.entries(
      nilai as Record<string, unknown>,
    )) {
      keluar[kunci] = normalisasiJson(isi)
    }
    return keluar
  }
  return String(nilai)
}

// Ambil hanya field yang berubah antara dua snapshot. Dipakai agar log audit
// ringkas: cukup simpan yang berubah, bukan seluruh entitas.
export function selisihField(
  sebelum: Record<string, unknown>,
  sesudah: Record<string, unknown>,
): { sebelum: Record<string, unknown>; sesudah: Record<string, unknown> } {
  const kunciSemua = new Set([...Object.keys(sebelum), ...Object.keys(sesudah)])
  const sebelumDipilih: Record<string, unknown> = {}
  const sesudahDipilih: Record<string, unknown> = {}
  for (const kunci of kunciSemua) {
    const a = normalisasiJson(sebelum[kunci])
    const b = normalisasiJson(sesudah[kunci])
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      sebelumDipilih[kunci] = a
      sesudahDipilih[kunci] = b
    }
  }
  return { sebelum: sebelumDipilih, sesudah: sesudahDipilih }
}

// Tulis satu baris audit. Best-effort: kegagalan menulis log TIDAK boleh
// menggagalkan mutasi bisnis yang sudah berhasil (data sudah berubah), jadi
// error dicatat ke log server saja.
export async function catatAudit(input: CatatAuditInput): Promise<void> {
  try {
    const sebelum =
      input.sebelum === undefined || input.sebelum === null
        ? undefined
        : (normalisasiJson(input.sebelum) as Prisma.InputJsonValue)
    const sesudah =
      input.sesudah === undefined || input.sesudah === null
        ? undefined
        : (normalisasiJson(input.sesudah) as Prisma.InputJsonValue)
    await prisma.auditLog.create({
      data: {
        userId: input.aktorId ?? null,
        action: input.aksi,
        entity: input.entitas,
        entityId: input.entitasId ?? null,
        before: sebelum,
        after: sesudah,
      },
    })
  } catch (e) {
    logger.error(
      {
        kind: 'audit',
        event: 'audit.write.gagal',
        aksi: input.aksi,
        entitas: input.entitas,
        entitasId: input.entitasId ?? null,
        detail: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
      },
      'gagal menulis audit log',
    )
  }
}
