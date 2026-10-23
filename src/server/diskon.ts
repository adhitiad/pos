import { GalatDomain } from './galat.js'
import { catatAudit } from './audit.js'
import type { DetailDiskonDitolak, DetailDiskonOwner } from '#/types/diskon'

// Kebijakan diskon manual (SEC-22). Batas ini hanya berlaku untuk KASIR;
// OWNER boleh memberi diskon lebih besar, tetapi tetap dicatat ke audit log.
// Nilai disimpan di Pengaturan agar bisa diubah pemilik tanpa deploy ulang.
export const KUNCI_DISKON_KASIR = 'diskon_kasir_maks_persen'
export const BATAS_DISKON_KASIR_DEFAULT = 10

// Normalisasi persen batas diskon ke 0..100. Nilai kosong/rusak memakai
// default 10% agar kesalahan data tidak diam-diam membuka diskon 100%.
export function normalisasiBatasDiskon(nilai: unknown): number {
  if (nilai === undefined || nilai === null || String(nilai).trim() === '') {
    return BATAS_DISKON_KASIR_DEFAULT
  }
  const n = Number(nilai)
  if (!Number.isFinite(n)) return BATAS_DISKON_KASIR_DEFAULT
  return Math.min(Math.max(0, n), 100)
}

// Batas nominal diskon manual untuk KASIR: persen × subtotal, dibulatkan ke
// bawah supaya tidak pernah melebihi persentase yang disetujui.
export function batasDiskonKasir(subtotal: number, persen: number): number {
  const dasar = Math.max(0, Math.floor(subtotal))
  const tarif = Math.min(Math.max(0, persen), 100)
  return Math.floor((dasar * tarif) / 100)
}

const rupiah = (nilai: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(nilai)

// Galat khusus agar lapisan posting bisa mencatat percobaan pelanggaran
// kebijakan ke audit log DI LUAR database transaction yang akan di-rollback.
export class GalatDiskonDitolak extends GalatDomain {
  readonly detail: DetailDiskonDitolak

  constructor(detail: DetailDiskonDitolak) {
    super(
      `Diskon melebihi batas kasir (maks ${detail.persenBatas}% = Rp${rupiah(detail.batasDiskon)}). Minta owner memposting transaksi ini.`,
    )
    this.name = 'GalatDiskonDitolak'
    this.detail = detail
  }
}

// Periksa diskon manual KASIR. Diskon member & poin tidak masuk check ini
// karena keduanya dihitung server dari master/poin yang sudah dimiliki member.
export function periksaDiskonKasir(input: {
  peran?: string
  aktorId?: string
  subtotal: number
  diskon: number
  persenBatas: number
}): void {
  if (input.peran !== 'KASIR') return
  const batas = batasDiskonKasir(input.subtotal, input.persenBatas)
  if (input.diskon <= batas) return
  throw new GalatDiskonDitolak({
    aktorId: input.aktorId ?? null,
    peran: input.peran,
    subtotal: input.subtotal,
    diskonDiminta: input.diskon,
    batasDiskon: batas,
    persenBatas: input.persenBatas,
  })
}

// Data audit untuk diskon OWNER yang melewati ambang kasir. Dipanggil setelah
// transaksi sukses, bukan di dalam transaction, agar kegagalan audit tidak
// membatalkan penjualan yang sudah sah.
export function detailDiskonOwner(input: {
  aktorId?: string
  transaksiId: string
  nomor: string
  subtotal: number
  diskon: number
  persenBatas: number
}): DetailDiskonOwner {
  return {
    aktorId: input.aktorId ?? null,
    transaksiId: input.transaksiId,
    nomor: input.nomor,
    subtotal: input.subtotal,
    diskon: input.diskon,
    batasDiskon: batasDiskonKasir(input.subtotal, input.persenBatas),
    persenBatas: input.persenBatas,
  }
}

// Catat percobaan KASIR yang ditolak. Dipanggil setelah transaction rollback.
export async function catatPenolakanDiskon(
  galat: GalatDiskonDitolak,
): Promise<void> {
  await catatAudit({
    aktorId: galat.detail.aktorId,
    aksi: 'transaksi.diskon.ditolak',
    entitas: 'Transaksi',
    sesudah: { ...galat.detail },
  })
}

// Catat diskon OWNER yang melewati ambang kasir; no-op bila tidak melewati.
export async function catatDiskonOwner(input: {
  aktorId?: string
  peran?: string
  transaksiId: string
  nomor: string
  subtotal: number
  diskon: number
  persenBatas: number
}): Promise<void> {
  if (input.peran !== 'OWNER' || input.diskon <= 0) return
  const detail = detailDiskonOwner(input)
  if (input.diskon <= detail.batasDiskon) return
  await catatAudit({
    aktorId: detail.aktorId,
    aksi: 'transaksi.diskon.owner',
    entitas: 'Transaksi',
    entitasId: detail.transaksiId,
    sesudah: { ...detail },
  })
}
