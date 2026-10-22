import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const ANGGARAN = {
  totalGzipKB: 600,
  asetTerbesarGzipKB: 160,
  cssGzipKB: 50,
} as const

const direktori = resolve(process.cwd(), '.output/public/assets')
if (!existsSync(direktori)) {
  console.error(
    'Aset build tidak ditemukan. Jalankan `bun --bun run build` terlebih dahulu.',
  )
  process.exit(1)
}

type Baris = {
  nama: string
  jenis: 'js' | 'css'
  mentahKB: number
  gzipKB: number
}

const berkas = readdirSync(direktori, { withFileTypes: true })
  .filter(
    (entri) => entri.isFile() && ['.js', '.css'].includes(extname(entri.name)),
  )
  .map((entri): Baris => {
    const isi = readFileSync(resolve(direktori, entri.name))
    return {
      nama: entri.name,
      jenis: extname(entri.name) === '.css' ? 'css' : 'js',
      mentahKB: isi.byteLength / 1024,
      gzipKB: gzipSync(isi).byteLength / 1024,
    }
  })
  .sort((a, b) => b.gzipKB - a.gzipKB)

if (berkas.length === 0) {
  console.error('Tidak ada aset JS/CSS di .output/public/assets.')
  process.exit(1)
}

const totalGzipKB = berkas.reduce((total, item) => total + item.gzipKB, 0)
const totalMentahKB = berkas.reduce((total, item) => total + item.mentahKB, 0)
const terbesar = berkas[0]
const cssGzipKB = berkas
  .filter((item) => item.jenis === 'css')
  .reduce((total, item) => total + item.gzipKB, 0)

const format = (nilai: number) =>
  `${nilai.toLocaleString('id-ID', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} KB`

console.log(`Aset: ${berkas.length} file`)
console.log(`Total mentah: ${format(totalMentahKB)}`)
console.log(
  `Total gzip: ${format(totalGzipKB)} (anggaran ${ANGGARAN.totalGzipKB} KB)`,
)
console.log(
  `Terbesar: ${terbesar.nama} ${format(terbesar.gzipKB)} (anggaran ${ANGGARAN.asetTerbesarGzipKB} KB)`,
)
console.log(
  `CSS gzip: ${format(cssGzipKB)} (anggaran ${ANGGARAN.cssGzipKB} KB)`,
)

let gagal = false
if (totalGzipKB > ANGGARAN.totalGzipKB) {
  console.error('GAGAL: total JS+CSS gzip melebihi anggaran.')
  gagal = true
}
if (terbesar.gzipKB > ANGGARAN.asetTerbesarGzipKB) {
  console.error('GAGAL: aset terbesar melebihi anggaran.')
  gagal = true
}
if (cssGzipKB > ANGGARAN.cssGzipKB) {
  console.error('GAGAL: CSS gzip melebihi anggaran.')
  gagal = true
}

if (gagal) {
  console.error(
    'Periksa docs/PERFORMA.md; jangan menaikkan anggaran tanpa alasan dan persetujuan.',
  )
  process.exit(1)
}

console.log('Lolos: semua anggaran performa klien terpenuhi.')
