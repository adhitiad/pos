import type { ReactFormExtendedApi } from '@tanstack/react-form'
import type {
  FormAsyncValidateOrFn,
  FormValidateOrFn,
} from '@tanstack/form-core'
import type {
  OnChangeFn,
  PaginationState,
  SortingState,
} from '@tanstack/react-table'
import type { produkData } from '#/server/produk'
import type { helper } from '#/components/produk/ProdukTabel'

export interface ResepBaris {
  bahanId: string
  jumlah: number
}

export interface ProdukFormNilai {
  nama: string
  sku: string
  barcode: string
  gambar: string
  harga: number
  stok: number
  kategoriId: string
  aktif: boolean
}

export type ProdukFormApi = ReactFormExtendedApi<
  ProdukFormNilai,
  undefined | FormValidateOrFn<ProdukFormNilai>,
  undefined | FormValidateOrFn<ProdukFormNilai>,
  undefined | FormAsyncValidateOrFn<ProdukFormNilai>,
  undefined | FormValidateOrFn<ProdukFormNilai>,
  undefined | FormAsyncValidateOrFn<ProdukFormNilai>,
  undefined | FormValidateOrFn<ProdukFormNilai>,
  undefined | FormAsyncValidateOrFn<ProdukFormNilai>,
  undefined | FormValidateOrFn<ProdukFormNilai>,
  undefined | FormAsyncValidateOrFn<ProdukFormNilai>,
  undefined | FormAsyncValidateOrFn<ProdukFormNilai>,
  unknown
>

export interface ProdukFormProps {
  panel: { id: string | null } | null
  form: ProdukFormApi
  fileFoto: File | null
  setFileFoto: (f: File | null) => void
  resep: ResepBaris[]
  pending: boolean
  data: Awaited<ReturnType<typeof produkData>>
  onBatal: () => void
  onTambahBahan: () => void
  onHapusBahan: (i: number) => void
  onUbahBahan: (i: number, field: { bahanId: string; jumlah: number }) => void
}

export interface ProdukHapusDialogProps {
  terbuka: boolean
  nama: string | undefined
  onBatal: () => void
  onYa: () => void
}

export interface ProdukKategoriProps {
  katNama: string
  setKatNama: (v: string) => void
  kategori: Array<{ id: string; nama: string; jumlahProduk: number }>
  onTambah: () => void
  onHapus: (id: string) => void
  onMuatUlang: () => void
  onError: (e: unknown) => void
}

export type ProdukRow = Awaited<ReturnType<typeof produkData>>['produk'][number]

export interface ProdukTabelProps {
  baris: ProdukRow[]
  columns: ReturnType<typeof helper.columns>
  total?: number
  pagination?: PaginationState
  onPaginationChange?: OnChangeFn<PaginationState>
  sorting?: SortingState
  onSortingChange?: OnChangeFn<SortingState>
}

/** Kartu produk untuk carousel halaman member. */
export type ProdukKartu = {
  produkId: string
  nama: string
  harga: number
  gambar: string | null
  terjual: number
}
