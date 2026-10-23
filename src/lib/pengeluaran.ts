import { m } from '#/paraglide/messages'
import type { JenisPengeluaranKey } from '#/validations/pengeluaran'

// Daftar jenis pengeluaran untuk form: kunci (dipakai validasi) + kode akun
// CoA tujuan debit. Sumber akun/enum tetap di `src/server/pengeluaranJenis.ts`.
export const JENIS_LIST: { key: JenisPengeluaranKey; kode: string }[] = [
  { key: 'belanja', kode: '5200' },
  { key: 'operasional_kasir', kode: '5300' },
  { key: 'operasional_toko', kode: '5400' },
  { key: 'ambil_owner', kode: '3100' },
  { key: 'pembayaran_utang', kode: '2200' },
  { key: 'lainnya', kode: '5900' },
]

const LABEL_JENIS: Record<string, (() => string) | undefined> = {
  belanja: m.ledger_jenis_belanja,
  operasional_kasir: m.ledger_jenis_operasional_kasir,
  operasional_toko: m.ledger_jenis_operasional_toko,
  ambil_owner: m.ledger_jenis_ambil_owner,
  pembayaran_utang: m.ledger_jenis_pembayaran_utang,
}

const labelLainnya = m.ledger_jenis_lainnya

// Label jenis siap pakai di UI (terjemahan, bukan teks polos DB).
export const labelJenis = (key: string): string =>
  (LABEL_JENIS[key] ?? labelLainnya)()

export const rupiah = (n: number): string =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)
