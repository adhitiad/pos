import { timingSafeEqual } from 'node:crypto'

// Cocokkan header `Authorization: Bearer <secret>` untuk route cron.
// Secret kosong berarti cron belum dikonfigurasi dan route harus menolak.
export function tokenCronSah(
  header: string | null,
  secret: string | undefined,
): boolean {
  if (!secret) return false
  const nilai = header?.startsWith('Bearer ') ? header.slice(7) : ''
  const kirim = Buffer.from(nilai)
  const harap = Buffer.from(secret)
  if (kirim.length !== harap.length) return false
  return timingSafeEqual(kirim, harap)
}
