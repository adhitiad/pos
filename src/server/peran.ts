import type { Role } from '#/generated/prisma/enums.js'
import type { KunciAkses } from '#/types/peran'

// Satu sumber kebenaran matriks peran. Dipakai guard server function (auth.ts),
// REST (apiPengguna), dan guard halaman (beforeLoad). Jangan tulis daftar peran
// inline di route/*Fn/REST lagi — tambahkan/perbarui kunci di sini.
export const AKSES = {
  /** Operasional POS: pemilik & kasir (kasir, dapur, baca meja & pengaturan). */
  operasional: ['OWNER', 'KASIR'],
  /** Manajerial: pemilik saja (master data, laporan, tulis meja/pengaturan). */
  manajerial: ['OWNER'],
  /** Semua peran yang sudah login (analytics kunjungan). */
  semua: ['OWNER', 'KASIR', 'MEMBER'],
} as const satisfies Record<KunciAkses, readonly Role[]>

export function punyaAkses(role: Role, kunci: KunciAkses): boolean {
  return (AKSES[kunci] as readonly Role[]).includes(role)
}
