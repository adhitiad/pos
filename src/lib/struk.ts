import type { StrukPayload } from '#/types/percetakan'

const angka = (nilai: unknown): number => {
  if (typeof nilai === 'number') return Number.isFinite(nilai) ? nilai : 0
  if (typeof nilai === 'string' && nilai.trim() !== '') {
    const hasil = Number(nilai)
    return Number.isFinite(hasil) ? hasil : 0
  }
  return 0
}

const teks = (nilai: unknown): string =>
  typeof nilai === 'string' ? nilai : ''

const teksAtauNull = (nilai: unknown): string | null =>
  typeof nilai === 'string' ? nilai : null

const angkaAtauNull = (nilai: unknown): number | null =>
  typeof nilai === 'number' && Number.isFinite(nilai) ? nilai : null

const tanggalValid = (nilai: unknown): string => {
  if (typeof nilai !== 'string') return ''
  return Number.isNaN(Date.parse(nilai)) ? '' : nilai
}

const daftar = (nilai: unknown): unknown[] =>
  Array.isArray(nilai) ? nilai : []

const objek = (nilai: unknown): Record<string, unknown> =>
  nilai !== null && typeof nilai === 'object' && !Array.isArray(nilai)
    ? (nilai as Record<string, unknown>)
    : {}

export function normalisasiStrukPayload(nilai: unknown): StrukPayload | null {
  const data = objek(nilai)
  const nomor = teks(data.nomor)
  if (!nomor) return null

  const items = daftar(data.items)
    .map((item) => objek(item))
    .filter((item) => teks(item.nama) !== '')
    .map((item) => ({
      nama: teks(item.nama),
      qty: angka(item.qty),
      harga: angka(item.harga),
      subtotal: angka(item.subtotal),
      modifier: daftar(item.modifier)
        .map((mod) => objek(mod))
        .filter((mod) => teks(mod.nama) !== '')
        .map((mod) => ({
          nama: teks(mod.nama),
          qty: angka(mod.qty),
          tambahan: angka(mod.tambahan),
          catatan: teksAtauNull(mod.catatan),
        })),
    }))

  return {
    nomor,
    tanggal: tanggalValid(data.tanggal),
    items,
    subtotal: angka(data.subtotal),
    diskon: angka(data.diskon),
    pajak: angka(data.pajak),
    pajakJenis: teksAtauNull(data.pajakJenis),
    ongkir: angka(data.ongkir),
    total: angka(data.total),
    metodeBayar: teks(data.metodeBayar),
    pembayaran: daftar(data.pembayaran)
      .map((bayar) => objek(bayar))
      .filter((bayar) => teks(bayar.metode) !== '')
      .map((bayar) => ({
        metode: teks(bayar.metode),
        jumlah: angka(bayar.jumlah),
      })),
    uangDiterima: angkaAtauNull(data.uangDiterima),
    kembalian: angkaAtauNull(data.kembalian),
    memberNama: teksAtauNull(data.memberNama),
    catatan: teksAtauNull(data.catatan),
  }
}
