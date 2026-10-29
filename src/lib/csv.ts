// Parser CSV ringan tanpa dependensi eksternal.
// Menangani kolom yang dikutip (dengan double-quote), koma di dalam kutip,
// dan baris kosong. Mengembalikan array baris (setiap baris = array sel).
export function parseCsv(teks: string): string[][] {
  const baris: string[][] = []
  let sel = ''
  let barisSekarang: string[] = []
  let dalamKutip = false
  const n = teks.length

  for (let i = 0; i < n; i++) {
    const c = teks[i]
    if (dalamKutip) {
      if (c === '"') {
        // Escaped quote: "" → satu karakter "
        if (i + 1 < n && teks[i + 1] === '"') {
          sel += '"'
          i++
        } else {
          dalamKutip = false
        }
      } else {
        sel += c
      }
    } else if (c === '"') {
      dalamKutip = true
    } else if (c === ',') {
      barisSekarang.push(sel)
      sel = ''
    } else if (c === '\r') {
      // abaikan \r (handle \r\n dan \n)
    } else if (c === '\n') {
      barisSekarang.push(sel)
      baris.push(barisSekarang)
      barisSekarang = []
      sel = ''
    } else {
      sel += c
    }
  }

  // Sisa sel terakhir / baris terakhir tanpa newline
  if (sel !== '' || barisSekarang.length > 0) {
    barisSekarang.push(sel)
    baris.push(barisSekarang)
  }

  return baris
}

// Normalisasi nama kolom header: lowercase, hapus spasi/underscore/strip,
// mis. "Kategori ID", "kategori_id", "kategoriId" → "kategoriid".
export function normalisasiKolom(nama: string): string {
  return nama
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, '')
}
