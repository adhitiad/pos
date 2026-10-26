import type { HasilKebijakan, KonteksReview } from '#/types/review'

export type { HasilKebijakan, KonteksReview } from '#/types/review'

// Satu sumber aturan siapa yang boleh memutus draft. Dipakai `reviewTransaksi`
// dan diuji unit tanpa database.
// - `mode: 'kasir'` (default): kasir boleh menyetujui draft miliknya sendiri;
//   owner tetap boleh memutus semua draft.
// - `mode: 'owner'`: hanya owner yang boleh memutus; kasir menunggu antrean.
export function bolehReviewTransaksi(k: KonteksReview): HasilKebijakan {
  if (k.peran === 'OWNER') return { boleh: true }
  if (k.peran !== 'KASIR') {
    return {
      boleh: false,
      kode: 'PERAN_TIDAK_VALID',
      alasan: 'Hanya kasir atau owner yang dapat meninjau',
    }
  }
  if (k.mode === 'owner') {
    return {
      boleh: false,
      kode: 'MENUNGGU_OWNER',
      alasan: 'Draft menunggu persetujuan owner',
    }
  }
  if (k.peninjauId !== k.pembuatDraftId) {
    return {
      boleh: false,
      kode: 'BUKAN_PEMILIK',
      alasan: 'Kasir hanya dapat meninjau draft sendiri',
    }
  }
  return { boleh: true }
}
