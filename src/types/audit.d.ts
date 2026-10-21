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
