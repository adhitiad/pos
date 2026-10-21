import type { PostingTransaksiInput } from '#/validations/transaksi'

export interface AntreanItem {
  id: string
  dibuat: string
  payload: PostingTransaksiInput
  galat: string | null
}

export interface PenyimpananAntrean {
  tambah: (item: AntreanItem) => Promise<void>
  daftar: () => Promise<AntreanItem[]>
  hapus: (id: string) => Promise<void>
  tandai: (id: string, galat: string | null) => Promise<void>
}
