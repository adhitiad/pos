/** Nilai yang boleh dipakai pengurut tabel. */
export type NilaiUrut = string | number | Date | null | undefined

/** Pemetaan kolom ke fungsi pengurut untuk `useKontrolTabel`. */
export type PengurutTabel<T> = Partial<Record<string, (baris: T) => NilaiUrut>>
