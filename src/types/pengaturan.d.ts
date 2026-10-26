import type { pengaturanData } from '#/server/pengaturan'

// Bentuk data loader pengaturan; diturunkan langsung dari fungsi server agar
// penambahan kunci baru tidak perlu menyunting dua tempat.
export type PengaturanAwal = Awaited<ReturnType<typeof pengaturanData>>

export interface IdentitasApp {
  judul: string
  ikonUrl: string
  logoUrl: string
  deskripsi: string
}
