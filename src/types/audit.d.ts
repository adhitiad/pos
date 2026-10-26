/** Nilai JSON yang aman dikirim ke klien (hasil snapshot audit). */
export type JsonNilai =
  | string
  | number
  | boolean
  | null
  | JsonNilai[]
  | { [kunci: string]: JsonNilai }

export interface AuditLogRow {
  id: string
  aksi: string
  entitas: string
  entitasId: string | null
  aktorId: string | null
  aktorNama: string | null
  /** Snapshot sebelum perubahan (JSON) — null bila entitas baru/diubah penuh. */
  sebelum: JsonNilai
  /** Snapshot sesudah perubahan (JSON). */
  sesudah: JsonNilai
  waktu: string
}

export interface AuditLogHasil {
  rows: AuditLogRow[]
  total: number
}

/** Input pencatatan audit; dipakai `catatAudit` di server. */
export interface CatatAuditInput {
  /** Id user pelaku; null/kosong = aksi sistem (tanpa login). */
  aktorId?: string | null
  /** Kode aksi, mis. "produk.ubah", "user.role.ubah", "produk.hapus". */
  aksi: string
  /** Nama entitas yang diubah, mis. "Produk", "Pengaturan". */
  entitas: string
  /** Id entitas bila ada. */
  entitasId?: string | null
  /** Alasan tindakan (mis. alasan retur, catatan koreksi stok). */
  catatan?: string | null
  /** Cuplikan state sebelum perubahan (hanya field yang berubah). */
  sebelum?: Record<string, unknown> | null
  /** Cuplikan state sesudah perubahan (hanya field yang berubah). */
  sesudah?: Record<string, unknown> | null
}
