// Kunci matriks akses (dipakai guard server function, REST, dan guard halaman).
// Nilai aktualnya di `src/server/peran.ts` (AKSES) — `satisfies` menjaga
// keduanya tetap sinkron.
export type KunciAkses = 'operasional' | 'manajerial' | 'kasir' | 'semua'
