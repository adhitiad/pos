// Input persen dari form/API. String kosong bukan 0: pemanggil harus
// membedakan "tidak diisi" dari "sengaja 0" agar tarif tidak berubah diam-diam.
export function parsePersenPengaturan(nilai: string): number | null {
  const teks = nilai.trim()
  if (teks === '') return null
  const angka = Number(teks)
  if (!Number.isFinite(angka) || angka < 0 || angka > 100) return null
  return angka
}
