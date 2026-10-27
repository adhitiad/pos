import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

type Tugas = {
  id: string
  selesai: boolean
  teks: string
  terblokir: boolean
  sebagian: boolean
}

const AKAR = process.cwd()
const cek = process.argv.includes('--check')

function hitungBerkas(
  direktori: string,
  cocok: (nama: string) => boolean,
): number {
  // Direktori opsional (mis. `.agents/rules` hanya ada di mesin pengembang dan
  // tidak di-commit) dihitung 0 agar docs:check tetap jalan di checkout bersih
  // seperti CI. Isi snapshot juga tidak boleh bergantung direktori tak ter-commit.
  if (!existsSync(direktori)) return 0
  let jumlah = 0
  for (const entri of readdirSync(direktori, { withFileTypes: true })) {
    const jalur = resolve(direktori, entri.name)
    if (entri.isDirectory()) {
      jumlah += hitungBerkas(jalur, cocok)
    } else if (cocok(entri.name)) {
      jumlah += 1
    }
  }
  return jumlah
}

function bacaTugas(): Tugas[] {
  const baris = readFileSync(
    resolve(AKAR, 'docs/DAFTAR-TUGAS.md'),
    'utf8',
  ).split(/\r?\n/)
  const hasil: Tugas[] = []
  let aktif: Tugas | undefined

  for (const isi of baris) {
    const cocok = isi.match(/^- \[([ x])\] (.*)$/)
    if (cocok) {
      const teks = cocok[2]
      const id =
        teks.match(/^\*\*([^*]+)\*\*/)?.[1] ??
        teks.replace(/`/g, '').slice(0, 60)
      aktif = {
        id,
        selesai: cocok[1] === 'x',
        teks,
        terblokir: false,
        sebagian: false,
      }
      hasil.push(aktif)
      continue
    }

    if (!aktif) continue
    if (/^\s{2,}\S/.test(isi)) {
      aktif.teks += `\n${isi}`
    } else if (isi.trim() === '') {
      aktif.teks += '\n'
    } else if (isi.startsWith('#')) {
      aktif = undefined
    }
  }

  for (const tugas of hasil) {
    tugas.terblokir = /Terblokir|blocked/i.test(tugas.teks)
    tugas.sebagian = /Sebagian selesai/i.test(tugas.teks)
  }

  return hasil
}

function daftarHalaman(): string[] {
  return readdirSync(resolve(AKAR, 'src/routes'), { withFileTypes: true })
    .filter(
      (entri) =>
        entri.isFile() &&
        entri.name.endsWith('.tsx') &&
        entri.name !== '__root.tsx',
    )
    .map((entri) => {
      const nama = entri.name.replace(/\.tsx$/, '')
      if (nama === 'index') return '/'
      return `/${nama.replace(/\./g, '/')}`
    })
    .sort()
}

function daftarModel(): number {
  const skema = readFileSync(resolve(AKAR, 'prisma/schema.prisma'), 'utf8')
  return skema.match(/^model\s+\w+/gm)?.length ?? 0
}

function jumlahMigrasi(): number {
  return readdirSync(resolve(AKAR, 'prisma/migrations'), {
    withFileTypes: true,
  }).filter((entri) => entri.isDirectory()).length
}

function label(tugas: Tugas): string {
  const status = tugas.terblokir
    ? ' · terblokir'
    : tugas.sebagian
      ? ' · sebagian'
      : ''
  return `\`${tugas.id}\`${status}`
}

const tugas = bacaTugas()
const total = tugas.length
const selesai = tugas.filter((item) => item.selesai).length
const terbuka = tugas.filter((item) => !item.selesai)
const persen = total === 0 ? 0 : Math.round((selesai / total) * 100)
const terblokir = terbuka.filter((item) => item.terblokir)
const sebagian = terbuka.filter((item) => item.sebagian)
const halaman = daftarHalaman()
const model = daftarModel()
const migrasi = jumlahMigrasi()
const unit = hitungBerkas(
  resolve(AKAR, 'tests/vitest'),
  (nama) => nama.endsWith('.test.ts') || nama.endsWith('.test.tsx'),
)
const e2e = hitungBerkas(resolve(AKAR, 'tests/e2e'), (nama) =>
  nama.endsWith('.spec.ts'),
)
const docs = hitungBerkas(resolve(AKAR, 'docs'), (nama) => nama.endsWith('.md'))
const endpoint = hitungBerkas(resolve(AKAR, 'src/routes/api/v1'), (nama) =>
  nama.endsWith('.ts'),
)

const snapshotManusia = [
  '<!-- AUTO:PRD:START -->',
  '',
  '> **Snapshot otomatis.** Dihasilkan oleh `bun run docs:sync`; jangan edit manual.',
  '',
  `- **Item selesai:** ${selesai}/${total} (${persen}%)`,
  `- **Item terbuka:** ${terbuka.length}`,
  `- **Terblokir / sebagian:** ${terblokir.length} / ${sebagian.length}`,
  `- **Cakupan:** ${halaman.length} rute · ${endpoint} file route REST · ${model} model · ${migrasi} migrasi`,
  `- **Test:** ${unit} file unit · ${e2e} file e2e`,
  '- **Dokumen**: ' + docs + ' berkas di `docs/`',
  '',
  ...(terblokir.length + sebagian.length === 0
    ? ['Tidak ada item terblokir atau sebagian.']
    : [
        '**Item yang perlu perhatian:**',
        '',
        ...[...terblokir, ...sebagian].map((item) => `- ${label(item)}`),
      ]),
  '',
  'Status terperinci dan kriteria tiap item: [`DAFTAR-TUGAS.md`](DAFTAR-TUGAS.md).',
  '<!-- AUTO:PRD:END -->',
].join('\n')

const snapshotAgen = [
  '<!-- AUTO:PRD-AI:START -->',
  '',
  '> **Snapshot otomatis.** Dihasilkan oleh `bun run docs:sync`; jangan edit manual.',
  '',
  `- **Item selesai:** ${selesai}/${total} (${persen}%)`,
  `- **Item terbuka:** ${terbuka.length}`,
  `- **Terblokir / sebagian:** ${terblokir.length} / ${sebagian.length}`,
  `- **Cakupan:** ${halaman.length} rute · ${endpoint} file route REST · ${model} model · ${migrasi} migrasi`,
  `- **Test:** ${unit} file unit · ${e2e} file e2e`,
  '- **Dokumen**: ' + docs + ' berkas di `docs/`',
  '',
  '### Rute halaman terdeteksi',
  '',
  ...halaman.map((rute) => `- \`${rute}\``),
  '',
  '### Tugas terbuka',
  '',
  ...(terbuka.length === 0
    ? ['Tidak ada tugas terbuka.']
    : terbuka.map((item) => `- ${label(item)}`)),
  '',
  '<!-- AUTO:PRD-AI:END -->',
].join('\n')

function gantiBlok(isi: string, nama: string, blok: string): string {
  const awal = `<!-- AUTO:${nama}:START -->`
  const akhir = `<!-- AUTO:${nama}:END -->`
  const posisiAwal = isi.indexOf(awal)
  const posisiAkhir = isi.indexOf(akhir)
  if (posisiAwal === -1 || posisiAkhir === -1 || posisiAkhir < posisiAwal) {
    throw new Error(`Marker AUTO:${nama} tidak ditemukan di dokumen.`)
  }
  return `${isi.slice(0, posisiAwal)}${blok}${isi.slice(posisiAkhir + akhir.length)}`
}

const target = [
  { jalur: 'docs/PRD.md', nama: 'PRD', blok: snapshotManusia },
  { jalur: 'docs/PRD-AI.md', nama: 'PRD-AI', blok: snapshotAgen },
]

let basi = false
for (const { jalur, nama, blok } of target) {
  const lengkap = resolve(AKAR, jalur)
  const lama = readFileSync(lengkap, 'utf8')
  const baru = gantiBlok(lama, nama, blok)
  if (baru !== lama) {
    basi = true
    if (!cek) writeFileSync(lengkap, baru)
  }
}

if (cek) {
  if (basi) {
    console.error(
      'Dokumen PRD basi. Jalankan `bun run docs:sync`, lalu periksa diff.',
    )
    process.exit(1)
  }
  console.log('docs:check — snapshot PRD sinkron.')
} else {
  console.log(
    basi
      ? 'docs:sync — snapshot PRD diperbarui.'
      : 'docs:sync — snapshot PRD sudah sinkron.',
  )
}
