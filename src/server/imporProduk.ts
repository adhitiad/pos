import { prisma } from '#/db'
import { nonHapus } from './nonHapus.js'
import { parseCsv, normalisasiKolom } from '#/lib/csv.js'
import { ImporProdukDryRunSchema } from '#/validations/impor.js'
import type { ImporBarisHasil, ImporDryRunHasil } from '#/validations/impor.js'

// Maksimal baris yang diverifikasi dalam satu dry-run (hindari beban DB besar).
const MAKS_BARIS_DRY_RUN = 500

// Kolom wajib dalam header CSV.
const KOLOM_WAJIB = ['nama', 'harga']

// Alias kolom yang diterima (dinyormalisasi lewat normalisasiKolom).
const ALIAS_KOLOM: Record<string, string> = {
  namaproduk: 'nama',
  namabarang: 'nama',
  kodesku: 'sku',
  kodebarang: 'sku',
  kodebarkode: 'barcode',
  barcode: 'barcode',
  hargajual: 'harga',
  harga: 'harga',
  stokawal: 'stok',
  stok: 'stok',
  idkategori: 'kategoriid',
  kategoriid: 'kategoriid',
  kategorid: 'kategoriid',
  aktif: 'aktif',
  gambar: 'gambar',
  urlgambar: 'gambar',
}

function ambilSel(
  baris: string[],
  indeks: Record<string, number | undefined>,
  kunci: string,
): string | undefined {
  const idx = indeks[kunci]
  if (idx === undefined || idx >= baris.length) return undefined
  const v = baris[idx]?.trim()
  return v === '' ? undefined : v
}

// Validasi satu baris CSV tanpa menulis ke DB. Mengembalikan hasil + daftar error.
function validasiBaris(
  nomorBaris: number,
  baris: string[],
  indeks: Record<string, number>,
  skuTerlihat: Set<string>,
  barcodeTerlihat: Set<string>,
): ImporBarisHasil {
  const errors: string[] = []
  const ambil = (kunci: string) => ambilSel(baris, indeks, kunci)

  const nama = ambil('nama')
  const sku = ambil('sku')
  const barcode = ambil('barcode')
  const hargaStr = ambil('harga')
  const stokStr = ambil('stok') ?? '0'
  const kategoriId = ambil('kategoriid')
  const aktifStr = ambil('aktif') ?? 'true'
  const gambar = ambil('gambar')

  if (!nama) errors.push('Nama wajib diisi')
  else if (nama.length > 100) errors.push('Nama maksimal 100 karakter')

  const harga = Number(hargaStr ?? '')
  if (!hargaStr) errors.push('Harga wajib diisi')
  else if (!Number.isFinite(harga) || harga < 0 || !Number.isInteger(harga)) {
    errors.push('Harga harus bilangan bulat >= 0')
  }

  const stok = Number(stokStr)
  if (!Number.isFinite(stok) || stok < 0 || !Number.isInteger(stok)) {
    errors.push('Stok harus bilangan bulat >= 0')
  }

  if (sku) {
    if (sku.length > 30) errors.push('SKU maksimal 30 karakter')
    const kunciSku = sku.toUpperCase()
    if (skuTerlihat.has(kunciSku)) {
      errors.push(`SKU '${sku}' duplikat dalam CSV`)
    } else {
      skuTerlihat.add(kunciSku)
    }
  }

  if (barcode) {
    if (barcode.length > 50) errors.push('Barcode maksimal 50 karakter')
    const kunciBarcode = barcode.toUpperCase()
    if (barcodeTerlihat.has(kunciBarcode)) {
      errors.push(`Barcode '${barcode}' duplikat dalam CSV`)
    } else {
      barcodeTerlihat.add(kunciBarcode)
    }
  }

  const aktif = aktifStr === 'true' || aktifStr === '1' || aktifStr === ''

  return {
    baris: nomorBaris,
    valid: errors.length === 0,
    data:
      errors.length === 0
        ? {
            nama: nama!,
            sku,
            barcode,
            gambar,
            harga,
            stok: Math.round(stok),
            kategoriId,
            aktif,
          }
        : undefined,
    errors,
  }
}

