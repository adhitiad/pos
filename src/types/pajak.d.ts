// Jenis pajak yang dibebankan ke pelanggan (harga eksklusif).
//  - PB1 : Pajak Barang dan Jasa tertentu (PBJT) makanan/minuman — mode F&B.
//  - PPN : Pajak Pertambahan Nilai — mode retail.
export type JenisPajak = 'PB1' | 'PPN'

export interface TarifPajak {
  persen: number
  jenis: JenisPajak
}
