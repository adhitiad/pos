/**
 * Peran user dari daftar email di environment.
 *
 * OWNER_EMAILS → OWNER, KASIR_EMAILS → KASIR, selain itu null (biarkan peran
 * yang ada, tak pernah diturunkan otomatis). Fungsi murni agar bisa diuji
 * tanpa database.
 */
export function peranDariEmail(
  email: string,
  daftar: { owner?: string | undefined; kasir?: string | undefined },
): 'OWNER' | 'KASIR' | null {
  const target = email.trim().toLowerCase()
  if (!target) return null
  const pemilik = (daftar.owner ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  const kasir = (daftar.kasir ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  if (pemilik.includes(target)) return 'OWNER'
  if (kasir.includes(target)) return 'KASIR'
  return null
}
