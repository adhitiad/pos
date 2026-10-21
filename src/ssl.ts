/**
 * Normalisasi parameter `sslmode` pada URL PostgreSQL.
 *
 * Driver `pg` (via pg-connection-string) memberi peringatan: mode
 * 'prefer'/'require'/'verify-ca' diperlakukan sebagai alias 'verify-full',
 * dan pada major berikutnya akan punya semantik lebih lemah. Mode 'verify-full'
 * (verifikasi sertifikat + hostname) didukung PostgreSQL modern & Neon, jadi
 * dipakai sebagai default agar tidak ada warning di log.
 *
 * Mode 'disable' (PostgreSQL lokal tanpa TLS) dibiarkan apa adanya.
 */
export function normalisasiSslMode(url: string): string {
  return url.replace(
    /sslmode=(require|prefer|verify-ca)/g,
    'sslmode=verify-full',
  )
}