// Dry-run validasi impor produk dari CSV. TIDAK menulis ke DB.
// Mengembalikan ringkasan validasi per baris agar UI bisa tampilkan pratinjau
// sebelum impor benar-benar dijalankan.
export async function imporProdukDryRun(
  input: Parameters<typeof ImporProdukDryRunSchema.parse>[0],
): Promise<ImporDryRunHasil> {
  const data = ImporProdukDryRunSchema.parse(input)

  const barisMentah = parseCsv(data.csv)
  if (barisMentah.length < 2) {
    return {
      valid: 0,
      error: 1,
      total: 0,
      baris: [
        {
          baris: 1,
          valid: false,
          errors: ['CSV hanya berisi header atau kosong'],
        },
      ],
      ringkasan: 'CSV hanya berisi header atau kosong',
    }
  }

  // Header: normalisasi nama kolom.
  const headerMentah = barisMentah[0]
  const indeks: Record<string, number> = {}
  headerMentah.forEach((h, i) => {
    const norm = normalisasiKolom(h)
    if (!norm) return
    const kunci = ALIAS_KOLOM[norm] ?? norm
    if (!(kunci in indeks)) indeks[kunci] = i
  })

  for (const wajib of KOLOM_WAJIB) {
    if (!(wajib in indeks)) {
      return {
        valid: 0,
        error: 1,
        total: 0,
        baris: [
          {
            baris: 1,
            valid: false,
            errors: [`Kolom wajib '${wajib}' tidak ditemukan di header CSV`],
          },
        ],
        ringkasan: 'Header tidak lengkap',
      }
    }
  }

  // Cek unikness SKU/barcode yang sudah ada di DB (bukan ditimpa dalam dry-run).
  const [produkDb, barcodeDb] = await Promise.all([
    prisma.produk.findMany({
      where: nonHapus({ sku: { not: null } }),
      select: { sku: true },
    }),
    prisma.produk.findMany({
      where: nonHapus({ barcode: { not: null } }),
      select: { barcode: true },
    }),
  ])
  const skuDbSet = new Set<string>()
  const barcodeDbSet = new Set<string>()
  for (const p of produkDb) if (p.sku) skuDbSet.add(p.sku.toUpperCase())
  for (const p of barcodeDb)
    if (p.barcode) barcodeDbSet.add(p.barcode.toUpperCase())

  const hasil: ImporBarisHasil[] = []
  let valid = 0
  let errorCount = 0
  const skuCsv = new Set<string>()
  const barcodeCsv = new Set<string>()

  const batasBaris = Math.min(barisMentah.length - 1, MAKS_BARIS_DRY_RUN)

  for (let i = 1; i <= batasBaris; i++) {
    const baris = barisMentah[i]
    const nomorBaris = i + 1

    // Lewati baris yang seluruhnya kosong.
    if (baris.every((c) => c.trim() === '')) continue

    const r = validasiBaris(nomorBaris, baris, indeks, skuCsv, barcodeCsv)

    // Cek duplikat terhadap data DB yang sudah ada (hanya jika valid secara format).
    if (r.valid) {
      const sku = r.data?.sku
      const barcode = r.data?.barcode
      if (sku && skuDbSet.has(sku.toUpperCase())) {
        r.errors.push(`SKU '${sku}' sudah ada di database`)
        r.valid = false
        r.data = undefined
      }
      if (barcode && barcodeDbSet.has(barcode.toUpperCase())) {
        r.errors.push(`Barcode '${barcode}' sudah ada di database`)
        r.valid = false
        r.data = undefined
      }
    }

    if (r.valid) valid++
    else errorCount++
    hasil.push(r)
  }

  const total = valid + errorCount
  const melebihiBatas = barisMentah.length - 1 > batasBaris

  return {
    valid,
    error: errorCount,
    total,
    baris: hasil,
    ringkasan: `${
      melebihiBatas
        ? `Menampilkan ${batasBaris} dari ${barisMentah.length - 1} baris. `
        : ''
    }${valid} baris valid, ${errorCount} baris gagal validasi`,
  }
}
